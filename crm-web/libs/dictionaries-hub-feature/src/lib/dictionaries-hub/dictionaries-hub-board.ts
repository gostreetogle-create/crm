import type { HubBoardDictionaryRowDef } from './dictionaries-hub-board.config';
import { HUB_BOARD_SECTION_ORDER } from './dictionaries-hub-board.config';

export type HubBoardRow = HubBoardDictionaryRowDef;

export type HubBoardSectionColumn = {
  sectionId: string;
  section: string;
  items: { key: string; title: string }[];
};

/** Строки таблицы хаба с учётом видимости плитки по правам. */
export function filterHubBoardRowsByPermission(
  defs: readonly HubBoardDictionaryRowDef[],
  canViewTile: (tileKey: string) => boolean,
): HubBoardRow[] {
  return defs.filter((d) => canViewTile(d.key));
}

/** Колонки быстрого выбора: секция сверху, ниже — компактные кнопки справочников. */
export function buildHubBoardSectionColumns(
  rows: readonly HubBoardRow[],
  sectionOrder: readonly string[] = HUB_BOARD_SECTION_ORDER,
): HubBoardSectionColumn[] {
  type Col = HubBoardSectionColumn;
  const map = new Map<string, Col>();
  for (const r of rows) {
    const item = { key: r.key, title: r.title };
    const cur = map.get(r.sectionId);
    if (cur) {
      cur.items.push(item);
    } else {
      map.set(r.sectionId, { sectionId: r.sectionId, section: r.section, items: [item] });
    }
  }
  const ordered: Col[] = [];
  const seen = new Set<string>();
  for (const id of sectionOrder) {
    const c = map.get(id);
    if (c) {
      ordered.push(c);
      seen.add(id);
    }
  }
  for (const c of map.values()) {
    if (!seen.has(c.sectionId)) {
      ordered.push(c);
    }
  }
  return ordered;
}

/**
 * Две половины верхнего блока (пополам по ширине); в каждой — до двух колонок секций.
 * Итог на широком экране: 2×2 относительно четырёх секций.
 */
export function splitHubBoardPickerHalves(cols: readonly HubBoardSectionColumn[]): HubBoardSectionColumn[][] {
  if (!cols.length) {
    return [];
  }
  const mid = Math.ceil(cols.length / 2);
  const halves = [cols.slice(0, mid), cols.slice(mid)];
  return halves.filter((h) => h.length > 0);
}
