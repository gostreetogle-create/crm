import { Router } from "express";
import express from "express";
import { z } from "zod";
import { config } from "../config.js";
import { resolveKpPhotoDisplayUrl, sanitizeKpPhotoFileName } from "../lib/kp-photo-resolve.js";
import { prisma } from "../lib/prisma.js";

export const kpPhotosRouter = Router();

kpPhotosRouter.use(express.json({ limit: "8mb" }));

const InputSchema = z.object({
  name: z.string().trim().min(1),
  organizationId: z.string().trim().min(1),
  photoTitle: z.string().trim().min(1),
  /** Имя файла в каталоге uploads/kp-photos/{organizationId}/ */
  photoFileName: z.string().trim().optional().nullable(),
  /** Внешний URL или data URL (legacy); опционально, если задан файл на диске. */
  photoUrl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

function toJson(row: {
  id: string;
  name: string;
  organizationId: string;
  photoTitle: string;
  photoFileName: string | null;
  photoUrl: string | null;
  isActive: boolean;
  organization: { id: string; name: string; shortName: string | null };
}) {
  const orgLabel = row.organization.shortName?.trim() || row.organization.name;
  const rawExternal = row.photoUrl?.trim() ? row.photoUrl : "";
  const displayUrl = resolveKpPhotoDisplayUrl(
    config.kpPhotosDir,
    row.organizationId,
    row.photoFileName,
    row.photoUrl,
  );
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organizationId,
    organizationName: orgLabel,
    photoTitle: row.photoTitle,
    photoFileName: row.photoFileName ?? "",
    /** Итоговый URL для `<img>` (файл на диске или внешний / data URL). */
    photoUrl: displayUrl ?? "",
    /** Как в БД: внешний или data URL (для поля ввода в форме). */
    photoExternalUrl: rawExternal,
    isActive: row.isActive,
  };
}

kpPhotosRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.kpPhoto.findMany({
      orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
      include: {
        organization: { select: { id: true, name: true, shortName: true } },
      },
    });
    res.json(rows.map(toJson));
  } catch (e) {
    next(e);
  }
});

kpPhotosRouter.post("/", async (req, res, next) => {
  try {
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
    if (!org) {
      res.status(400).json({ error: "invalid_organization" });
      return;
    }
    const photoFileName = sanitizeKpPhotoFileName(parsed.data.photoFileName ?? undefined);
    const photoUrlRaw = parsed.data.photoUrl?.trim();
    const row = await prisma.kpPhoto.create({
      data: {
        name: parsed.data.name,
        organizationId: parsed.data.organizationId,
        photoTitle: parsed.data.photoTitle,
        photoFileName: photoFileName,
        photoUrl: photoUrlRaw && photoUrlRaw.length > 0 ? photoUrlRaw : null,
        isActive: parsed.data.isActive ?? true,
      },
      include: {
        organization: { select: { id: true, name: true, shortName: true } },
      },
    });
    res.status(201).json(toJson(row));
  } catch (e) {
    next(e);
  }
});

kpPhotosRouter.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsed = InputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
    if (!org) {
      res.status(400).json({ error: "invalid_organization" });
      return;
    }
    const photoFileName = sanitizeKpPhotoFileName(parsed.data.photoFileName ?? undefined);
    const photoUrlRaw = parsed.data.photoUrl?.trim();
    try {
      const row = await prisma.kpPhoto.update({
        where: { id },
        data: {
          name: parsed.data.name,
          organizationId: parsed.data.organizationId,
          photoTitle: parsed.data.photoTitle,
          photoFileName: photoFileName,
          photoUrl: photoUrlRaw && photoUrlRaw.length > 0 ? photoUrlRaw : null,
          isActive: parsed.data.isActive ?? true,
        },
        include: {
          organization: { select: { id: true, name: true, shortName: true } },
        },
      });
      res.json(toJson(row));
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});

kpPhotosRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await prisma.kpPhoto.delete({ where: { id } });
      res.status(204).send();
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2025") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
});
