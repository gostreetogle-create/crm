import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import { prisma } from '../prisma.js';

type ExcelSheetReport = {
  inputRows: number;
  processedRows: number;
  created: number;
  updated: number;
  skipped: number;
  warnings: Array<{ excelRow: number; field?: string; message: string }>;
  errors: Array<{ excelRow: number; field?: string; message: string }>;
};

export type ExcelDictionariesImportReport = {
  ok: boolean;
  totalInputRows: number;
  totalProcessedRows: number;
  sheets: Record<string, ExcelSheetReport>;
};

function normalizeXlsxBuffer(buffer: Buffer): Buffer {
  // Excel иногда показывает предупреждение о "повреждённом" файле,
  // даже если библиотека `xlsx` может корректно прочитать workbook.
  // Двойная запись через XLSX выравнивает внутреннюю структуру.
  const wb = XLSX.read(buffer, { type: 'buffer' });
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

const EXCEL_SHEET_DISPLAY_NAMES_RU: Readonly<Record<string, string>> = {
  Units: 'Единицы',
  Colors: 'Цвета',
  Roles: 'Роли',
  Users: 'Пользователи',
  WorkTypes: 'Типы работ',
  Geometries: 'Геометрии',
  SurfaceFinishes: 'Отделки поверхностей',
  Coatings: 'Покрытия',
  Clients: 'Клиенты',
  Organizations: 'Организации',
  KpPhotos: 'Фото КП',
  MaterialCharacteristics: 'Характеристики материалов',
  Materials: 'Материалы',
};

function excelSheetDisplayNameRu(sheetKey: string): string {
  return EXCEL_SHEET_DISPLAY_NAMES_RU[sheetKey] ?? sheetKey;
}

type ParseResult<TDto> =
  | { ok: true; dto: TDto; warnings: ExcelSheetReport['warnings'] }
  | { ok: false; skipped: true; warnings: ExcelSheetReport['warnings']; errors: ExcelSheetReport['errors'] };

function sTrim(v: unknown): string {
  return String(v ?? '').trim();
}

function isBlank(v: unknown): boolean {
  return sTrim(v) === '';
}

function parseNumberOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const s = String(raw).trim();
  if (!s) return null;
  const normalized = s.replace(/\s+/g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(raw: unknown): number | null {
  const n = parseNumberOrNull(raw);
  if (n === null) return null;
  const i = Math.trunc(n);
  return Number.isFinite(i) && i === n ? i : null;
}

function parseBoolRu(raw: unknown, defaultValue: boolean): boolean {
  const s = sTrim(raw).toLowerCase();
  if (!s) return defaultValue;
  if (['да', 'д', 'yes', 'y', 'true', '1'].includes(s)) return true;
  if (['нет', 'н', 'no', 'n', 'false', '0'].includes(s)) return false;
  return defaultValue;
}

function parseUuid(raw: unknown): string | null {
  const v = sTrim(raw);
  if (!v) return null;
  // In this project some seed IDs may be non-UUID strings. For correctness we validate
  // the referenced IDs via existence caches (DB snapshot) instead of regex.
  return v;
}

function parseRgbCsv(raw: unknown): { r: number; g: number; b: number } | null {
  const s = sTrim(raw);
  if (!s) return null;
  const parts = s.split(',').map((x) => parseIntOrNull(x));
  if (!parts || parts.length !== 3) return null;
  const [r, g, b] = parts;
  if (r === null || g === null || b === null) return null;
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) return null;
  return { r, g, b };
}

function normalizeRalCode(raw: string): string | null {
  const value = raw.trim().toUpperCase();
  if (!value) return null;
  if (['RAL', 'RAL DESIGN', 'RAL DESIGN:'].includes(value)) return null;
  const classic = /^(?:RAL\s*)?(\d{4})$/.exec(value);
  if (classic) return `RAL ${classic[1]}`;
  const design = /^(?:RAL\s*DESIGN[:\s]*)?(\d{3})\s*(\d{2})\s*(\d{2})$/.exec(value);
  if (design) return `RAL DESIGN ${design[1]} ${design[2]} ${design[3]}`;
  return null;
}

function parseActiveCell(raw: unknown, defaultValue = true): boolean {
  // Excel uses 'да/нет' in this project.
  return parseBoolRu(raw, defaultValue);
}

function parseRuFloatOrNull(raw: unknown, allowZero = true): number | null {
  const n = parseNumberOrNull(raw);
  if (n === null) return null;
  if (!allowZero && n === 0) return null;
  return n;
}

function slugifyRoleCodeFromName(name: string): string {
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

  const raw = name
    .trim()
    .split('')
    .map((c) => {
      const lo = c.toLowerCase();
      return CYRILLIC_TO_LATIN[lo] ?? c;
    })
    .join('')
    .toLowerCase();
  const collapsed = raw
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  let base = collapsed;
  if (!base) base = 'role';
  if (/^[0-9]/.test(base)) base = `r_${base}`;
  if (!/^[a-z]/.test(base)) base = `r_${base}`;
  if (RESERVED_LOWER.has(base)) base = 'role_admin';
  if (base.length < 2) base = `${base}_r`;
  return base;
}

function allocateUniqueRoleCode(base: string, takenLower: ReadonlySet<string>): string {
  let candidate = base;
  let n = 2;
  while (takenLower.has(candidate.toLowerCase())) {
    candidate = `${base}_${n++}`;
  }
  return candidate;
}

type Adapter<TDto> = {
  sheetName: string;
  headers: readonly string[];
  templateSampleRows: Array<Record<string, unknown>>;
  parseRow: (raw: Record<string, unknown>, excelRow: number, ctx: ParseContext) => ParseResult<TDto>;
  upsert: (dtos: Array<TDto & { idMaybe?: string | null }>, report: ExcelSheetReport, ctx: UpsertContext) => Promise<void>;
  prefetch?: (ctx: PrefetchContext) => Promise<void>;
};

type ParseContext = {
  roleCodeToId?: Map<string, string>;
  existingRoleCodesLower?: Set<string>;
  passwordByUserId?: Map<string, string>;
  geometryShapeKeyAllowed?: Set<string>;
  existingByIdCache?: Record<string, Set<string>>;
};

type UpsertContext = {
  prismaTx: typeof prisma;
};

type PrefetchContext = {
  // reserved for future shared prefetch steps
};

function isAllBlankRow(values: unknown[]): boolean {
  return values.every((v) => isBlank(v));
}

function buildJsonMap(headers: readonly string[], row: unknown[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    out[h] = row[i] ?? '';
  }
  return out;
}

function excelHeadersFromFirstRow(firstRow: unknown[]): string[] {
  return firstRow.map((x) => String(x ?? '').trim());
}

function validateHeaders(sheetName: string, actual: readonly string[], expected: readonly string[]) {
  const missing = expected.filter((h) => !actual.includes(h));
  if (missing.length) {
    throw new Error(`Sheet "${sheetName}": missing columns: ${missing.join(', ')}`);
  }
}

// -------------------- adapters --------------------

type UnitDto = {
  id?: string;
  name: string;
  code: string | null;
  notes: string | null;
  isActive: boolean;
};

type ColorDto = {
  id?: string;
  ralCode: string | null;
  name: string;
  hex: string;
  rgbR: number;
  rgbG: number;
  rgbB: number;
};

type RoleDto = {
  id?: string;
  code: string;
  sortOrder: number;
  name: string;
  notes: string | null;
  isActive: boolean;
  isSystem: boolean;
};

type UserDto = {
  id?: string;
  login: string;
  password: string; // plain; adapter hashes if creating
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
};

type WorkTypeDto = {
  id?: string;
  name: string;
  shortLabel: string;
  hourlyRateRub: number;
  isActive: boolean;
};

type SurfaceFinishDto = {
  id?: string;
  finishType: string;
  roughnessClass: string;
  raMicron: number | null;
};

type CoatingDto = {
  id?: string;
  coatingType: string;
  coatingSpec: string;
  thicknessMicron: number | null;
};

type GeometryDto = {
  id?: string;
  name: string;
  shapeKey: string;
  heightMm: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  diameterMm: number | null;
  thicknessMm: number | null;
  notes: string | null;
  isActive: boolean;
};

type ClientDto = {
  id?: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  address: string;
  phone: string;
  email: string;
  notes: string | null;
  clientMarkupPercent: number | null;
  isActive: boolean;
  passportSeries: string;
  passportNumber: string;
  passportIssuedBy: string;
  passportIssuedDate: string;
};

type OrganizationDto = {
  id?: string;
  name: string;
  shortName: string | null;
  legalForm: string | null;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  okpo: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  legalAddress: string | null;
  postalAddress: string | null;
  bankName: string | null;
  bankBik: string | null;
  bankAccount: string | null;
  bankCorrAccount: string | null;
  signerName: string | null;
  signerPosition: string | null;
  notes: string | null;
  isActive: boolean;
};

type KpPhotoDto = {
  id?: string;
  name: string;
  organizationId: string;
  photoTitle: string;
  photoUrl: string;
  isActive: boolean;
};

type MaterialCharacteristicDto = {
  id?: string;
  name: string;
  code: string | null;
  densityKgM3: number | null;
  colorId: string | null;
  colorName: string | null;
  colorHex: string | null;
  surfaceFinishId: string | null;
  finishType: string | null;
  roughnessClass: string | null;
  raMicron: number | null;
  coatingId: string | null;
  coatingType: string | null;
  coatingSpec: string | null;
  coatingThicknessMicron: number | null;
  notes: string | null;
  isActive: boolean;
};

type MaterialDto = {
  id?: string;
  name: string;
  code: string | null;
  unitId: string | null;
  purchasePriceRub: number | null;
  materialCharacteristicId: string;
  geometryId: string;
  notes: string | null;
  isActive: boolean;
};

// Geometry parsing copied/simplified from the frontend logic:
// - extract numbers from "Параметры" compact format like "20×20×3×6000 мм" and legacy like "В 20 / Дл 30 / ..."
function tryParseCompactGeometryParams(raw: string, shapeKey: string): GeometryDto | null {
  let s = raw.trim();
  s = s.replace(/\s*мм\s*$/i, '').replace(/\s*mm\s*$/i, '').trim();
  if (!s) return null;
  const parts = s
    .split(/[×xXх\u00D7]/u)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const nums: number[] = [];
  for (const p of parts) {
    const cleaned = p.replace(/^[⌀Ø]\s*/u, '').replace(/^диам\.?\s*/i, '');
    const v = parseNumberOrNull(cleaned);
    if (v === null) return null;
    nums.push(v);
  }

  const n = nums;
  const as = {
    heightMm: null as number | null,
    lengthMm: null as number | null,
    widthMm: null as number | null,
    diameterMm: null as number | null,
    thicknessMm: null as number | null,
  };
  switch (shapeKey) {
    case 'rectangular':
      if (n.length === 4) {
        as.heightMm = n[0];
        as.widthMm = n[1];
        as.thicknessMm = n[2];
        as.lengthMm = n[3];
        return asToGeometry(shapeKey, as);
      }
      if (n.length === 3) {
        as.heightMm = n[0];
        as.widthMm = n[1];
        as.lengthMm = n[2];
        return asToGeometry(shapeKey, as);
      }
      return null;
    case 'tube':
      if (n.length === 3) {
        as.diameterMm = n[0];
        as.thicknessMm = n[1];
        as.lengthMm = n[2];
        return asToGeometry(shapeKey, as);
      }
      return null;
    case 'cylindrical':
      if (n.length === 2) {
        as.diameterMm = n[0];
        as.lengthMm = n[1];
        return asToGeometry(shapeKey, as);
      }
      return null;
    case 'plate':
      if (n.length === 3) {
        as.lengthMm = n[0];
        as.widthMm = n[1];
        as.thicknessMm = n[2];
        return asToGeometry(shapeKey, as);
      }
      return null;
    default:
      if (n.length === 0 || n.length > 5) return null;
      as.heightMm = n[0] ?? null;
      as.widthMm = n[1] ?? null;
      as.lengthMm = n[2] ?? null;
      as.diameterMm = n[3] ?? null;
      as.thicknessMm = n[4] ?? null;
      return asToGeometry(shapeKey, as);
  }
}

function asToGeometry(_shapeKey: string, as: {
  heightMm: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  diameterMm: number | null;
  thicknessMm: number | null;
}): GeometryDto {
  return {
    id: undefined,
    name: '',
    shapeKey: _shapeKey,
    notes: null,
    isActive: true,
    ...as,
  };
}

function parseGeometryParams(paramsRaw: string, shapeKey: string): Omit<GeometryDto, 'id' | 'name' | 'notes' | 'isActive' | 'shapeKey'> | null {
  const params = String(paramsRaw ?? '').trim();
  if (!params) return null;
  const lower = params;

  const extractNumber = (source: string, pattern: RegExp): number | null => {
    const match = pattern.exec(source);
    if (!match) return null;
    return parseNumberOrNull(match[1]);
  };

  let heightMm = extractNumber(lower, /В\s*([0-9.,-]+)/i);
  let lengthMm = extractNumber(lower, /Дл\s*([0-9.,-]+)/i);
  let widthMm = extractNumber(lower, /Ш\s*([0-9.,-]+)/i);
  let diameterMm = extractNumber(lower, /Диам\s*([0-9.,-]+)/i);
  let thicknessMm = extractNumber(lower, /Толщ\s*([0-9.,-]+)/i);

  const legacyAny = heightMm !== null || lengthMm !== null || widthMm !== null || diameterMm !== null || thicknessMm !== null;
  if (!legacyAny) {
    const c = tryParseCompactGeometryParams(params, shapeKey);
    if (c) {
      return {
        heightMm: c.heightMm,
        lengthMm: c.lengthMm,
        widthMm: c.widthMm,
        diameterMm: c.diameterMm,
        thicknessMm: c.thicknessMm,
      };
    }
  }

  const extractedAny = [heightMm, lengthMm, widthMm, diameterMm, thicknessMm].some((v) => v !== null);
  if (!extractedAny) return null;

  return {
    heightMm,
    lengthMm,
    widthMm,
    diameterMm,
    thicknessMm,
  };
}

function parseActiveOrDefault(raw: unknown, defaultValue: boolean): boolean {
  return parseBoolRu(raw, defaultValue);
}

const EXPECTED_SHAPES = new Set(['rectangular', 'cylindrical', 'tube', 'plate', 'custom']);

// -------------------- public API --------------------

const ADAPTERS_IN_IMPORT_ORDER: Array<Adapter<any>> = []; // filled below (needs prisma adapter types)

let adaptersInitialized = false;

function initAdapters(): void {
  if (adaptersInitialized) return;
  adaptersInitialized = true;

  const adapters: Array<Adapter<any>> = [];

  adapters.push({
    sheetName: 'Units',
    headers: ['ID', 'Название', 'Код', 'Комментарий'],
    templateSampleRows: [{ ID: '', Название: 'шт', Код: 'pcs', Комментарий: 'Штуки' }],
    parseRow: (raw, excelRow) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const idMaybe = parseUuid(raw['ID']);
      const id = idMaybe ?? undefined;
      const name = sTrim(raw['Название']);
      const code = sTrim(raw['Код']);
      const notes = sTrim(raw['Комментарий']);
      if (!name) {
        errors.push({ excelRow, field: 'Название', message: 'Название обязательно.' });
      }
      if (!code || code.length < 2) {
        errors.push({ excelRow, field: 'Код', message: 'Код обязателен (>= 2 символов).' });
      }
      if (errors.length) return { ok: false, skipped: true, warnings, errors };
      return {
        ok: true,
        dto: { id, name, code: code || null, notes: notes || null, isActive: true } satisfies UnitDto,
        warnings,
      };
    },
    upsert: async (dtos, report, ctx) => {
      const existing = await ctx.prismaTx.unit.findMany({
        where: { id: { in: dtos.map((d) => (d.id ? d.id : null)).filter(Boolean) as string[] } },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((x) => x.id));

      for (const dto of dtos) {
        const isCreate = !dto.id || !existingIds.has(dto.id);
        try {
          if (isCreate) {
            const row = await ctx.prismaTx.unit.create({
              data: { name: dto.name, code: dto.code, notes: dto.notes, isActive: dto.isActive },
            });
            if (row) report.created += 1;
          } else {
            await ctx.prismaTx.unit.update({
              where: { id: dto.id },
              data: { name: dto.name, code: dto.code, notes: dto.notes, isActive: dto.isActive },
            });
            report.updated += 1;
          }
        } catch (err: any) {
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте units' });
          report.skipped += 1;
        }
      }
    },
  });

  adapters.push({
    sheetName: 'Colors',
    headers: ['ID', 'RAL', 'Название', 'HEX', 'RGB'],
    templateSampleRows: [{ ID: '', RAL: 'RAL 7035', Название: 'Light grey', HEX: '#CBD0CC', RGB: '203,208,204' }],
    parseRow: (raw, excelRow) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const ralRaw = sTrim(raw['RAL']);
      const ralCode = normalizeRalCode(ralRaw) ?? null;
      const name = sTrim(raw['Название']);
      const hex = sTrim(raw['HEX']);
      const rgb = parseRgbCsv(raw['RGB']);
      if (!name) errors.push({ excelRow, field: 'Название', message: 'Название обязательно.' });
      if (!hex) errors.push({ excelRow, field: 'HEX', message: 'HEX обязателен.' });
      if (!rgb) errors.push({ excelRow, field: 'RGB', message: 'RGB должен быть вида "r,g,b" (0..255).' });
      if (errors.length) return { ok: false, skipped: true, warnings, errors };
      return { ok: true, dto: { id, ralCode, name, hex, rgbR: rgb!.r, rgbG: rgb!.g, rgbB: rgb!.b } satisfies ColorDto, warnings };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length
        ? await ctx.prismaTx.color.findMany({ where: { id: { in: ids } }, select: { id: true } })
        : [];
      const existingIds = new Set(existing.map((x) => x.id));

      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.color.create({
              data: {
                ralCode: dto.ralCode,
                name: dto.name,
                hex: dto.hex,
                rgbR: dto.rgbR,
                rgbG: dto.rgbG,
                rgbB: dto.rgbB,
              },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.color.update({
              where: { id: dto.id },
              data: {
                ralCode: dto.ralCode,
                name: dto.name,
                hex: dto.hex,
                rgbR: dto.rgbR,
                rgbG: dto.rgbG,
                rgbB: dto.rgbB,
              },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте colors' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'Roles',
    headers: ['ID', 'Код', 'Порядок', 'Название', 'Заметка', 'Активна'],
    templateSampleRows: [{ ID: '', Код: '', 'Порядок': 6, Название: 'Менеджер продаж', Заметка: 'Код можно не заполнять', Активна: 'Да' }],
    parseRow: (raw, excelRow, ctx) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;

      const sortRaw = parseIntOrNull(raw['Порядок']);
      const name = sTrim(raw['Название']);
      let code = sTrim(raw['Код']);
      const notes = sTrim(raw['Заметка']);
      const isActive = parseActiveOrDefault(raw['Активна'], true);
      if (sortRaw === null || sortRaw < 1 || sortRaw > 999_999) {
        errors.push({ excelRow, field: 'Порядок', message: 'Порядок — целое число 1..999999.' });
      }
      if (!name || name.length < 2) errors.push({ excelRow, field: 'Название', message: 'Название — минимум 2 символа.' });
      if (errors.length) return { ok: false, skipped: true, warnings, errors };

      const takenLower = ctx.existingRoleCodesLower ?? new Set<string>();
      if (!code) {
        const base = slugifyRoleCodeFromName(name);
        code = allocateUniqueRoleCode(base, takenLower);
      }
      if (code) {
        const codeRe = /^[a-zA-Z][a-zA-Z0-9_]*$/;
        if (!codeRe.test(code) || code.length < 2) {
          errors.push({ excelRow, field: 'Код', message: 'Код: латиница, начинается с буквы, далее буквы/цифры/_ (>=2).' });
        }
        if (code.trim().toLowerCase() === 'admin') {
          const adminId = ctx.roleCodeToId?.get('admin');
          if (id && adminId && id === adminId) {
            warnings.push({
              excelRow,
              field: 'Код',
              message: 'Код "admin" зарезервирован: строка пропущена (системная роль уже есть в БД).',
            });
            return { ok: false, skipped: true, warnings, errors: [] };
          }
          errors.push({ excelRow, field: 'Код', message: 'Код "admin" зарезервирован.' });
        }
      }
      if (errors.length) return { ok: false, skipped: true, warnings, errors };
      return {
        ok: true,
        dto: { id, code: code!, sortOrder: sortRaw!, name, notes: notes || null, isActive, isSystem: false } satisfies RoleDto,
        warnings,
      };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.role.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));
      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.role.create({
              data: {
                code: dto.code,
                name: dto.name,
                sortOrder: dto.sortOrder,
                notes: dto.notes,
                isActive: dto.isActive,
                isSystem: dto.isSystem,
              },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.role.update({
              where: { id: dto.id },
              data: {
                code: dto.code,
                name: dto.name,
                sortOrder: dto.sortOrder,
                notes: dto.notes,
                isActive: dto.isActive,
                isSystem: dto.isSystem,
              },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте roles' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'Users',
    headers: ['ID', 'Логин', 'ФИО', 'Email', 'Телефон', 'Код роли', 'Пароль'],
    templateSampleRows: [
      {
        ID: '',
        Логин: 'ivanov',
        ФИО: 'Иванов Иван',
        Email: 'ivanov@example.local',
        Телефон: '+79001234567',
        'Код роли': 'editor',
        Пароль: 'ChangeMe1',
      },
    ],
    parseRow: (raw, excelRow, ctx) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const login = sTrim(raw['Логин']);
      const fullName = sTrim(raw['ФИО']);
      const email = sTrim(raw['Email']);
      const phone = sTrim(raw['Телефон']);
      const roleCode = sTrim(raw['Код роли']);
      const passwordRaw = sTrim(raw['Пароль']);
      const password = passwordRaw === '***' ? '' : passwordRaw;
      if (!login || login.length < 2) errors.push({ excelRow, field: 'Логин', message: 'Логин обязателен (>=2).' });
      if (!fullName || fullName.length < 2) errors.push({ excelRow, field: 'ФИО', message: 'ФИО — минимум 2 символа.' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ excelRow, field: 'Email', message: 'Некорректный email.' });
      if (!roleCode) errors.push({ excelRow, field: 'Код роли', message: 'Укажите код роли.' });
      const roleId = roleCode && ctx.roleCodeToId ? ctx.roleCodeToId.get(roleCode.trim().toLowerCase()) : undefined;
      if (!roleId) errors.push({ excelRow, field: 'Код роли', message: 'Неизвестный код роли.' });
      if (errors.length) return { ok: false, skipped: true, warnings, errors };
      return {
        ok: true,
        dto: { id, login, password, fullName, email, phone, roleId: roleId! } satisfies UserDto,
        warnings,
      };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existingRows = ids.length
        ? await ctx.prismaTx.user.findMany({ where: { id: { in: ids } }, select: { id: true, passwordHash: true } })
        : [];
      const existingById = new Map(existingRows.map((r) => [r.id, r]));

      for (const dto of dtos) {
        try {
          const existing = dto.id ? existingById.get(dto.id) : undefined;
          const isCreate = !existing;

          if (isCreate) {
            if (!dto.password || dto.password.length < 4) {
              report.errors.push({
                excelRow: (dto as any).__excelRow ?? 0,
                field: 'Пароль',
                message: 'Пароль обязателен для создания пользователя (>=4).',
              });
              report.skipped += 1;
              continue;
            }
            const passwordHash = await bcrypt.hash(dto.password, 10);
            await ctx.prismaTx.user.create({
              data: {
                login: dto.login,
                passwordHash,
                fullName: dto.fullName,
                email: dto.email,
                phone: dto.phone,
                roleId: dto.roleId,
              },
            });
            report.created += 1;
          } else {
            const data: any = {
              login: dto.login,
              fullName: dto.fullName,
              email: dto.email,
              phone: dto.phone,
              roleId: dto.roleId,
            };
            if (dto.password && dto.password.trim().length > 0 && dto.password !== '***') {
              data.passwordHash = await bcrypt.hash(dto.password, 10);
            }
            await ctx.prismaTx.user.update({ where: { id: existing.id }, data });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте users' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'WorkTypes',
    headers: ['ID', 'Наименование', 'Короткое обозначение', 'Ставка руб/ч', 'Активна'],
    templateSampleRows: [
      {
        ID: '',
        Наименование: 'Сварка',
        'Короткое обозначение': 'Св.',
        'Ставка руб/ч': 600,
        Активна: 'Да',
      },
    ],
    parseRow: (raw, excelRow) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const name = sTrim(raw['Наименование']);
      const shortLabel = sTrim(raw['Короткое обозначение']);
      const rateRaw = parseNumberOrNull(raw['Ставка руб/ч']);
      const isActive = parseActiveOrDefault(raw['Активна'], true);
      if (!name || name.length < 2) errors.push({ excelRow, field: 'Наименование', message: 'Наименование — минимум 2 символа.' });
      if (!shortLabel) errors.push({ excelRow, field: 'Короткое обозначение', message: 'Укажите обозначение.' });
      if (rateRaw === null || !Number.isFinite(rateRaw) || rateRaw < 1) errors.push({ excelRow, field: 'Ставка руб/ч', message: 'Ставка должна быть числом >=1.' });
      if (errors.length) return { ok: false, skipped: true, warnings, errors };
      return { ok: true, dto: { id, name, shortLabel, hourlyRateRub: Math.round(rateRaw!), isActive } satisfies WorkTypeDto, warnings };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.productionWorkType.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));
      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.productionWorkType.create({
              data: { name: dto.name, shortLabel: dto.shortLabel, hourlyRateRub: dto.hourlyRateRub, isActive: dto.isActive },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.productionWorkType.update({
              where: { id: dto.id },
              data: { name: dto.name, shortLabel: dto.shortLabel, hourlyRateRub: dto.hourlyRateRub, isActive: dto.isActive },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте workTypes' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'Geometries',
    headers: ['ID', 'Название', 'Тип', 'Параметры'],
    templateSampleRows: [{ ID: '', Название: 'Круглая труба', Тип: 'tube', Параметры: '⌀32×2×6000 мм' }],
    parseRow: (raw, excelRow) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const name = sTrim(raw['Название']);
      const shapeKey = sTrim(raw['Тип']).toLowerCase();
      const paramsRaw = sTrim(raw['Параметры']);
      if (!name) errors.push({ excelRow, field: 'Название', message: 'Название обязательно.' });
      if (!paramsRaw) errors.push({ excelRow, field: 'Параметры', message: 'Параметры обязательны.' });
      if (shapeKey && !EXPECTED_SHAPES.has(shapeKey)) {
        errors.push({ excelRow, field: 'Тип', message: `Тип должен быть одним из: ${Array.from(EXPECTED_SHAPES).join(', ')}` });
      }
      if (errors.length) return { ok: false, skipped: true, warnings, errors };

      const parsed = parseGeometryParams(paramsRaw, shapeKey);
      const extractedAny = parsed
        ? [parsed.heightMm, parsed.lengthMm, parsed.widthMm, parsed.diameterMm, parsed.thicknessMm].some((v) => v !== null)
        : false;
      if (!parsed || !extractedAny) {
        errors.push({ excelRow, field: 'Параметры', message: 'Параметры не распознаны. Используйте формат из шаблона.' });
        return { ok: false, skipped: true, warnings, errors };
      }

      const nonNegative = (v: number | null) => v === null || v >= 0;
      if (![parsed.heightMm, parsed.lengthMm, parsed.widthMm, parsed.diameterMm, parsed.thicknessMm].every(nonNegative)) {
        errors.push({ excelRow, field: 'Параметры', message: 'Параметры должны быть >=0.' });
        return { ok: false, skipped: true, warnings, errors };
      }

      // Require per-shape fields (same as frontend).
      const requireIf = (cond: boolean, msg: string) => {
        if (!cond) errors.push({ excelRow, field: 'Параметры', message: msg });
      };
      if (shapeKey === 'rectangular') {
        requireIf(parsed.heightMm !== null, 'Для rectangular нужны В.');
        requireIf(parsed.lengthMm !== null, 'Для rectangular нужны Дл.');
        requireIf(parsed.widthMm !== null, 'Для rectangular нужны Ш.');
      } else if (shapeKey === 'cylindrical') {
        requireIf(parsed.diameterMm !== null, 'Для cylindrical нужны Диам.');
        requireIf(parsed.lengthMm !== null, 'Для cylindrical нужны Дл.');
      } else if (shapeKey === 'tube') {
        requireIf(parsed.diameterMm !== null, 'Для tube нужны Диам.');
        requireIf(parsed.lengthMm !== null, 'Для tube нужны Дл.');
        requireIf(parsed.thicknessMm !== null, 'Для tube нужны Толщ.');
      } else if (shapeKey === 'plate') {
        requireIf(parsed.lengthMm !== null, 'Для plate нужны Дл.');
        requireIf(parsed.widthMm !== null, 'Для plate нужны Ш.');
        requireIf(parsed.thicknessMm !== null, 'Для plate нужны Толщ.');
      }
      if (errors.length) return { ok: false, skipped: true, warnings, errors };

      return {
        ok: true,
        dto: {
          id,
          name,
          shapeKey,
          heightMm: parsed.heightMm,
          lengthMm: parsed.lengthMm,
          widthMm: parsed.widthMm,
          diameterMm: parsed.diameterMm,
          thicknessMm: parsed.thicknessMm,
          notes: null,
          isActive: true,
        } satisfies GeometryDto,
        warnings,
      };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.geometry.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));

      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.geometry.create({
              data: {
                name: dto.name,
                shapeKey: dto.shapeKey,
                heightMm: dto.heightMm,
                lengthMm: dto.lengthMm,
                widthMm: dto.widthMm,
                diameterMm: dto.diameterMm,
                thicknessMm: dto.thicknessMm,
                notes: dto.notes,
                isActive: true,
              },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.geometry.update({
              where: { id: dto.id },
              data: {
                name: dto.name,
                shapeKey: dto.shapeKey,
                heightMm: dto.heightMm,
                lengthMm: dto.lengthMm,
                widthMm: dto.widthMm,
                diameterMm: dto.diameterMm,
                thicknessMm: dto.thicknessMm,
                notes: dto.notes,
                isActive: true,
              },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте geometries' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'SurfaceFinishes',
    headers: ['ID', 'Тип финиша', 'Шероховатость', 'Ra, мкм'],
    templateSampleRows: [{ ID: '', 'Тип финиша': 'Matte', Шероховатость: 'Ra 3.2', 'Ra, мкм': 3.2 }],
    parseRow: (raw, excelRow) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const finishType = sTrim(raw['Тип финиша']);
      const roughnessClass = sTrim(raw['Шероховатость']);
      const raMicron = parseRuFloatOrNull(raw['Ra, мкм']);
      if (!finishType) errors.push({ excelRow, field: 'Тип финиша', message: 'Тип финиша обязателен.' });
      if (!roughnessClass) errors.push({ excelRow, field: 'Шероховатость', message: 'Шероховатость обязателна.' });
      if (raMicron === null) errors.push({ excelRow, field: 'Ra, мкм', message: 'Ra, мкм обязателен (число).' });
      if (raMicron !== null && raMicron < 0) errors.push({ excelRow, field: 'Ra, мкм', message: 'Ra, мкм должно быть >= 0.' });
      if (errors.length) return { ok: false, skipped: true, warnings, errors };
      return { ok: true, dto: { id, finishType, roughnessClass, raMicron } satisfies SurfaceFinishDto, warnings };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.surfaceFinish.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));
      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.surfaceFinish.create({
              data: { finishType: dto.finishType, roughnessClass: dto.roughnessClass, raMicron: dto.raMicron },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.surfaceFinish.update({
              where: { id: dto.id },
              data: { finishType: dto.finishType, roughnessClass: dto.roughnessClass, raMicron: dto.raMicron },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте surfaceFinishes' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'Coatings',
    headers: ['ID', 'Тип покрытия', 'Спецификация', 'Толщина, мкм'],
    templateSampleRows: [{ ID: '', 'Тип покрытия': 'Anodizing', Спецификация: 'Clear anodized', 'Толщина, мкм': 20 }],
    parseRow: (raw, excelRow) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const coatingType = sTrim(raw['Тип покрытия']);
      const coatingSpec = sTrim(raw['Спецификация']);
      const thicknessMicron = parseRuFloatOrNull(raw['Толщина, мкм']);
      if (!coatingType) errors.push({ excelRow, field: 'Тип покрытия', message: 'Тип покрытия обязателен.' });
      if (!coatingSpec) errors.push({ excelRow, field: 'Спецификация', message: 'Спецификация обязателна.' });
      if (thicknessMicron === null) errors.push({ excelRow, field: 'Толщина, мкм', message: 'Толщина, мкм обязательна (число).' });
      if (thicknessMicron !== null && thicknessMicron < 0) errors.push({ excelRow, field: 'Толщина, мкм', message: 'Толщина должна быть >= 0.' });
      if (errors.length) return { ok: false, skipped: true, warnings, errors };
      return { ok: true, dto: { id, coatingType, coatingSpec, thicknessMicron } satisfies CoatingDto, warnings };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.coating.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));
      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.coating.create({
              data: { coatingType: dto.coatingType, coatingSpec: dto.coatingSpec, thicknessMicron: dto.thicknessMicron },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.coating.update({
              where: { id: dto.id },
              data: { coatingType: dto.coatingType, coatingSpec: dto.coatingSpec, thicknessMicron: dto.thicknessMicron },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте coatings' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'Clients',
    headers: [
      'ID',
      'Фамилия',
      'Имя',
      'Отчество',
      'Адрес',
      'Телефон',
      'Email',
      'Активен',
      'Заметки',
      'Паспорт серия',
      'Паспорт номер',
      'Кем выдан',
      'Дата выдачи',
    ],
    templateSampleRows: [
      {
        ID: '',
        Фамилия: 'Иванов',
        Имя: 'Пётр',
        Отчество: 'Сергеевич',
        Адрес: 'Москва, ул. Примерная, д. 1',
        Телефон: '+7 900 000-00-00',
        Email: 'contact@example.test',
        Активен: 'да',
        Заметки: '',
        'Паспорт серия': '',
        'Паспорт номер': '',
        'Кем выдан': '',
        'Дата выдачи': '',
      },
    ],
    parseRow: (raw, excelRow) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const lastName = sTrim(raw['Фамилия']);
      const firstName = sTrim(raw['Имя']);
      const patronymic = sTrim(raw['Отчество']);
      const address = sTrim(raw['Адрес']);
      const phone = sTrim(raw['Телефон']);
      const email = sTrim(raw['Email']);
      const active = parseActiveOrDefault(raw['Активен'], true);
      const notes = sTrim(raw['Заметки']);
      const passportSeries = sTrim(raw['Паспорт серия']);
      const passportNumber = sTrim(raw['Паспорт номер']);
      const passportIssuedBy = sTrim(raw['Кем выдан']);
      const passportIssuedDate = sTrim(raw['Дата выдачи']);

      if (!lastName) errors.push({ excelRow, field: 'Фамилия', message: 'Фамилия обязательна.' });
      if (!firstName) errors.push({ excelRow, field: 'Имя', message: 'Имя обязательна.' });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ excelRow, field: 'Email', message: 'Проверьте формат email.' });
      if (errors.length) return { ok: false, skipped: true, warnings, errors };

      return {
        ok: true,
        dto: {
          id,
          lastName,
          firstName,
          patronymic,
          address,
          phone,
          email,
          notes: notes || null,
          clientMarkupPercent: null,
          isActive: active,
          passportSeries,
          passportNumber,
          passportIssuedBy,
          passportIssuedDate,
        } satisfies ClientDto,
        warnings,
      };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.client.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));
      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.client.create({
              data: {
                lastName: dto.lastName,
                firstName: dto.firstName,
                patronymic: dto.patronymic,
                phone: dto.phone,
                address: dto.address,
                email: dto.email,
                notes: dto.notes ?? '',
                clientMarkupPercent: dto.clientMarkupPercent,
                isActive: dto.isActive,
                passportSeries: dto.passportSeries ?? '',
                passportNumber: dto.passportNumber ?? '',
                passportIssuedBy: dto.passportIssuedBy ?? '',
                passportIssuedDate: dto.passportIssuedDate ?? '',
              },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.client.update({
              where: { id: dto.id },
              data: {
                lastName: dto.lastName,
                firstName: dto.firstName,
                patronymic: dto.patronymic,
                phone: dto.phone,
                address: dto.address,
                email: dto.email,
                notes: dto.notes ?? '',
                clientMarkupPercent: dto.clientMarkupPercent,
                isActive: dto.isActive,
                passportSeries: dto.passportSeries ?? '',
                passportNumber: dto.passportNumber ?? '',
                passportIssuedBy: dto.passportIssuedBy ?? '',
                passportIssuedDate: dto.passportIssuedDate ?? '',
              },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте clients' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'Organizations',
    headers: [
      'ID',
      'Вид организации',
      'Полное наименование',
      'Короткое наименование',
      'ИНН',
      'КПП',
      'ОГРН',
      'ОКПО',
      'Телефон',
      'Email',
      'Сайт',
      'Юридический адрес',
      'Почтовый адрес',
      'Банк',
      'БИК',
      'Расчётный счёт',
      'Корр. счёт',
      'Подписант',
      'Должность подписанта',
      'Заметки',
      'Активен',
    ],
    templateSampleRows: [
      {
        ID: '',
        'Вид организации': 'ООО',
        'Полное наименование': 'ООО «Пример Производство»',
        'Короткое наименование': 'ООО «Пример»',
        ИНН: '7701234567',
        КПП: '770101001',
        ОГРН: '1237700001112',
        ОКПО: '12345678',
        Телефон: '+7 495 111-22-33',
        Email: 'office@example.test',
        Сайт: 'https://example.test',
        'Юридический адрес': 'г. Москва, ул. Производственная, д. 10',
        'Почтовый адрес': 'г. Москва, а/я 15',
        Банк: 'ПАО Сбербанк',
        БИК: '044525225',
        'Расчётный счёт': '40702810900000000001',
        'Корр. счёт': '30101810400000000225',
        Подписант: 'Иванов Пётр Сергеевич',
        'Должность подписанта': 'Генеральный директор',
        Заметки: '',
        Активен: 'да',
      },
    ],
    parseRow: (raw, excelRow) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const kindRaw = sTrim(raw['Вид организации']);
      const name = sTrim(raw['Полное наименование']);
      const shortName = sTrim(raw['Короткое наименование']);
      const inn = sTrim(raw['ИНН']);
      const kpp = sTrim(raw['КПП']);
      const ogrn = sTrim(raw['ОГРН']);
      const okpo = sTrim(raw['ОКПО']);
      const phone = sTrim(raw['Телефон']);
      const email = sTrim(raw['Email']);
      const website = sTrim(raw['Сайт']);
      const legalAddress = sTrim(raw['Юридический адрес']);
      const postalAddress = sTrim(raw['Почтовый адрес']);
      const bankName = sTrim(raw['Банк']);
      const bankBik = sTrim(raw['БИК']);
      const bankAccount = sTrim(raw['Расчётный счёт']);
      const bankCorrAccount = sTrim(raw['Корр. счёт']);
      const signerName = sTrim(raw['Подписант']);
      const signerPosition = sTrim(raw['Должность подписанта']);
      const notes = sTrim(raw['Заметки']);
      const active = parseActiveOrDefault(raw['Активен'], true);

      if (!kindRaw) errors.push({ excelRow, field: 'Вид организации', message: 'Укажите вид организации.' });
      if (!name || name.length < 2) errors.push({ excelRow, field: 'Полное наименование', message: 'Полное наименование — минимум 2 символа.' });

      const legalForm = kindRaw.toUpperCase().includes('ИП') || kindRaw.toUpperCase() === 'IP' ? 'ИП' : 'ООО';
      if (legalForm === 'ИП' && kpp) {
        // For IP, KPIП не нужен.
        warnings.push({
          excelRow,
          field: 'КПП',
          message: 'Для ИП КПП обычно пустой — поле будет проигнорировано.',
        });
      }

      if (errors.length) return { ok: false, skipped: true, warnings, errors };

      const nullIfBlank = (v: string): string | null => (v ? v : null);
      return {
        ok: true,
        dto: {
          id,
          name,
          shortName: nullIfBlank(shortName),
          legalForm,
          inn: nullIfBlank(inn),
          kpp: legalForm === 'ИП' ? null : nullIfBlank(kpp),
          ogrn: nullIfBlank(ogrn),
          okpo: nullIfBlank(okpo),
          phone: nullIfBlank(phone),
          email: nullIfBlank(email),
          website: nullIfBlank(website),
          legalAddress: nullIfBlank(legalAddress),
          postalAddress: nullIfBlank(postalAddress),
          bankName: nullIfBlank(bankName),
          bankBik: nullIfBlank(bankBik),
          bankAccount: nullIfBlank(bankAccount),
          bankCorrAccount: nullIfBlank(bankCorrAccount),
          signerName: nullIfBlank(signerName),
          signerPosition: nullIfBlank(signerPosition),
          notes: nullIfBlank(notes),
          isActive: active,
        } satisfies OrganizationDto,
        warnings,
      };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.organization.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));
      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          const contacts = { create: [] as any[] };
          if (isCreate) {
            await ctx.prismaTx.organization.create({
              data: {
                name: dto.name,
                shortName: dto.shortName,
                legalForm: dto.legalForm,
                inn: dto.inn,
                kpp: dto.kpp,
                ogrn: dto.ogrn,
                okpo: dto.okpo,
                phone: dto.phone,
                email: dto.email,
                website: dto.website,
                legalAddress: dto.legalAddress,
                postalAddress: dto.postalAddress,
                bankName: dto.bankName,
                bankBik: dto.bankBik,
                bankAccount: dto.bankAccount,
                bankCorrAccount: dto.bankCorrAccount,
                signerName: dto.signerName,
                signerPosition: dto.signerPosition,
                notes: dto.notes,
                isActive: dto.isActive,
                contacts: contacts,
              },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.organization.update({
              where: { id: dto.id },
              data: {
                name: dto.name,
                shortName: dto.shortName,
                legalForm: dto.legalForm,
                inn: dto.inn,
                kpp: dto.kpp,
                ogrn: dto.ogrn,
                okpo: dto.okpo,
                phone: dto.phone,
                email: dto.email,
                website: dto.website,
                legalAddress: dto.legalAddress,
                postalAddress: dto.postalAddress,
                bankName: dto.bankName,
                bankBik: dto.bankBik,
                bankAccount: dto.bankAccount,
                bankCorrAccount: dto.bankCorrAccount,
                signerName: dto.signerName,
                signerPosition: dto.signerPosition,
                notes: dto.notes,
                isActive: dto.isActive,
                contacts: { deleteMany: {}, create: [] },
              },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте organizations' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'KpPhotos',
    headers: ['ID', 'Название', 'ID организации', 'Название фото', 'URL фото', 'Активен'],
    templateSampleRows: [{ ID: '', Название: 'Фон 1', 'ID организации': '', 'Название фото': 'Вид 1', 'URL фото': '', Активен: 'да' }],
    parseRow: (raw, excelRow, ctx) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const name = sTrim(raw['Название']);
      const organizationId = parseUuid(raw['ID организации']);
      const photoTitle = sTrim(raw['Название фото']);
      const photoUrl = sTrim(raw['URL фото']);
      const isActive = parseActiveOrDefault(raw['Активен'], true);
      if (!name) errors.push({ excelRow, field: 'Название', message: 'Название обязательно.' });
      if (!organizationId) errors.push({ excelRow, field: 'ID организации', message: 'ID организации должен быть UUID.' });
      const orgCache = ctx.existingByIdCache?.organization;
      if (organizationId && orgCache && !orgCache.has(organizationId)) {
        errors.push({ excelRow, field: 'ID организации', message: 'Не найдена организация с указанным ID.' });
      }
      if (!photoTitle) errors.push({ excelRow, field: 'Название фото', message: 'Название фото обязательно.' });
      if (!photoUrl) errors.push({ excelRow, field: 'URL фото', message: 'URL фото обязателен.' });
      if (errors.length) return { ok: false, skipped: true, warnings, errors };
      return {
        ok: true,
        dto: { id, name, organizationId: organizationId!, photoTitle, photoUrl, isActive } satisfies KpPhotoDto,
        warnings,
      };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.kpPhoto.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));
      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.kpPhoto.create({
              data: { name: dto.name, organizationId: dto.organizationId, photoTitle: dto.photoTitle, photoUrl: dto.photoUrl, isActive: dto.isActive },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.kpPhoto.update({
              where: { id: dto.id },
              data: { name: dto.name, organizationId: dto.organizationId, photoTitle: dto.photoTitle, photoUrl: dto.photoUrl, isActive: dto.isActive },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте kpPhotos' });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'MaterialCharacteristics',
    headers: [
      'ID',
      'Название',
      'Код',
      'Плотность кг/м³',
      'ID цвета',
      'Название цвета',
      'HEX цвета',
      'ID отделки',
      'Название отделки',
      'Тип отделки',
      'Шероховатость',
      'Ra мкм',
      'ID покрытия',
      'Название покрытия',
      'Тип покрытия',
      'Спецификация покрытия',
      'Толщина покрытия мкм',
      'Заметки',
      'Активен',
    ],
    templateSampleRows: [
      {
        ID: '',
        Название: 'Профиль 09Г2С · RAL 7035',
        Код: 'MC-ST-7035',
        'Плотность кг/м³': 7850,
        'ID цвета': '',
        'Название цвета': '',
        'HEX цвета': '',
        'ID отделки': '',
        'Название отделки': '',
        'Тип отделки': '',
        Шероховатость: '',
        'Ra мкм': '',
        'ID покрытия': '',
        'Название покрытия': '',
        'Тип покрытия': '',
        'Спецификация покрытия': '',
        'Толщина покрытия мкм': '',
        Заметки: '',
        Активен: 'да',
      },
    ],
    parseRow: (raw, excelRow, ctx) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];
      const id = parseUuid(raw['ID']) ?? undefined;
      const name = sTrim(raw['Название']);
      const code = sTrim(raw['Код']);
      const densityKgM3 = parseRuFloatOrNull(raw['Плотность кг/м³'], true);
      const colorId = parseUuid(raw['ID цвета']);
      const colorName = sTrim(raw['Название цвета']) || null;
      const colorHex = sTrim(raw['HEX цвета']) || null;
      const surfaceFinishId = parseUuid(raw['ID отделки']);
      const finishType = sTrim(raw['Тип отделки']) || null;
      const roughnessClass = sTrim(raw['Шероховатость']) || null;
      const raMicron = parseRuFloatOrNull(raw['Ra мкм'], true);
      const coatingId = parseUuid(raw['ID покрытия']);
      const coatingType = sTrim(raw['Тип покрытия']) || null;
      const coatingSpec = sTrim(raw['Спецификация покрытия']) || null;
      const coatingThicknessMicron = parseRuFloatOrNull(raw['Толщина покрытия мкм'], true);
      const notes = sTrim(raw['Заметки']) || null;
      const isActive = parseActiveOrDefault(raw['Активен'], true);

      if (!name) errors.push({ excelRow, field: 'Название', message: 'Название обязательно.' });
      if (densityKgM3 !== null && densityKgM3 < 0) errors.push({ excelRow, field: 'Плотность', message: 'Плотность должна быть >= 0.' });
      if (raMicron !== null && raMicron < 0) errors.push({ excelRow, field: 'Ra мкм', message: 'Ra мкм должно быть >= 0.' });
      if (coatingThicknessMicron !== null && coatingThicknessMicron < 0) errors.push({ excelRow, field: 'Толщина покрытия мкм', message: 'Толщина покрытия должна быть >= 0.' });

      if (colorId) {
        const cache = ctx.existingByIdCache?.color;
        if (cache && !cache.has(colorId)) errors.push({ excelRow, field: 'ID цвета', message: 'Не найдена запись цвета с указанным ID.' });
      }
      if (surfaceFinishId) {
        const cache = ctx.existingByIdCache?.surfaceFinish;
        if (cache && !cache.has(surfaceFinishId)) {
          errors.push({ excelRow, field: 'ID отделки', message: 'Не найдена запись отделки с указанным ID.' });
        }
      }
      if (coatingId) {
        const cache = ctx.existingByIdCache?.coating;
        if (cache && !cache.has(coatingId)) errors.push({ excelRow, field: 'ID покрытия', message: 'Не найдена запись покрытия с указанным ID.' });
      }
      if (errors.length) return { ok: false, skipped: true, warnings, errors };

      return {
        ok: true,
        dto: {
          id,
          name,
          code: code || null,
          densityKgM3,
          colorId,
          colorName,
          colorHex,
          surfaceFinishId,
          finishType,
          roughnessClass,
          raMicron,
          coatingId,
          coatingType,
          coatingSpec,
          coatingThicknessMicron,
          notes,
          isActive,
        } satisfies MaterialCharacteristicDto,
        warnings,
      };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.materialCharacteristic.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));
      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.materialCharacteristic.create({
              data: {
                name: dto.name,
                code: dto.code,
                densityKgM3: dto.densityKgM3,
                colorId: dto.colorId,
                colorName: dto.colorName,
                colorHex: dto.colorHex,
                surfaceFinishId: dto.surfaceFinishId,
                finishType: dto.finishType,
                roughnessClass: dto.roughnessClass,
                raMicron: dto.raMicron,
                coatingId: dto.coatingId,
                coatingType: dto.coatingType,
                coatingSpec: dto.coatingSpec,
                coatingThicknessMicron: dto.coatingThicknessMicron,
                notes: dto.notes,
                isActive: dto.isActive,
              },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.materialCharacteristic.update({
              where: { id: dto.id },
              data: {
                name: dto.name,
                code: dto.code,
                densityKgM3: dto.densityKgM3,
                colorId: dto.colorId,
                colorName: dto.colorName,
                colorHex: dto.colorHex,
                surfaceFinishId: dto.surfaceFinishId,
                finishType: dto.finishType,
                roughnessClass: dto.roughnessClass,
                raMicron: dto.raMicron,
                coatingId: dto.coatingId,
                coatingType: dto.coatingType,
                coatingSpec: dto.coatingSpec,
                coatingThicknessMicron: dto.coatingThicknessMicron,
                notes: dto.notes,
                isActive: dto.isActive,
              },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({
            excelRow: (dto as any).__excelRow ?? 0,
            message: 'DB error при импорте materialCharacteristics',
          });
        }
      }
    },
  });

  adapters.push({
    sheetName: 'Materials',
    headers: ['ID материала', 'Название', 'Код', 'ID характеристики', 'ID геометрии', 'ID единицы', 'Код ЕИ', 'Название единицы', 'Цена ₽', 'Заметки', 'Активен'],
    templateSampleRows: [
      {
        'ID материала': '',
        Название: 'Сталь 09Г2С — профиль 60×40',
        Код: 'POS-ST-6040',
        'ID характеристики': '',
        'Код характеристики': '',
        'Название характеристики': '',
        'ID геометрии': '',
        'Название геометрии': 'Профиль 60x40x2',
        'ID единицы': '',
        'Код ЕИ': 'kg',
        'Название единицы': '',
        'Цена ₽': 95,
        Заметки: '',
        Активен: 'да',
      },
    ],
    parseRow: (raw, excelRow, ctx) => {
      const warnings: ExcelSheetReport['warnings'] = [];
      const errors: ExcelSheetReport['errors'] = [];

      const id = parseUuid(raw['ID материала']) ?? undefined;
      const name = sTrim(raw['Название']);
      const code = sTrim(raw['Код']) || null;
      const materialCharacteristicId = parseUuid(raw['ID характеристики']);
      const geometryId = parseUuid(raw['ID геометрии']);
      const unitId = parseUuid(raw['ID единицы']);
      const purchasePriceRubRaw = parseNumberOrNull(raw['Цена ₽']);
      const notes = sTrim(raw['Заметки']) || null;
      const isActive = parseActiveOrDefault(raw['Активен'], true);

      if (!name) errors.push({ excelRow, field: 'Название', message: 'Название обязательно.' });
      if (!materialCharacteristicId) {
        errors.push({ excelRow, field: 'ID характеристики', message: 'ID характеристики должен быть UUID.' });
      }
      if (!geometryId) {
        errors.push({ excelRow, field: 'ID геометрии', message: 'ID геометрии должен быть UUID.' });
      }
      if (purchasePriceRubRaw === null || purchasePriceRubRaw < 1) errors.push({ excelRow, field: 'Цена ₽', message: 'Цена ₽ обязателена и должна быть >= 1.' });

      const matCharCache = ctx.existingByIdCache?.materialCharacteristic;
      if (materialCharacteristicId && matCharCache && !matCharCache.has(materialCharacteristicId)) {
        errors.push({ excelRow, field: 'ID характеристики', message: 'Не найдена характеристика материала с указанным ID.' });
      }

      const geomCache = ctx.existingByIdCache?.geometry;
      if (geometryId && geomCache && !geomCache.has(geometryId)) {
        errors.push({ excelRow, field: 'ID геометрии', message: 'Не найдена геометрия с указанным ID.' });
      }

      const unitCache = ctx.existingByIdCache?.unit;
      if (unitId && unitCache && !unitCache.has(unitId)) {
        errors.push({ excelRow, field: 'ID единицы', message: 'Не найдена единица измерения с указанным ID.' });
      }

      if (errors.length) return { ok: false, skipped: true, warnings, errors };

      return {
        ok: true,
        dto: {
          id,
          name,
          code,
          unitId,
          purchasePriceRub: purchasePriceRubRaw === null ? null : Math.round(purchasePriceRubRaw),
          materialCharacteristicId: materialCharacteristicId!,
          geometryId: geometryId!,
          notes,
          isActive,
        } satisfies MaterialDto,
        warnings,
      };
    },
    upsert: async (dtos, report, ctx) => {
      const ids = dtos.map((d) => d.id).filter(Boolean) as string[];
      const existing = ids.length ? await ctx.prismaTx.material.findMany({ where: { id: { in: ids } }, select: { id: true } }) : [];
      const existingIds = new Set(existing.map((x) => x.id));
      for (const dto of dtos) {
        try {
          const isCreate = !dto.id || !existingIds.has(dto.id);
          if (isCreate) {
            await ctx.prismaTx.material.create({
              data: {
                name: dto.name,
                code: dto.code,
                unitId: dto.unitId,
                purchasePriceRub: dto.purchasePriceRub,
                materialCharacteristicId: dto.materialCharacteristicId,
                geometryId: dto.geometryId,
                notes: dto.notes,
                isActive: dto.isActive,
              },
            });
            report.created += 1;
          } else {
            await ctx.prismaTx.material.update({
              where: { id: dto.id },
              data: {
                name: dto.name,
                code: dto.code,
                unitId: dto.unitId,
                purchasePriceRub: dto.purchasePriceRub,
                materialCharacteristicId: dto.materialCharacteristicId,
                geometryId: dto.geometryId,
                notes: dto.notes,
                isActive: dto.isActive,
              },
            });
            report.updated += 1;
          }
        } catch {
          report.skipped += 1;
          report.errors.push({ excelRow: (dto as any).__excelRow ?? 0, message: 'DB error при импорте materials' });
        }
      }
    },
  });

  ADAPTERS_IN_IMPORT_ORDER.push(...adapters);
}

function getAdapters(): Array<Adapter<any>> {
  initAdapters();
  return ADAPTERS_IN_IMPORT_ORDER;
}

function buildWorkbookFromAdapters(adapters: Array<Adapter<any>>, rowBuilder: (adapter: Adapter<any>) => Array<Record<string, unknown>>) {
  const workbook = XLSX.utils.book_new();
  for (const adapter of adapters) {
    const rows = rowBuilder(adapter);
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: adapter.headers as string[] });
    XLSX.utils.book_append_sheet(workbook, worksheet, excelSheetDisplayNameRu(adapter.sheetName));
  }
  return workbook;
}

export async function buildUnifiedExcelTemplateBuffer(): Promise<Buffer> {
  const adapters = getAdapters();
  const workbook = buildWorkbookFromAdapters(adapters, (adapter) => adapter.templateSampleRows);
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return normalizeXlsxBuffer(buf);
}

export async function buildUnifiedExcelExportBuffer(): Promise<Buffer> {
  const adapters = getAdapters();
  const workbook = XLSX.utils.book_new();

  for (const adapter of adapters) {
    let rows: Array<Record<string, unknown>> = [];
    switch (adapter.sheetName) {
      case 'Units': {
        const items = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          Название: x.name,
          Код: x.code ?? '',
          Комментарий: x.notes ?? '',
        }));
        break;
      }
      case 'Colors': {
        const items = await prisma.color.findMany({ orderBy: { name: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          RAL: x.ralCode ?? '',
          Название: x.name,
          HEX: x.hex,
          RGB: `${x.rgbR},${x.rgbG},${x.rgbB}`,
        }));
        break;
      }
      case 'Roles': {
        const items = await prisma.role.findMany({ orderBy: { sortOrder: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          Код: x.code,
          Порядок: x.sortOrder,
          Название: x.name,
          Заметка: x.notes ?? '',
          Активна: x.isActive ? 'Да' : 'Нет',
        }));
        break;
      }
      case 'Users': {
        const users = await prisma.user.findMany({ orderBy: { login: 'asc' } });
        const roles = await prisma.role.findMany({ select: { id: true, code: true } });
        const roleById = new Map(roles.map((r) => [r.id, r.code] as const));
        rows = users.map((u) => ({
          ID: u.id,
          Логин: u.login,
          ФИО: u.fullName,
          Email: u.email,
          Телефон: u.phone,
          'Код роли': roleById.get(u.roleId) ?? '',
          Пароль: '***',
        }));
        break;
      }
      case 'WorkTypes': {
        const items = await prisma.productionWorkType.findMany({ orderBy: { name: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          Наименование: x.name,
          'Короткое обозначение': x.shortLabel,
          'Ставка руб/ч': x.hourlyRateRub,
          Активна: x.isActive ? 'Да' : 'Нет',
        }));
        break;
      }
      case 'Geometries': {
        const items = await prisma.geometry.findMany({ orderBy: { name: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          Название: x.name,
          Тип: x.shapeKey,
          Параметры: [
            x.heightMm != null ? `В ${x.heightMm}` : null,
            x.lengthMm != null ? `Дл ${x.lengthMm}` : null,
            x.widthMm != null ? `Ш ${x.widthMm}` : null,
            x.diameterMm != null ? `Диам ${x.diameterMm}` : null,
            x.thicknessMm != null ? `Толщ ${x.thicknessMm}` : null,
          ]
            .filter(Boolean)
            .join(', '),
        }));
        break;
      }
      case 'SurfaceFinishes': {
        const items = await prisma.surfaceFinish.findMany({ orderBy: { finishType: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          'Тип финиша': x.finishType,
          Шероховатость: x.roughnessClass,
          'Ra, мкм': x.raMicron ?? '',
        }));
        break;
      }
      case 'Coatings': {
        const items = await prisma.coating.findMany({ orderBy: { coatingType: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          'Тип покрытия': x.coatingType,
          Спецификация: x.coatingSpec,
          'Толщина, мкм': x.thicknessMicron ?? '',
        }));
        break;
      }
      case 'Clients': {
        const items = await prisma.client.findMany({ orderBy: { lastName: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          Фамилия: x.lastName,
          Имя: x.firstName,
          Отчество: x.patronymic,
          Адрес: x.address,
          Телефон: x.phone,
          Email: x.email,
          Активен: x.isActive ? 'да' : 'нет',
          Заметки: x.notes ?? '',
          'Паспорт серия': x.passportSeries ?? '',
          'Паспорт номер': x.passportNumber ?? '',
          'Кем выдан': x.passportIssuedBy ?? '',
          'Дата выдачи': x.passportIssuedDate ?? '',
        }));
        break;
      }
      case 'Organizations': {
        const items = await prisma.organization.findMany({ orderBy: { name: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          'Вид организации': x.legalForm ?? 'ООО',
          'Полное наименование': x.name,
          'Короткое наименование': x.shortName ?? '',
          ИНН: x.inn ?? '',
          КПП: x.kpp ?? '',
          ОГРН: x.ogrn ?? '',
          ОКПО: x.okpo ?? '',
          Телефон: x.phone ?? '',
          Email: x.email ?? '',
          Сайт: x.website ?? '',
          'Юридический адрес': x.legalAddress ?? '',
          'Почтовый адрес': x.postalAddress ?? '',
          Банк: x.bankName ?? '',
          БИК: x.bankBik ?? '',
          'Расчётный счёт': x.bankAccount ?? '',
          'Корр. счёт': x.bankCorrAccount ?? '',
          Подписант: x.signerName ?? '',
          'Должность подписанта': x.signerPosition ?? '',
          Заметки: x.notes ?? '',
          Активен: x.isActive ? 'да' : 'нет',
        }));
        break;
      }
      case 'KpPhotos': {
        const items = await prisma.kpPhoto.findMany({ orderBy: [{ organizationId: 'asc' }, { photoTitle: 'asc' }] });
        rows = items.map((x) => ({
          ID: x.id,
          Название: x.name,
          'ID организации': x.organizationId,
          'Название фото': x.photoTitle,
          'URL фото': x.photoUrl,
          Активен: x.isActive ? 'да' : 'нет',
        }));
        break;
      }
      case 'MaterialCharacteristics': {
        const items = await prisma.materialCharacteristic.findMany({ orderBy: { name: 'asc' } });
        rows = items.map((x) => ({
          ID: x.id,
          Название: x.name,
          Код: x.code ?? '',
          'Плотность кг/м³': x.densityKgM3 ?? '',
          'ID цвета': x.colorId ?? '',
          'Название цвета': x.colorName ?? '',
          'HEX цвета': x.colorHex ?? '',
          'ID отделки': x.surfaceFinishId ?? '',
          'Название отделки': '',
          'Тип отделки': x.finishType ?? '',
          Шероховатость: x.roughnessClass ?? '',
          'Ra мкм': x.raMicron ?? '',
          'ID покрытия': x.coatingId ?? '',
          'Название покрытия': '',
          'Тип покрытия': x.coatingType ?? '',
          'Спецификация покрытия': x.coatingSpec ?? '',
          'Толщина покрытия мкм': x.coatingThicknessMicron ?? '',
          Заметки: x.notes ?? '',
          Активен: x.isActive ? 'да' : 'нет',
        }));
        break;
      }
      case 'Materials': {
        const items = await prisma.material.findMany({ orderBy: { name: 'asc' }, include: { unit: true, geometry: true } });
        rows = items.map((x) => ({
          'ID материала': x.id,
          Название: x.name,
          Код: x.code ?? '',
          'ID характеристики': x.materialCharacteristicId,
          'Код характеристики': '',
          'Название характеристики': '',
          'ID геометрии': x.geometryId,
          'Название геометрии': (x.geometry as any)?.name ?? '',
          'ID единицы': x.unitId ?? '',
          'Код ЕИ': (x.unit as any)?.code ?? '',
          'Название единицы': (x.unit as any)?.name ?? '',
          'Цена ₽': x.purchasePriceRub ?? '',
          Заметки: x.notes ?? '',
          Активен: x.isActive ? 'да' : 'нет',
        }));
        break;
      }
      default: {
        rows = [];
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: adapter.headers as string[] });
    XLSX.utils.book_append_sheet(workbook, worksheet, excelSheetDisplayNameRu(adapter.sheetName));
  }

  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return normalizeXlsxBuffer(buf);
}

export async function importUnifiedExcelFromBuffer(buffer: Buffer): Promise<ExcelDictionariesImportReport> {
  const adapters = getAdapters();

  // Pre-caches for parsing.
  const roles = await prisma.role.findMany({ select: { id: true, code: true } });
  const roleCodeToId = new Map(roles.map((r) => [r.code.trim().toLowerCase(), r.id] as const));
  const existingRoleCodesLower = new Set(roles.map((r) => r.code.trim().toLowerCase()));

  // Reference existence checks for FK-like columns.
  const [
    organizationRows,
    colorRows,
    surfaceFinishRows,
    coatingRows,
    unitRows,
    geometryRows,
    materialCharacteristicRows,
  ] = await Promise.all([
    prisma.organization.findMany({ select: { id: true } }),
    prisma.color.findMany({ select: { id: true } }),
    prisma.surfaceFinish.findMany({ select: { id: true } }),
    prisma.coating.findMany({ select: { id: true } }),
    prisma.unit.findMany({ select: { id: true } }),
    prisma.geometry.findMany({ select: { id: true } }),
    prisma.materialCharacteristic.findMany({ select: { id: true } }),
  ]);

  // We read workbook only once.
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const report: ExcelDictionariesImportReport = {
    ok: true,
    totalInputRows: 0,
    totalProcessedRows: 0,
    sheets: {},
  };

  const ctx: ParseContext = {
    roleCodeToId,
    existingRoleCodesLower,
    existingByIdCache: {
      organization: new Set(organizationRows.map((x) => x.id)),
      color: new Set(colorRows.map((x) => x.id)),
      surfaceFinish: new Set(surfaceFinishRows.map((x) => x.id)),
      coating: new Set(coatingRows.map((x) => x.id)),
      unit: new Set(unitRows.map((x) => x.id)),
      geometry: new Set(geometryRows.map((x) => x.id)),
      materialCharacteristic: new Set(materialCharacteristicRows.map((x) => x.id)),
    },
  };

  // Parsed dto lists per adapter.
  const perSheetParsed: Record<string, { dtos: any[]; warnings: ExcelSheetReport['warnings']; errors: ExcelSheetReport['errors']; inputRows: number }> = {};
  for (const adapter of adapters) {
    perSheetParsed[adapter.sheetName] = { dtos: [], warnings: [], errors: [], inputRows: 0 };
    const sheetReport: ExcelSheetReport = {
      inputRows: 0,
      processedRows: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      warnings: [],
      errors: [],
    };
    report.sheets[adapter.sheetName] = sheetReport;
  }

  // Parse sheets.
  for (const adapter of adapters) {
    const sheet = workbook.Sheets[excelSheetDisplayNameRu(adapter.sheetName)];
    if (!sheet) {
      report.sheets[adapter.sheetName].errors.push({ excelRow: 0, message: `Отсутствует вкладка "${adapter.sheetName}".` });
      report.ok = false;
      continue;
    }

    const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    if (!Array.isArray(table) || table.length === 0) continue;

    const firstRow = table[0] as unknown[];
    const actualHeaders = excelHeadersFromFirstRow(firstRow);
    validateHeaders(adapter.sheetName, actualHeaders, adapter.headers);
    const headerToIndex = new Map<string, number>();
    actualHeaders.forEach((h, idx) => {
      if (h) headerToIndex.set(h, idx);
    });

    for (let i = 1; i < table.length; i++) {
      const rowArr = table[i] as unknown[];
      if (!rowArr || isAllBlankRow(rowArr as unknown[])) continue;

      report.totalInputRows += 1;
      report.sheets[adapter.sheetName].inputRows += 1;

      const rowObj: Record<string, unknown> = {};
      for (const expectedHeader of adapter.headers) {
        const idx = headerToIndex.get(expectedHeader);
        rowObj[expectedHeader] = idx != null ? rowArr[idx] ?? '' : '';
      }
      const excelRow = i + 1; // 1-based Excel row
      const parsed = adapter.parseRow(rowObj, excelRow, ctx);
      if (parsed.ok) {
        (parsed.dto as any).__excelRow = excelRow;
        perSheetParsed[adapter.sheetName].dtos.push(parsed.dto);
        report.sheets[adapter.sheetName].warnings.push(...parsed.warnings);
      } else {
        report.sheets[adapter.sheetName].skipped += 1;
        report.sheets[adapter.sheetName].warnings.push(...parsed.warnings);
        report.sheets[adapter.sheetName].errors.push(...parsed.errors);
      }
    }
  }

  // Deduplicate inside the file (warnings only; skip duplicates to avoid DB conflicts).
  let totalProcessedRows = 0;
  for (const adapter of adapters) {
    const sheetReport = report.sheets[adapter.sheetName];
    const dtos = perSheetParsed[adapter.sheetName].dtos as any[];

    const seenId = new Set<string>();
    const seenSecondary = new Set<string>();
    const deduped: any[] = [];

    for (const dto of dtos) {
      const excelRow = dto.__excelRow ?? 0;

      // Generic duplicate by `id` when present.
      if (typeof dto?.id === 'string' && dto.id) {
        if (seenId.has(dto.id)) {
          sheetReport.skipped += 1;
          sheetReport.warnings.push({
            excelRow,
            field: 'ID',
            message: `Дубликат ID в файле: ${dto.id}. Строка пропущена.`,
          });
          continue;
        }
        seenId.add(dto.id);
      }

      // Extra unique-ish duplicates: Roles.code, Users.login
      if (adapter.sheetName === 'Roles' && typeof dto?.code === 'string' && dto.code) {
        const key = dto.code.trim().toLowerCase();
        if (seenSecondary.has(key)) {
          sheetReport.skipped += 1;
          sheetReport.warnings.push({
            excelRow,
            field: 'Код',
            message: `Дубликат «Код» роли в файле: ${dto.code}. Строка пропущена.`,
          });
          continue;
        }
        seenSecondary.add(key);
      }
      if (adapter.sheetName === 'Users' && typeof dto?.login === 'string' && dto.login) {
        const key = dto.login.trim().toLowerCase();
        if (seenSecondary.has(key)) {
          sheetReport.skipped += 1;
          sheetReport.warnings.push({
            excelRow,
            field: 'Логин',
            message: `Дубликат «Логин» пользователя в файле: ${dto.login}. Строка пропущена.`,
          });
          continue;
        }
        seenSecondary.add(key);
      }

      deduped.push(dto);
    }

    sheetReport.processedRows += deduped.length;
    totalProcessedRows += deduped.length;
    perSheetParsed[adapter.sheetName].dtos = deduped;
  }

  report.totalProcessedRows = totalProcessedRows;

  // Upsert in dependency order (adapter order is already in import order).
  await prisma.$transaction(async (tx) => {
    for (const adapter of adapters) {
      const dtos = perSheetParsed[adapter.sheetName].dtos;
      if (!dtos.length) continue;
      await adapter.upsert(dtos as any[], report.sheets[adapter.sheetName], { prismaTx: tx as any });
    }
  });

  return report;
}

// Debug-only helper for lightweight smoke/unit checks (no DB writes).
// Intentionally not documented as a stable public API.
export function __debug_getExcelDictionariesAdaptersForTests(): Array<{
  sheetName: string;
  sheetDisplayNameRu: string;
  headers: readonly string[];
  templateSampleRows: Array<Record<string, unknown>>;
  parseRow: (raw: Record<string, unknown>, excelRow: number, ctx: any) => any;
}> {
  return getAdapters().map((a) => ({
    sheetName: a.sheetName,
    sheetDisplayNameRu: excelSheetDisplayNameRu(a.sheetName),
    headers: a.headers,
    templateSampleRows: a.templateSampleRows as Array<Record<string, unknown>>,
    parseRow: a.parseRow as any,
  }));
}

