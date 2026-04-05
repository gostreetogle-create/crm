import { prisma } from "./prisma.js";

export type PrismaPoolRefreshResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * После `pg_restore` старые соединения пула Prisma могут ссылаться на устаревшее состояние сессии.
 * Полный disconnect + connect сбрасывает пул в этом процессе Node (без перезапуска контейнера).
 */
export async function refreshPrismaConnectionPool(): Promise<PrismaPoolRefreshResult> {
  try {
    await prisma.$disconnect();
    await prisma.$connect();
    console.info("[db-backup] Prisma: пул соединений к БД обновлён после восстановления из архива.");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[db-backup] Prisma: не удалось переподключиться к БД:", error);
    return { ok: false, error };
  }
}
