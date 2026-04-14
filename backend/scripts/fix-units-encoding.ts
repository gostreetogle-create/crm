import { PrismaClient } from '@prisma/client';

type CanonicalUnit = {
  name: string;
  notes: string;
};

const prisma = new PrismaClient();

const SUSPICIOUS_NAME_RE = /[^\u0000-\u007F\u0400-\u04FF]/;

const CANONICAL_BY_CODE = new Map<string, CanonicalUnit>([
  ['pcs', { name: 'шт.', notes: 'штука' }],
  ['sht', { name: 'шт.', notes: 'штука' }],
  ['m', { name: 'м', notes: 'метр' }],
  ['m2', { name: 'м²', notes: 'квадратный метр' }],
  ['m_2', { name: 'м²', notes: 'квадратный метр' }],
  ['m3', { name: 'м³', notes: 'кубический метр' }],
  ['m_3', { name: 'м³', notes: 'кубический метр' }],
  ['kg', { name: 'кг', notes: 'килограмм' }],
  ['t', { name: 'т', notes: 'тонна' }],
  ['ton', { name: 'т', notes: 'тонна' }],
  ['l', { name: 'л', notes: 'литр' }],
  ['pack', { name: 'упак.', notes: 'упаковка' }],
  ['pkg', { name: 'упак.', notes: 'упаковка' }],
  ['set', { name: 'компл.', notes: 'комплект' }],
  ['kit', { name: 'компл.', notes: 'комплект' }],
  ['m_run', { name: 'пог. м', notes: 'погонный метр' }],
]);

function normalizeCode(raw: string | null): string {
  return (raw ?? '').trim().toLowerCase();
}

async function main() {
  const units = await prisma.unit.findMany({
    select: { id: true, name: true, code: true, notes: true },
    orderBy: { name: 'asc' },
  });

  const suspicious = units.filter((unit) => SUSPICIOUS_NAME_RE.test(unit.name));
  console.log(`Всего единиц: ${units.length}. Подозрительных имён: ${suspicious.length}.`);

  for (const unit of suspicious) {
    console.log(`[BAD] id=${unit.id} code=${unit.code ?? 'null'} name="${unit.name}"`);
  }

  let updated = 0;
  let skipped = 0;
  for (const unit of suspicious) {
    const canonical = CANONICAL_BY_CODE.get(normalizeCode(unit.code));
    if (!canonical) {
      console.warn(`[SKIP] Нет каноничного значения для code=${unit.code ?? 'null'} (id=${unit.id})`);
      skipped += 1;
      continue;
    }

    await prisma.unit.update({
      where: { id: unit.id },
      data: {
        name: canonical.name,
        notes: canonical.notes,
      },
    });

    console.log(`[FIXED] id=${unit.id} -> "${canonical.name}" (${canonical.notes})`);
    updated += 1;
  }

  console.log(`Готово. Исправлено: ${updated}. Пропущено: ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
