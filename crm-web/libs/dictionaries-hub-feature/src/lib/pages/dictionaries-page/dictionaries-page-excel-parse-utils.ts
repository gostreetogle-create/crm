import { parseNumberOrNull } from './dictionaries-page-form-utils';

export type CompactGeometryParams = {
  heightMm: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  diameterMm: number | null;
  thicknessMm: number | null;
};

/**
 * Компактный формат (как в UI/экспорте): 20×20×3×6000 мм, ⌀32×2×6000 мм, разделители × x X х.
 */
export function tryParseCompactGeometryParams(
  raw: string,
  shapeKey: string,
): CompactGeometryParams | null {
  let s = raw.trim();
  s = s.replace(/\s*мм\s*$/i, '').replace(/\s*mm\s*$/i, '').trim();
  if (!s) return null;

  const parts = s.split(/[×xXх\u00D7]/u).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;

  const nums: number[] = [];
  for (const p of parts) {
    const cleaned = p
      .replace(/^[⌀Ø]\s*/u, '')
      .replace(/^диам\.?\s*/i, '');
    const v = parseNumberOrNull(cleaned);
    if (v === null) return null;
    nums.push(v);
  }

  const n = nums;
  switch (shapeKey) {
    case 'rectangular':
      if (n.length === 4) {
        return {
          heightMm: n[0],
          widthMm: n[1],
          thicknessMm: n[2],
          lengthMm: n[3],
          diameterMm: null,
        };
      }
      if (n.length === 3) {
        return {
          heightMm: n[0],
          widthMm: n[1],
          thicknessMm: null,
          lengthMm: n[2],
          diameterMm: null,
        };
      }
      return null;
    case 'tube':
      if (n.length === 3) {
        return {
          diameterMm: n[0],
          thicknessMm: n[1],
          lengthMm: n[2],
          heightMm: null,
          widthMm: null,
        };
      }
      return null;
    case 'cylindrical':
      if (n.length === 2) {
        return {
          diameterMm: n[0],
          lengthMm: n[1],
          heightMm: null,
          widthMm: null,
          thicknessMm: null,
        };
      }
      return null;
    case 'plate':
      if (n.length === 3) {
        return {
          lengthMm: n[0],
          widthMm: n[1],
          thicknessMm: n[2],
          heightMm: null,
          diameterMm: null,
        };
      }
      return null;
    default:
      if (n.length === 0 || n.length > 5) return null;
      return {
        heightMm: n[0] ?? null,
        widthMm: n[1] ?? null,
        lengthMm: n[2] ?? null,
        diameterMm: n[3] ?? null,
        thicknessMm: n[4] ?? null,
      };
  }
}

export function parseExcelBool(raw: unknown, defaultTrue: boolean): boolean {
  if (raw === null || raw === undefined || raw === '') return defaultTrue;
  const s = String(raw).trim().toLowerCase();
  if (!s) return defaultTrue;
  if (['да', 'д', 'yes', 'y', '1', 'true'].includes(s)) return true;
  if (['нет', 'н', 'no', 'n', '0', 'false'].includes(s)) return false;
  return defaultTrue;
}

export function isUuidString(raw: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    raw.trim(),
  );
}
