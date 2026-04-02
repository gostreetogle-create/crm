import {
  COLORS_COLUMNS_FULL,
  GEOMETRIES_COLUMNS_FULL,
  MATERIALS_COLUMNS_FULL,
  WORK_TYPES_COLUMNS_FULL,
} from './dictionaries-page-table-columns';

function keysOf(columns: Array<{ key: string }>): string[] {
  return columns.map((c) => c.key);
}

describe('dictionaries-page-table-columns contracts', () => {
  it('keeps critical work types columns', () => {
    expect(keysOf(WORK_TYPES_COLUMNS_FULL)).toEqual(
      expect.arrayContaining(['name', 'shortLabel', 'hourlyRateLabel', 'isActiveLabel']),
    );
  });

  it('keeps critical materials columns', () => {
    expect(keysOf(MATERIALS_COLUMNS_FULL)).toEqual(
      expect.arrayContaining([
        'name',
        'code',
        'characteristic',
        'geometry',
        'unit',
        'supplier',
        'priceLabel',
        'isActiveLabel',
      ]),
    );
  });

  it('keeps critical geometries columns', () => {
    expect(keysOf(GEOMETRIES_COLUMNS_FULL)).toEqual(
      expect.arrayContaining(['name', 'shape', 'params', 'isActiveLabel']),
    );
  });

  it('keeps critical colors columns', () => {
    expect(keysOf(COLORS_COLUMNS_FULL)).toEqual(expect.arrayContaining(['ralCode', 'name', 'hex', 'rgb']));
  });
});

