import type { Prisma } from "@prisma/client";
import { config } from "../config.js";
import { resolveTradeGoodPhotoDisplayUrlVariant } from "./trade-good-photo-resolve.js";

/**
 * После сохранения строк КП: для строк без валидной связи с TradeGood
 * — ищем товар по точному имени (без учёта регистра), иначе создаём новую карточку ITEM.
 * Поле `CommercialOfferLine.catalogProductId` хранит id из `trade_goods`.
 */
export async function syncCatalogTradeGoodsForOffer(
  tx: Prisma.TransactionClient,
  commercialOfferId: string,
): Promise<{ linked: number; created: number }> {
  let linked = 0;
  let created = 0;

  const lines = await tx.commercialOfferLine.findMany({
    where: { commercialOfferId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      unit: true,
      unitPrice: true,
      catalogProductId: true,
    },
  });

  for (const line of lines) {
    const trimmedName = line.name.trim();
    if (!trimmedName) {
      continue;
    }

    let catalogId = line.catalogProductId?.trim() ?? null;
    if (catalogId) {
      const existingGood = await tx.tradeGood.findUnique({
        where: { id: catalogId },
        select: { id: true, code: true, photoPrimaryIndex: true },
      });
      if (existingGood) {
        const displayUrl =
          resolveTradeGoodPhotoDisplayUrlVariant(
            config.tradeGoodsPhotosDir,
            existingGood.code,
            existingGood.photoPrimaryIndex,
            "medium_640",
          ) ?? null;
        await tx.commercialOfferLine.update({
          where: { id: line.id },
          data: { imageUrl: displayUrl },
        });
        continue;
      }
      catalogId = null;
    }

    const matchByName = await tx.tradeGood.findFirst({
      where: { name: { equals: trimmedName, mode: "insensitive" } },
      select: { id: true, code: true, photoPrimaryIndex: true },
      orderBy: { createdAt: "asc" },
    });

    if (matchByName) {
      const displayUrl =
        resolveTradeGoodPhotoDisplayUrlVariant(
          config.tradeGoodsPhotosDir,
          matchByName.code,
          matchByName.photoPrimaryIndex,
          "medium_640",
        ) ?? null;
      await tx.commercialOfferLine.update({
        where: { id: line.id },
        data: { catalogProductId: matchByName.id, imageUrl: displayUrl },
      });
      linked += 1;
      continue;
    }

    const newGood = await tx.tradeGood.create({
      data: {
        name: trimmedName,
        unitCode: line.unit.trim() || null,
        priceRub: line.unitPrice,
        kind: "ITEM",
        isActive: true,
      },
      select: { id: true, code: true, photoPrimaryIndex: true },
    });
    const displayUrl =
      resolveTradeGoodPhotoDisplayUrlVariant(
        config.tradeGoodsPhotosDir,
        newGood.code,
        newGood.photoPrimaryIndex,
        "medium_640",
      ) ?? null;
    await tx.commercialOfferLine.update({
      where: { id: line.id },
      data: { catalogProductId: newGood.id, imageUrl: displayUrl },
    });
    created += 1;
  }

  return { linked, created };
}
