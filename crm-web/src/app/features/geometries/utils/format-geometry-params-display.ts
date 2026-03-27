import { GeometryItem } from '../model/geometry-item';

/** Unicode diameter sign (⌀), used like on drawings */
const DIAM = '\u2300';
const TIMES = '\u00D7';
const MDASH = '\u2014';

function mmSeg(n?: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return String(Math.round(n));
}

function joinMm(parts: string[]): string {
  return parts.length > 0 ? `${parts.join(TIMES)} мм` : MDASH;
}

/**
 * Compact display for geometry dimensions: e.g. 20×20×3 мм, ⌀50×3×2000 мм.
 * Shape-aware order matches dictionaries validators (rectangular / tube / plate / cylindrical).
 */
export function formatGeometryParamsDisplay(g: GeometryItem): string {
  const { shapeKey, heightMm, lengthMm, widthMm, diameterMm, thicknessMm } = g;
  const mm = mmSeg;

  switch (shapeKey) {
    case 'rectangular': {
      const parts = [mm(heightMm), mm(widthMm), mm(thicknessMm), mm(lengthMm)].filter(
        (p): p is string => p != null
      );
      return joinMm(parts);
    }
    case 'tube': {
      const d = mm(diameterMm);
      const t = mm(thicknessMm);
      const l = mm(lengthMm);
      const parts: string[] = [];
      if (d) parts.push(`${DIAM}${d}`);
      if (t) parts.push(t);
      if (l) parts.push(l);
      return joinMm(parts);
    }
    case 'cylindrical': {
      const d = mm(diameterMm);
      const l = mm(lengthMm);
      const parts: string[] = [];
      if (d) parts.push(`${DIAM}${d}`);
      if (l) parts.push(l);
      return joinMm(parts);
    }
    case 'plate': {
      const parts = [mm(lengthMm), mm(widthMm), mm(thicknessMm)].filter(
        (p): p is string => p != null
      );
      return joinMm(parts);
    }
    default: {
      const parts: string[] = [];
      const h = mm(heightMm);
      const w = mm(widthMm);
      const l = mm(lengthMm);
      const d = mm(diameterMm);
      const t = mm(thicknessMm);
      if (h) parts.push(h);
      if (w) parts.push(w);
      if (l) parts.push(l);
      if (d) parts.push(`${DIAM}${d}`);
      if (t) parts.push(t);
      return joinMm(parts);
    }
  }
}
