/**
 * Проверка целостности: роли в БД, ключи в сохранённой матрице `authz_matrix`.
 * Запуск из каталога backend: `npm run authz:check`
 * Код выхода: 0 — ok, 1 — есть ошибки (неизвестные roleId в матрице или неверные ключи).
 */
import { prisma } from '../src/lib/prisma.js';
import { collectAuthzDiagnostics } from '../src/lib/authz-diagnostics.js';

async function main(): Promise<void> {
  const report = await collectAuthzDiagnostics(prisma);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error('[authz:check] FAILED: unknown roles in matrix or invalid permission keys.');
    process.exitCode = 1;
  } else {
    console.log('[authz:check] OK.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
