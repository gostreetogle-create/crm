import { prisma } from "./prisma.js";

export function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

export function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

export async function sumPriceAndCostFromProducts(
  lines: { productId: string; qty: number }[],
): Promise<{ price: number; cost: number }> {
  if (lines.length === 0) return { price: 0, cost: 0 };
  const ids = [...new Set(lines.map((l) => l.productId))];
  const rows = await prisma.manufacturedProduct.findMany({
    where: { id: { in: ids } },
    select: { id: true, priceRub: true, costRub: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  let price = 0;
  let cost = 0;
  for (const l of lines) {
    const p = byId.get(l.productId);
    const q = l.qty;
    price += (p?.priceRub ?? 0) * q;
    cost += (p?.costRub ?? 0) * q;
  }
  return { price, cost };
}
