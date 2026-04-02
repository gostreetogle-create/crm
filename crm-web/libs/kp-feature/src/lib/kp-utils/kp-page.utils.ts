import type { KpPageChunk } from '../kp-document-template/kp-document-template.component';

/**
 * Эффективное число строк на лист A4.
 */
export function effectiveRowsPerPage(raw: unknown, defaultValue = 12): number {
  const s = raw == null ? '' : String(raw).trim();
  const n = s ? Number(s.replace(/\s/g, '').replace(',', '.')) : NaN;
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : defaultValue;
}

/**
 * Порядок строк для печати/рендера:
 * - сначала строки с непустым imageUrl,
 * - затем остальные (стабильно по индексу внутри групп).
 */
export function orderedRowIndicesWithPhotoFirst(
  totalLines: number,
  hasPhotoAt: (index: number) => boolean,
): number[] {
  const indices = Array.from({ length: totalLines }, (_, i) => i);
  return indices.sort((a, b) => {
    const ha = hasPhotoAt(a);
    const hb = hasPhotoAt(b);
    if (ha !== hb) {
      return ha ? -1 : 1;
    }
    return a - b;
  });
}

/**
 * Колонка “Фото” должна появляться, только если хотя бы одна строка содержит URL.
 */
export function shouldShowPhotoColumn(
  totalLines: number,
  hasPhotoAt: (index: number) => boolean,
): boolean {
  for (let i = 0; i < totalLines; i++) {
    if (hasPhotoAt(i)) return true;
  }
  return false;
}

/**
 * Разбиение на чанки A4 по уже вычисленному порядку.
 */
export function pageChunksFromOrderedRowIndices(
  orderedRowIndices: readonly number[],
  rowsPerPage: number,
): KpPageChunk[] {
  const R = rowsPerPage;
  if (orderedRowIndices.length === 0) {
    return [{ formIndices: [], displayOffset: 0, useFirstBackground: true }];
  }

  const chunks: KpPageChunk[] = [];
  for (let start = 0; start < orderedRowIndices.length; start += R) {
    chunks.push({
      formIndices: orderedRowIndices.slice(start, start + R),
      displayOffset: start,
      useFirstBackground: start === 0,
    });
  }
  return chunks;
}

