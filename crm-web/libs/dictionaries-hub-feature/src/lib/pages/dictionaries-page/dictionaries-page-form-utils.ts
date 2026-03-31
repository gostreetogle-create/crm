/**
 * Чистые утилиты форм/импорта справочников (вынесены из `dictionaries-page.ts`).
 */

export function parseNumberOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const s = String(raw).trim();
  if (!s) return null;
  const normalized = s.replace(/\s+/g, '').replace(',', '.');
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

export function normalizeRalCode(raw: string): string | undefined {
  const value = raw.trim().toUpperCase();
  if (!value) return undefined;

  if (value === 'RAL' || value === 'RAL DESIGN' || value === 'RAL DESIGN:') {
    return undefined;
  }

  const classic = /^(?:RAL\s*)?(\d{4})$/.exec(value);
  if (classic) {
    return `RAL ${classic[1]}`;
  }

  const design = /^(?:RAL\s*DESIGN[:\s]*)?(\d{3})\s*(\d{2})\s*(\d{2})$/.exec(value);
  if (design) {
    return `RAL DESIGN ${design[1]} ${design[2]} ${design[3]}`;
  }

  return undefined;
}

export function mapLegalFormToOrganizationKind(legalForm: string | undefined | null): 'OOO' | 'IP' {
  const s = String(legalForm ?? '')
    .trim()
    .toUpperCase();
  if (!s) return 'OOO';
  if (s === 'IP' || s.includes('ИП')) return 'IP';
  return 'OOO';
}

export function organizationKindToLegalForm(kind: 'OOO' | 'IP'): string {
  return kind === 'IP' ? 'ИП' : 'ООО';
}

/** Сравнение наименований без учёта регистра (дубликаты в форме и Excel). */
export function normalizeWorkTypeName(raw: string): string {
  return raw.trim().toLocaleLowerCase('ru-RU');
}
