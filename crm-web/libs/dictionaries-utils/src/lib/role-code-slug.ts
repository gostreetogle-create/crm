/**
 * Внутренний код роли (латиница): для экспорта/импорта и сопоставления «Код роли» в Excel.
 * В UI не показываем — генерируется из названия при создании и не меняется при переименовании.
 */

const CYRILLIC_TO_LATIN: Readonly<Record<string, string>> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  і: 'i',
  ї: 'yi',
  є: 'e',
  ґ: 'g',
};

const RESERVED_LOWER = new Set(['admin']);

/** Коды ролей из сида/системные — учитывать при генерации, даже если список с сервера ещё не подгрузился. */
export const SEEDED_ROLE_CODES_LOWER = new Set(['admin']);

function transliterateChar(ch: string): string {
  const lo = ch.toLowerCase();
  if (CYRILLIC_TO_LATIN[lo] !== undefined) {
    return CYRILLIC_TO_LATIN[lo];
  }
  return ch;
}

/**
 * Черновик кода из названия: только [a-z0-9_], с буквы, длина ≥ 2 при возможности.
 */
export function slugifyRoleCodeFromName(name: string): string {
  const raw = name
    .trim()
    .split('')
    .map((c) => transliterateChar(c))
    .join('')
    .toLowerCase();
  const collapsed = raw
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  let base = collapsed;
  if (!base) {
    base = 'role';
  }
  if (/^[0-9]/.test(base)) {
    base = `r_${base}`;
  }
  if (!/^[a-z]/.test(base)) {
    base = `r_${base}`;
  }
  if (RESERVED_LOWER.has(base)) {
    base = 'role_admin';
  }
  if (base.length < 2) {
    base = `${base}_r`;
  }
  return base;
}

/**
 * Уникальный код среди уже занятых (регистронезависимо).
 */
export function allocateUniqueRoleCode(base: string, takenLower: ReadonlySet<string>): string {
  let candidate = base;
  let n = 2;
  while (takenLower.has(candidate.toLowerCase())) {
    candidate = `${base}_${n++}`;
  }
  return candidate;
}
