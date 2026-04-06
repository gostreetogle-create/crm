/**
 * Если в БД нет строк — отдаём один объект-шаблон с теми же полями, что и при экспорте данных,
 * со строками `""`, `null` или числовыми заглушками (0), чтобы файл был полезен для импорта после заполнения.
 */
export function withSkeletonIfEmpty<T extends Record<string, unknown>>(items: T[], skeleton: T): { items: T[] } {
  if (items.length === 0) {
    return { items: [skeleton] };
  }
  return { items };
}
