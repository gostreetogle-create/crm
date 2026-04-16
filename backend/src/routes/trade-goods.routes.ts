import { promises as fs } from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { z } from "zod";
import { config } from "../config.js";
import {
  clearTradeGoodPhotoFilesAsync,
  extFromImageMime,
  listTradeGoodPhotoPublicUrls,
  listTradeGoodPhotoVariantPublicUrls,
  moveTradeGoodPhotoFilesAsync,
  resolveTradeGoodPhotoDisplayUrl,
  resolveTradeGoodPhotoDisplayUrlVariant,
  stemFromTradeGoodArticleCode,
} from "../lib/trade-good-photo-resolve.js";
import { prisma } from "../lib/prisma.js";
import {
  assertTradeGoodCategoryPair,
  resolveTradeGoodCategoryIdsFromNames,
} from "../lib/trade-good-classification-resolve.js";
import { numOrNull, strOrNull, sumPriceAndCostFromTradeGoodLines } from "../lib/trade-good-pricing.js";

export const tradeGoodsRouter = Router();

function paramId(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw[0]) return raw[0];
  return undefined;
}

const tradeGoodsPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 15 },
});

function tradeGoodPhotoUrlJson(code: string | null, photoPrimaryIndex: number): string {
  return resolveTradeGoodPhotoDisplayUrl(config.tradeGoodsPhotosDir, code, photoPrimaryIndex) ?? "";
}

const nullableString = z.union([z.string(), z.null(), z.undefined()]).optional();
const nullableNumber = z.union([z.number(), z.null(), z.undefined()]).optional();
const nullableUuid = z.union([z.string().uuid(), z.null(), z.undefined()]).optional();

const LineInputSchema = z.object({
  id: nullableString,
  sortOrder: z.number().int().optional(),
  productId: z.preprocess(
    (v) => (v === "" ? null : v),
    z.union([z.string().uuid(), z.null(), z.undefined()]).optional(),
  ),
  tradeGoodId: z.preprocess(
    (v) => (v === "" ? null : v),
    z.union([z.string().uuid(), z.null(), z.undefined()]).optional(),
  ),
  qty: z.number().positive().optional(),
}).superRefine((line, ctx) => {
  const refs = [line.productId ? 1 : 0, line.tradeGoodId ? 1 : 0].reduce((a, b) => a + b, 0);
  if (refs === 0) return;
  if (refs !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "line must have exactly one reference: productId or tradeGoodId",
      path: ["productId"],
    });
  }
});

const InputSchema = z.object({
  code: nullableString,
  name: z.string().trim().min(1),
  description: nullableString,
  /** Предпочтительно: id из справочников. */
  categoryId: nullableUuid,
  subcategoryId: nullableUuid,
  /** Legacy / импорт: строки создают или подбирают записи справочника. */
  category: nullableString,
  subcategory: nullableString,
  unitCode: nullableString,
  priceRub: nullableNumber,
  costRub: nullableNumber,
  notes: nullableString,
  isActive: z.boolean(),
  kind: z.enum(["ITEM", "COMPLEX"]).optional(),
  /** Главное фото для карточек и КП: номер слота `артикул_N` (1-based). */
  photoPrimaryIndex: z.number().int().min(1).max(30).optional(),
  lines: z.array(LineInputSchema).optional().default([]),
});

type TradeGoodLineInputNorm = {
  sortOrder: number;
  qty: number;
  productId: string | null;
  tradeGoodId: string | null;
};

function normalizeTradeGoodInputLines(lines: z.infer<typeof LineInputSchema>[]): TradeGoodLineInputNorm[] {
  return lines
    .map((l, idx) => ({
      productId: l.productId && String(l.productId).trim() ? String(l.productId).trim() : null,
      tradeGoodId: l.tradeGoodId && String(l.tradeGoodId).trim() ? String(l.tradeGoodId).trim() : null,
      sortOrder: l.sortOrder ?? idx,
      qty: l.qty ?? 1,
    }))
    .filter((l) => l.productId || l.tradeGoodId)
    .map((l, idx) => ({ ...l, sortOrder: idx }));
}

const listLineInclude = {
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      priceRub: true,
      costRub: true,
    },
  },
  componentTradeGood: {
    select: {
      id: true,
      code: true,
      name: true,
      priceRub: true,
      costRub: true,
      kind: true,
    },
  },
} as const;

const lineInclude = listLineInclude;

const classificationInclude = {
  category: true,
  subcategory: true,
} as const;

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s.trim(),
  );
}

const CLASSIFICATION_ERR = "__tg_class__:";

function throwClassification(reason: string): never {
  throw new Error(`${CLASSIFICATION_ERR}${reason}`);
}

async function resolveClassificationForInput(
  tx: Parameters<typeof resolveTradeGoodCategoryIdsFromNames>[0],
  p: z.infer<typeof InputSchema>,
): Promise<{ categoryId: string | null; subcategoryId: string | null }> {
  const catRaw = p.categoryId;
  const subRaw = p.subcategoryId;
  if (typeof catRaw === "string" && catRaw.trim() && !isUuid(catRaw)) {
    throwClassification("invalid_category_id");
  }
  if (typeof subRaw === "string" && subRaw.trim() && !isUuid(subRaw)) {
    throwClassification("invalid_subcategory_id");
  }
  if (isUuid(catRaw)) {
    try {
      return await assertTradeGoodCategoryPair(
        tx,
        catRaw.trim(),
        isUuid(subRaw) ? subRaw.trim() : null,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg === "subcategory_without_category" ||
        msg === "category_not_found" ||
        msg === "subcategory_not_found" ||
        msg === "subcategory_category_mismatch"
      ) {
        throwClassification(msg);
      }
      throw err;
    }
  }
  if (isUuid(subRaw) && !isUuid(catRaw)) {
    throwClassification("subcategory_id_without_category_id");
  }
  try {
    return await resolveTradeGoodCategoryIdsFromNames(tx, p.category, p.subcategory);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (
      msg === "subcategory_without_category" ||
      msg === "category_not_found" ||
      msg === "subcategory_not_found" ||
      msg === "subcategory_category_mismatch"
    ) {
      throwClassification(msg);
    }
    throw err;
  }
}

type TradeGoodRowWithLines = any;

function mapTradeGood(row: TradeGoodRowWithLines) {
  const primaryIdx = row.photoPrimaryIndex >= 1 ? row.photoPrimaryIndex : 1;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    categoryId: row.categoryId,
    subcategoryId: row.subcategoryId,
    category: row.category?.name ?? null,
    subcategory: row.subcategory?.name ?? null,
    unitCode: row.unitCode,
    priceRub: row.priceRub,
    costRub: row.costRub,
    notes: row.notes,
    isActive: row.isActive,
    kind: row.kind,
    photoPrimaryIndex: primaryIdx,
    photoUrls: listTradeGoodPhotoPublicUrls(config.tradeGoodsPhotosDir, row.code),
    photoUrl:
      resolveTradeGoodPhotoDisplayUrlVariant(config.tradeGoodsPhotosDir, row.code, primaryIdx, "medium_640") ??
      tradeGoodPhotoUrlJson(row.code, primaryIdx),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lines: row.lines.map((l: any) => ({
      id: l.id,
      sortOrder: l.sortOrder,
      productId: l.productId,
      tradeGoodId: l.componentTradeGoodId,
      qty: l.qty,
      product: l.product,
      tradeGood: l.componentTradeGood,
    })),
  };
}

function mapTradeGoodListItem(
  g: TradeGoodRowWithLines,
  lines: TradeGoodRowWithLines["lines"],
): Record<string, unknown> {
  const productLabels = lines.map((l: any) => {
    const productCode = l.product?.code?.trim();
    const tradeGoodCode = l.componentTradeGood?.code?.trim();
    const q = l.qty;
    const base = l.product
      ? productCode
        ? `${productCode} — ${l.product.name}`
        : l.product.name
      : l.componentTradeGood
        ? tradeGoodCode
          ? `${tradeGoodCode} — ${l.componentTradeGood.name}`
          : l.componentTradeGood.name
        : "—";
    return q !== 1 ? `${base} ×${q}` : base;
  });
  const productsSummary = productLabels.length ? productLabels.join("; ") : "—";
  const primaryIdx = g.photoPrimaryIndex >= 1 ? g.photoPrimaryIndex : 1;
  return {
    id: g.id,
    code: g.code,
    name: g.name,
    description: g.description,
    categoryId: g.categoryId,
    subcategoryId: g.subcategoryId,
    category: g.category?.name ?? null,
    subcategory: g.subcategory?.name ?? null,
    unitCode: g.unitCode,
    priceRub: g.priceRub,
    costRub: g.costRub,
    notes: g.notes,
    isActive: g.isActive,
    kind: g.kind,
    photoPrimaryIndex: primaryIdx,
    photoUrls: listTradeGoodPhotoVariantPublicUrls(config.tradeGoodsPhotosDir, g.code, "thumb_320"),
    photoUrl:
      resolveTradeGoodPhotoDisplayUrlVariant(config.tradeGoodsPhotosDir, g.code, primaryIdx, "thumb_320") ??
      tradeGoodPhotoUrlJson(g.code, primaryIdx),
    linesCount: lines.length,
    productsSummary,
    compositionLines: lines.map((l: any) => ({
      productLabel: l.product
        ? l.product.code?.trim()
          ? `${l.product.code.trim()} — ${l.product.name}`
          : l.product.name
        : l.componentTradeGood
          ? l.componentTradeGood.code?.trim()
            ? `${l.componentTradeGood.code.trim()} — ${l.componentTradeGood.name}`
            : l.componentTradeGood.name
          : "—",
      qty: l.qty,
    })),
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

function tradeGoodLineCreateData(line: {
  sortOrder: number;
  qty: number;
  productId: string | null;
  tradeGoodId: string | null;
}) {
  if (line.productId) {
    return {
      sortOrder: line.sortOrder,
      qty: line.qty,
      product: { connect: { id: line.productId } },
    };
  }
  return {
    sortOrder: line.sortOrder,
    qty: line.qty,
    componentTradeGood: { connect: { id: String(line.tradeGoodId) } },
  };
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function parsePhotoSlotFromUrl(url: string | null | undefined): number {
  const raw = String(url ?? "");
  const noQuery = raw.split("?")[0] ?? raw;
  const m = noQuery.match(/_([0-9]+)_(thumb_320|medium_640|original)\.webp$/i);
  if (!m) return 1;
  const n = Number.parseInt(m[1] ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

tradeGoodsRouter.get("/", async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query["page"], 1);
    const pageSize = Math.min(parsePositiveInt(req.query["pageSize"], 50), 200);
    const skip = (page - 1) * pageSize;
    const list = await prisma.tradeGood.findMany({
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
      include: {
        ...classificationInclude,
        lines: {
          orderBy: { sortOrder: "asc" },
          include: listLineInclude,
        },
      },
    });
    const total = await prisma.tradeGood.count();
    res.json({
      data: list.map((g) => {
        const lines = [...g.lines].sort((a, b) => a.sortOrder - b.sortOrder);
        return mapTradeGoodListItem(g as TradeGoodRowWithLines, lines);
      }),
      total,
      page,
      pageSize,
    });
  } catch (e) {
    next(e);
  }
});

tradeGoodsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = paramId(req.params["id"]);
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.tradeGood.findUnique({
      where: { id },
      include: {
        ...classificationInclude,
        lines: {
          orderBy: { sortOrder: "asc" },
          include: lineInclude,
        },
      },
    });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(mapTradeGood(row as TradeGoodRowWithLines));
  } catch (e) {
    next(e);
  }
});

tradeGoodsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const normLines = normalizeTradeGoodInputLines(p.lines);
    const sums = await sumPriceAndCostFromTradeGoodLines(
      normLines.map((l) => ({ productId: l.productId, tradeGoodId: l.tradeGoodId, qty: l.qty })),
    );
    const priceRub = numOrNull(p.priceRub) ?? sums.price;
    const costRub = numOrNull(p.costRub) ?? sums.cost;

    const created = await prisma.$transaction(async (tx) => {
      const ids = await resolveClassificationForInput(tx, p);
      return tx.tradeGood.create({
        data: {
          code: strOrNull(p.code),
          name: p.name.trim(),
          description: strOrNull(p.description),
          categoryId: ids.categoryId,
          subcategoryId: ids.subcategoryId,
          unitCode: strOrNull(p.unitCode),
          priceRub,
          costRub,
          notes: strOrNull(p.notes),
          isActive: p.isActive,
          kind: p.kind ?? "ITEM",
          photoPrimaryIndex: p.photoPrimaryIndex ?? 1,
          lines: {
            create: normLines.map((line) => tradeGoodLineCreateData(line)),
          },
        },
        include: {
          ...classificationInclude,
          lines: { orderBy: { sortOrder: "asc" }, include: lineInclude },
        },
      });
    });

    res.status(201).json(mapTradeGood(created as TradeGoodRowWithLines));
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith(CLASSIFICATION_ERR)) {
      res.status(400).json({
        error: "classification_invalid",
        reason: e.message.slice(CLASSIFICATION_ERR.length),
      });
      return;
    }
    next(e);
  }
});

tradeGoodsRouter.post(
  "/:id/photos",
  tradeGoodsPhotoUpload.array("files", 15),
  async (req, res, next) => {
    try {
      const id = paramId(req.params["id"]);
      if (!id) {
        res.status(400).json({ error: "missing_id" });
        return;
      }
      const files = req.files;
      if (!Array.isArray(files) || files.length === 0) {
        res.status(400).json({ error: "no_files" });
        return;
      }
      const unsupported = files.find((f) => !extFromImageMime(f.mimetype));
      if (unsupported) {
        res.status(400).json({
          error: "unsupported_file_type",
          message: `Допустимы только изображения jpeg/png/webp/gif. Получено: ${unsupported.mimetype || "unknown"}`,
        });
        return;
      }
      const row = await prisma.tradeGood.findUnique({ where: { id } });
      if (!row) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const code = strOrNull(row.code);
      if (!code) {
        res.status(400).json({
          error: "missing_code",
          message: "Укажите артикул товара — по нему сохраняются имена файлов.",
        });
        return;
      }
      const stem = stemFromTradeGoodArticleCode(code);
      if (!stem) {
        res.status(400).json({ error: "invalid_code" });
        return;
      }
      const rawPrimary = req.body?.["primaryIndex"];
      let primaryOneBased = 1;
      if (rawPrimary != null && String(rawPrimary).trim() !== "") {
        const n = parseInt(String(rawPrimary), 10);
        if (Number.isFinite(n) && n >= 1 && n <= files.length) {
          primaryOneBased = n;
        }
      }
      await clearTradeGoodPhotoFilesAsync(config.tradeGoodsPhotosDir, code);
      const dir = config.tradeGoodsPhotosDir;
      await fs.mkdir(dir, { recursive: true });
      for (let i = 0; i < files.length; i++) {
        const f = files[i]!;
        const ext = extFromImageMime(f.mimetype);
        if (!ext) {
          res.status(400).json({ error: "unsupported_file_type" });
          return;
        }
        const originalName = `${stem}_${i + 1}${ext}`;
        const originalAbs = path.join(dir, originalName);
        await fs.writeFile(originalAbs, f.buffer);
        const source = sharp(f.buffer, { failOn: "none", limitInputPixels: 40_000_000 }).rotate();
        await source
          .clone()
          .resize({ width: 320, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(path.join(dir, `${stem}_${i + 1}_thumb_320.webp`));
        await source
          .clone()
          .resize({ width: 640, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(path.join(dir, `${stem}_${i + 1}_medium_640.webp`));
        await source
          .clone()
          .webp({ quality: 80 })
          .toFile(path.join(dir, `${stem}_${i + 1}_original.webp`));
      }
      const updated = await prisma.tradeGood.update({
        where: { id },
        data: { photoPrimaryIndex: primaryOneBased },
        include: {
          ...classificationInclude,
          lines: { orderBy: { sortOrder: "asc" }, include: lineInclude },
        },
      });
      res.json(mapTradeGood(updated as TradeGoodRowWithLines));
    } catch (e) {
      next(e);
    }
  },
);

tradeGoodsRouter.put("/:id", async (req, res, next) => {
  try {
    const id = paramId(req.params["id"]);
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const p = parsed.data;
    const normLines = normalizeTradeGoodInputLines(p.lines);
    const sums = await sumPriceAndCostFromTradeGoodLines(
      normLines.map((l) => ({ productId: l.productId, tradeGoodId: l.tradeGoodId, qty: l.qty })),
    );
    const priceRub = numOrNull(p.priceRub) ?? sums.price;
    const costRub = numOrNull(p.costRub) ?? sums.cost;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.tradeGood.findUnique({ where: { id } });
      if (!existing) {
        return null;
      }
      const ids = await resolveClassificationForInput(tx, p);
      const oldStem = stemFromTradeGoodArticleCode(existing.code);
      const newStem = stemFromTradeGoodArticleCode(strOrNull(p.code));
      if (oldStem && newStem && oldStem !== newStem) {
        await moveTradeGoodPhotoFilesAsync(config.tradeGoodsPhotosDir, existing.code, strOrNull(p.code));
        const linkedLines = await tx.commercialOfferLine.findMany({
          where: { catalogProductId: id, imageUrl: { contains: `/media/trade-goods/${oldStem}_` } },
          select: { id: true, imageUrl: true },
        });
        for (const line of linkedLines) {
          const slot = parsePhotoSlotFromUrl(line.imageUrl);
          await tx.commercialOfferLine.update({
            where: { id: line.id },
            data: { imageUrl: `/media/trade-goods/${newStem}_${slot}_medium_640.webp` },
          });
        }
      }
      if (oldStem && !newStem) {
        await clearTradeGoodPhotoFilesAsync(config.tradeGoodsPhotosDir, existing.code);
      }
      await tx.tradeGoodLine.deleteMany({ where: { tradeGoodId: id } });
      return tx.tradeGood.update({
        where: { id },
        data: {
          code: strOrNull(p.code),
          name: p.name.trim(),
          description: strOrNull(p.description),
          categoryId: ids.categoryId,
          subcategoryId: ids.subcategoryId,
          unitCode: strOrNull(p.unitCode),
          priceRub,
          costRub,
          notes: strOrNull(p.notes),
          isActive: p.isActive,
          kind: p.kind ?? "ITEM",
          ...(p.photoPrimaryIndex !== undefined ? { photoPrimaryIndex: p.photoPrimaryIndex } : {}),
          lines: {
            create: normLines.map((line) => tradeGoodLineCreateData(line)),
          },
        },
        include: {
          ...classificationInclude,
          lines: { orderBy: { sortOrder: "asc" }, include: lineInclude },
        },
      });
    });

    if (!updated) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(mapTradeGood(updated as TradeGoodRowWithLines));
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith(CLASSIFICATION_ERR)) {
      res.status(400).json({
        error: "classification_invalid",
        reason: e.message.slice(CLASSIFICATION_ERR.length),
      });
      return;
    }
    next(e);
  }
});

tradeGoodsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = paramId(req.params["id"]);
    if (!id) {
      res.status(400).json({ error: "missing_id" });
      return;
    }
    const row = await prisma.tradeGood.findUnique({ where: { id } });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (row.code) {
      await clearTradeGoodPhotoFilesAsync(config.tradeGoodsPhotosDir, row.code);
    }
    await prisma.tradeGood.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
