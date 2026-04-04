import { normalizeRalCode } from './dictionaries-page-form-utils';

export function validateAndMapColorRows(rows: ReadonlyArray<Record<string, unknown>>): {
  ok: boolean;
  rows: Array<{
    ralCode?: string;
    name: string;
    hex: string;
    rgb: { r: number; g: number; b: number };
  }>;
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: Array<{
    ralCode?: string;
    name: string;
    hex: string;
    rgb: { r: number; g: number; b: number };
  }> = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders = ['RAL', 'Название', 'HEX', 'RGB'];
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return {
      ok: false,
      rows: mapped,
      errors: [`Нет колонок: ${missingHeaders.join(', ')}`],
    };
  }

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const ralRaw = String(row['RAL'] ?? '');
    const ralCode = normalizeRalCode(ralRaw);
    const name = String(row['Название'] ?? '').trim();
    const hex = String(row['HEX'] ?? '').trim().toUpperCase();
    const rgbRaw = String(row['RGB'] ?? '').trim();

    if (!name || !hex || !rgbRaw) {
      errors.push(`Строка ${rowNo}: заполните Название/HEX/RGB.`);
      return;
    }

    if (ralRaw.trim() && !ralCode) {
      errors.push(`Строка ${rowNo}: RAL должен быть в формате RAL 0000 или 0000.`);
      return;
    }

    if (!/^#([A-F0-9]{6})$/.test(hex)) {
      errors.push(`Строка ${rowNo}: HEX должен быть #RRGGBB.`);
      return;
    }

    const rgbParts = rgbRaw
      .split(/[,\s;]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (rgbParts.length !== 3 || rgbParts.some((x) => !/^\d+$/.test(x))) {
      errors.push(`Строка ${rowNo}: RGB должен быть в формате R,G,B.`);
      return;
    }

    const [r, g, b] = rgbParts.map((x) => Number.parseInt(x, 10));
    if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) {
      errors.push(`Строка ${rowNo}: RGB вне диапазона 0..255.`);
      return;
    }

    const check = {
      r: Number.parseInt(hex.slice(1, 3), 16),
      g: Number.parseInt(hex.slice(3, 5), 16),
      b: Number.parseInt(hex.slice(5, 7), 16),
    };

    if (check.r !== r || check.g !== g || check.b !== b) {
      errors.push(`Строка ${rowNo}: RGB не соответствует HEX.`);
      return;
    }

    mapped.push({ ralCode, name, hex, rgb: { r, g, b } });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}

