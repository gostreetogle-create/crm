import { PrismaClient } from '@prisma/client';
import { config } from '../src/config.js';
import { resolveTradeGoodPhotoDisplayUrlVariant } from '../src/lib/trade-good-photo-resolve.js';

type SnapshotLine = {
  lineNo?: number;
  name?: string;
  imageUrl?: string | null;
  catalogProductId?: string | null;
  [key: string]: unknown;
};

const prisma = new PrismaClient();

function nonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

/** В БД храним `/media/trade-goods/...` или имя файла, без абсолютного URL и без query. */
function normalizeStoredImageUrl(value: string): string {
  let s = value.trim();
  if (/^https?:\/\//i.test(s)) {
    try {
      s = new URL(s).pathname;
    } catch {
      /* keep */
    }
  }
  const q = s.indexOf('?');
  if (q !== -1) s = s.slice(0, q);
  return s;
}

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      NOT: [{ linesSnapshot: { equals: [] } }, { linesSnapshot: { equals: null } }],
    },
    select: {
      id: true,
      commercialOfferId: true,
      linesSnapshot: true,
    },
  });

  let updatedOrders = 0;
  let patchedLines = 0;
  let skippedWithoutSource = 0;

  for (const order of orders) {
    const lines = Array.isArray(order.linesSnapshot) ? order.linesSnapshot.map((line) => ({ ...(line as SnapshotLine) })) : [];
    if (!lines.length) continue;

    const offerLines = await prisma.commercialOfferLine.findMany({
      where: { commercialOfferId: order.commercialOfferId },
      select: { lineNo: true, imageUrl: true, catalogProductId: true, name: true },
    });

    let changed = false;
    for (const line of lines) {
      const lineNo = Number(line.lineNo ?? 0);
      const snapshotName = nonEmpty(line.name);

      const existingUrl = nonEmpty(line.imageUrl);
      if (existingUrl) {
        const normalized = normalizeStoredImageUrl(existingUrl);
        if (normalized !== existingUrl) {
          line.imageUrl = normalized;
          patchedLines += 1;
          changed = true;
        }
        continue;
      }

      const snapshotCatalogId = nonEmpty(line.catalogProductId);
      if (snapshotCatalogId) {
        const tg = await prisma.tradeGood.findUnique({
          where: { id: snapshotCatalogId },
          select: { code: true, photoPrimaryIndex: true },
        });
        if (tg?.code) {
          const resolved = resolveTradeGoodPhotoDisplayUrlVariant(
            config.tradeGoodsPhotosDir,
            tg.code,
            tg.photoPrimaryIndex >= 1 ? tg.photoPrimaryIndex : 1,
            'thumb_320',
          );
          if (resolved) {
            line.imageUrl = normalizeStoredImageUrl(resolved);
            patchedLines += 1;
            changed = true;
            continue;
          }
        }
      }

      const offerLine = offerLines.find((it) => it.lineNo === lineNo);
      const fromOffer = nonEmpty(offerLine?.imageUrl);
      if (fromOffer) {
        line.imageUrl = normalizeStoredImageUrl(fromOffer);
        patchedLines += 1;
        changed = true;
        continue;
      }

      const tradeGoodId = nonEmpty(offerLine?.catalogProductId);
      const tradeGoodById = tradeGoodId
        ? await prisma.tradeGood.findUnique({
            where: { id: tradeGoodId },
            select: { code: true, photoPrimaryIndex: true },
          })
        : null;
      const tradeGoodByName = !tradeGoodById && snapshotName
        ? await prisma.tradeGood.findFirst({
            where: { name: snapshotName },
            select: { code: true, photoPrimaryIndex: true },
          })
        : null;

      const tradeGood = tradeGoodById ?? tradeGoodByName;
      if (!tradeGood?.code) {
        skippedWithoutSource += 1;
        continue;
      }

      const resolved = resolveTradeGoodPhotoDisplayUrlVariant(
        config.tradeGoodsPhotosDir,
        tradeGood.code,
        tradeGood.photoPrimaryIndex >= 1 ? tradeGood.photoPrimaryIndex : 1,
        'thumb_320',
      );

      if (!resolved) {
        skippedWithoutSource += 1;
        continue;
      }

      line.imageUrl = normalizeStoredImageUrl(resolved);
      patchedLines += 1;
      changed = true;
    }

    if (changed) {
      await prisma.order.update({
        where: { id: order.id },
        data: { linesSnapshot: lines },
      });
      updatedOrders += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        checkedOrders: orders.length,
        updatedOrders,
        patchedLines,
        skippedWithoutSource,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
