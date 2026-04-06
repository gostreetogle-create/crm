import type { Prisma } from "@prisma/client";

/**
 * Разбор legacy-полей category/subcategory (строки) в id справочников.
 * Создаёт строки при отсутствии (импорт JSON / совместимость).
 */
export async function resolveTradeGoodCategoryIdsFromNames(
  tx: Prisma.TransactionClient,
  category: string | null | undefined,
  subcategory: string | null | undefined,
): Promise<{ categoryId: string | null; subcategoryId: string | null }> {
  const catTrim = (category ?? "").trim();
  const subTrim = (subcategory ?? "").trim();
  if (!catTrim) {
    return { categoryId: null, subcategoryId: null };
  }
  let catRow = await tx.tradeGoodCategory.findUnique({ where: { name: catTrim } });
  if (!catRow) {
    catRow = await tx.tradeGoodCategory.create({ data: { name: catTrim } });
  }
  if (!subTrim) {
    return { categoryId: catRow.id, subcategoryId: null };
  }
  let subRow = await tx.tradeGoodSubcategory.findUnique({
    where: { categoryId_name: { categoryId: catRow.id, name: subTrim } },
  });
  if (!subRow) {
    subRow = await tx.tradeGoodSubcategory.create({
      data: { categoryId: catRow.id, name: subTrim },
    });
  }
  return { categoryId: catRow.id, subcategoryId: subRow.id };
}

export async function assertTradeGoodCategoryPair(
  tx: Prisma.TransactionClient,
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
): Promise<{ categoryId: string | null; subcategoryId: string | null }> {
  const cat = categoryId?.trim() || null;
  const sub = subcategoryId?.trim() || null;
  if (!cat && !sub) {
    return { categoryId: null, subcategoryId: null };
  }
  if (!cat && sub) {
    throw new Error("subcategory_without_category");
  }
  const c = await tx.tradeGoodCategory.findUnique({ where: { id: cat! } });
  if (!c) {
    throw new Error("category_not_found");
  }
  if (!sub) {
    return { categoryId: c.id, subcategoryId: null };
  }
  const s = await tx.tradeGoodSubcategory.findUnique({ where: { id: sub } });
  if (!s) {
    throw new Error("subcategory_not_found");
  }
  if (s.categoryId !== c.id) {
    throw new Error("subcategory_category_mismatch");
  }
  return { categoryId: c.id, subcategoryId: s.id };
}
