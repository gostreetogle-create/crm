import type { ColorItem, ColorItemInput } from '@srm/colors-data-access';
import type { CoatingItem, CoatingItemInput } from '@srm/coatings-data-access';
import type { SurfaceFinishItem, SurfaceFinishItemInput } from '@srm/surface-finishes-data-access';
import type { MaterialCharacteristicItemInput } from '@srm/material-characteristics-data-access';

/** Строка Excel после валидации колонок; ссылки разрешаются отдельно. */
export type MaterialCharacteristicsImportDraftRow = {
  name: string;
  code?: string;
  densityKgM3?: number;
  /** Исходная ячейка «Цвет» (#RRGGBB или подпись / RAL). */
  colorRaw: string;
  finishRaw: string;
  coatingCell: string;
  notes?: string;
  isActive: boolean;
};

export type ReferenceSnapshot = {
  colors: ColorItem[];
  surfaceFinishes: SurfaceFinishItem[];
  coatings: CoatingItem[];
};

export type MissingReferencePlan = {
  colorsToCreate: ColorItemInput[];
  finishesToCreate: SurfaceFinishItemInput[];
  coatingsToCreate: CoatingItemInput[];
  /** Уникальные строки для модалки (человекочитаемо). */
  summaryLines: string[];
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function normalizeHex6(hex: string): string | null {
  const m = /^#?([A-Fa-f0-9]{6})$/.exec(hex.trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

function rgbFromHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(clean)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

const IMPORT_PLACEHOLDER_HEX = '#9CA3AF';

export function splitCoatingCell(coatingCell: string): { coatingType: string; coatingSpec?: string } {
  const parts = coatingCell
    .split(/\s*·\s*/u)
    .map((s) => s.trim())
    .filter(Boolean);
  const coatingType = parts[0] ?? coatingCell.trim();
  const coatingSpec = parts.length > 1 ? parts.slice(1).join(' · ') : undefined;
  return { coatingType, coatingSpec };
}

export function findColorMatch(colorRaw: string, colors: ColorItem[]): ColorItem | null {
  const raw = colorRaw.trim();
  if (!raw) return null;

  const hex = normalizeHex6(raw);
  if (hex) {
    const hit = colors.find((c) => normalizeHex6(c.hex) === hex);
    if (hit) return hit;
  }

  const n = norm(raw);
  for (const c of colors) {
    if (norm(c.name) === n) return c;
    if (c.ralCode?.trim() && norm(c.ralCode) === n) return c;
    const label = `${c.name} ${c.ralCode ?? ''}`.trim();
    if (norm(label) === n) return c;
  }
  return null;
}

export function findSurfaceFinishMatch(
  finishRaw: string,
  finishes: SurfaceFinishItem[]
): SurfaceFinishItem | null {
  const raw = finishRaw.trim();
  if (!raw) return null;
  const n = norm(raw);
  for (const f of finishes) {
    if (norm(f.finishType) === n) return f;
    const label = `${f.finishType} / ${f.roughnessClass}`.trim();
    if (norm(label) === n) return f;
    if (norm(f.roughnessClass) === n) return f;
  }
  return null;
}

export function findCoatingMatch(
  coatingType: string,
  coatingSpec: string | undefined,
  coatings: CoatingItem[]
): CoatingItem | null {
  const t = coatingType.trim();
  if (!t) return null;
  const specNorm = (coatingSpec ?? '').trim().toLowerCase();
  const typeHits = coatings.filter((c) => norm(c.coatingType) === norm(t));
  if (!typeHits.length) return null;
  if (!specNorm) return typeHits[0];
  return (
    typeHits.find((c) => (c.coatingSpec ?? '').trim().toLowerCase() === specNorm) ?? null
  );
}

export function buildColorInputForMissing(colorRaw: string): ColorItemInput {
  const raw = colorRaw.trim();
  const hex = normalizeHex6(raw);
  if (hex) {
    return {
      name: raw,
      hex,
      rgb: rgbFromHex(hex),
    };
  }
  const ralM = /^RAL\s*(\d{4})\s*$/i.exec(raw);
  if (ralM) {
    const ralCode = `RAL ${ralM[1]}`;
    const h = IMPORT_PLACEHOLDER_HEX;
    return {
      ralCode,
      name: ralCode,
      hex: h,
      rgb: rgbFromHex(h),
    };
  }
  const h = IMPORT_PLACEHOLDER_HEX;
  return {
    name: raw,
    hex: h,
    rgb: rgbFromHex(h),
  };
}

export function buildSurfaceFinishInputForMissing(finishRaw: string): SurfaceFinishItemInput {
  return {
    finishType: finishRaw.trim(),
    roughnessClass: '—',
  };
}

export function buildCoatingInputForMissing(
  coatingType: string,
  coatingSpec?: string
): CoatingItemInput {
  return {
    coatingType: coatingType.trim(),
    coatingSpec: (coatingSpec ?? '').trim() || '—',
  };
}

function finishDedupeKey(raw: string): string {
  return `f:${norm(raw)}`;
}

function coatingDedupeKeyFromCell(cell: string): string {
  return `cell:${norm(cell)}`;
}

/**
 * Собирает, какие записи нужно создать в малых справочниках, чтобы все строки импорта сослались по id.
 */
export function planMissingReferencesForMaterialCharacteristicsImport(
  drafts: MaterialCharacteristicsImportDraftRow[],
  snap: ReferenceSnapshot
): MissingReferencePlan {
  const colorMap = new Map<string, ColorItemInput>();
  const finishMap = new Map<string, SurfaceFinishItemInput>();
  const coatingMap = new Map<string, CoatingItemInput>();
  const summary = new Set<string>();

  for (const d of drafts) {
    if (d.colorRaw.trim() && !findColorMatch(d.colorRaw, snap.colors)) {
      const key = `color:${norm(d.colorRaw)}`;
      if (!colorMap.has(key)) {
        colorMap.set(key, buildColorInputForMissing(d.colorRaw));
        summary.add(`Цвет: ${d.colorRaw.trim()}`);
      }
    }

    if (d.finishRaw.trim() && !findSurfaceFinishMatch(d.finishRaw, snap.surfaceFinishes)) {
      const key = finishDedupeKey(d.finishRaw);
      if (!finishMap.has(key)) {
        finishMap.set(key, buildSurfaceFinishInputForMissing(d.finishRaw));
        summary.add(`Отделка: ${d.finishRaw.trim()}`);
      }
    }

    const { coatingType, coatingSpec } = splitCoatingCell(d.coatingCell);
    if (
      (coatingType.trim() || d.coatingCell.trim()) &&
      !findCoatingMatch(coatingType, coatingSpec, snap.coatings)
    ) {
      const key = coatingDedupeKeyFromCell(d.coatingCell);
      if (!coatingMap.has(key)) {
        coatingMap.set(key, buildCoatingInputForMissing(coatingType, coatingSpec));
        summary.add(
          coatingSpec
            ? `Покрытие: ${coatingType.trim()} · ${coatingSpec.trim()}`
            : `Покрытие: ${coatingType.trim()}`
        );
      }
    }
  }

  return {
    colorsToCreate: [...colorMap.values()],
    finishesToCreate: [...finishMap.values()],
    coatingsToCreate: [...coatingMap.values()],
    summaryLines: [...summary].sort((a, b) => a.localeCompare(b, 'ru')),
  };
}

/**
 * Собирает payload характеристик: только после того, как все ссылки есть в snap.
 */
export function materialCharacteristicsDraftsToPayload(
  drafts: MaterialCharacteristicsImportDraftRow[],
  snap: ReferenceSnapshot
): MaterialCharacteristicItemInput[] {
  return drafts.map((d) => {
    const color = d.colorRaw.trim()
      ? findColorMatch(d.colorRaw, snap.colors)
      : null;
    const finish = d.finishRaw.trim()
      ? findSurfaceFinishMatch(d.finishRaw, snap.surfaceFinishes)
      : null;
    const { coatingType, coatingSpec } = splitCoatingCell(d.coatingCell);
    const coating =
      coatingType.trim() || d.coatingCell.trim()
        ? findCoatingMatch(coatingType, coatingSpec, snap.coatings)
        : null;

    if (d.colorRaw.trim() && !color) {
      throw new Error(
        'materialCharacteristicsDraftsToPayload: неразрешённый цвет — сначала создайте запись в справочнике или проверьте подпись.'
      );
    }
    if (d.finishRaw.trim() && !finish) {
      throw new Error(
        'materialCharacteristicsDraftsToPayload: неразрешённая отделка — сначала создайте запись в справочнике или проверьте подпись.'
      );
    }
    if ((coatingType.trim() || d.coatingCell.trim()) && !coating) {
      throw new Error(
        'materialCharacteristicsDraftsToPayload: неразрешённое покрытие — сначала создайте запись в справочнике или проверьте подпись.'
      );
    }

    return {
      name: d.name,
      code: d.code,
      densityKgM3: d.densityKgM3,
      colorId: color?.id,
      colorName: color?.name,
      colorHex: color?.hex,
      surfaceFinishId: finish?.id,
      finishType: finish?.finishType,
      roughnessClass: finish?.roughnessClass,
      raMicron: finish?.raMicron,
      coatingId: coating?.id,
      coatingType: coating?.coatingType,
      coatingSpec: coating?.coatingSpec,
      coatingThicknessMicron: coating?.thicknessMicron,
      notes: d.notes,
      isActive: d.isActive,
    };
  });
}
