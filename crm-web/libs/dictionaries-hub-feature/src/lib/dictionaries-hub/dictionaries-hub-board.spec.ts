import {
  buildHubBoardSectionColumns,
  filterHubBoardRowsByPermission,
  splitHubBoardPickerHalves,
} from './dictionaries-hub-board';
import { HUB_BOARD_DICTIONARY_ROW_DEFS } from './dictionaries-hub-board.config';

describe('dictionaries-hub-board', () => {
  it('filterHubBoardRowsByPermission keeps only allowed keys', () => {
    const rows = filterHubBoardRowsByPermission(HUB_BOARD_DICTIONARY_ROW_DEFS, (k) => k === 'colors' || k === 'units');
    expect(rows.map((r) => r.key)).toEqual(['units', 'colors']);
  });

  it('buildHubBoardSectionColumns groups by section and orders sections', () => {
    const rows = filterHubBoardRowsByPermission(HUB_BOARD_DICTIONARY_ROW_DEFS, () => true);
    const cols = buildHubBoardSectionColumns(rows);
    expect(cols.map((c) => c.sectionId)).toEqual([
      'dictionary-hub-section-production',
      'dictionary-hub-section-catalog',
      'dictionary-hub-section-surface',
      'dictionary-hub-section-clients',
      'dictionary-hub-section-commercial',
      'dictionary-hub-section-access',
    ]);
    expect(cols[0].items.length).toBeGreaterThan(0);
  });

  it('splitHubBoardPickerHalves splits columns into two non-empty halves when possible', () => {
    const rows = filterHubBoardRowsByPermission(HUB_BOARD_DICTIONARY_ROW_DEFS, () => true);
    const cols = buildHubBoardSectionColumns(rows);
    const halves = splitHubBoardPickerHalves(cols);
    expect(halves.length).toBe(2);
    expect(halves[0].length + halves[1].length).toBe(cols.length);
  });
});
