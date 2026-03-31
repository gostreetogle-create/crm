import type { GeometryItem } from '@srm/geometries-data-access';
import { formatGeometryParamsDisplay } from '@srm/dictionaries-utils';

function base(over: Partial<GeometryItem>): GeometryItem {
  return {
    id: 'x',
    name: 't',
    shapeKey: 'custom',
    isActive: true,
    ...over,
  };
}

describe('formatGeometryParamsDisplay', () => {
  it('rectangular: H×W×t×L', () => {
    expect(
      formatGeometryParamsDisplay(
        base({
          shapeKey: 'rectangular',
          heightMm: 20,
          widthMm: 20,
          thicknessMm: 3,
          lengthMm: 6000,
        })
      )
    ).toBe('20×20×3×6000 мм');
  });

  it('tube: ⌀D×t×L', () => {
    expect(
      formatGeometryParamsDisplay(
        base({
          shapeKey: 'tube',
          diameterMm: 50,
          thicknessMm: 3,
          lengthMm: 2000,
        })
      )
    ).toBe('\u230050×3×2000 мм');
  });

  it('plate: L×W×t', () => {
    expect(
      formatGeometryParamsDisplay(
        base({
          shapeKey: 'plate',
          lengthMm: 2000,
          widthMm: 1000,
          thicknessMm: 4,
        })
      )
    ).toBe('2000×1000×4 мм');
  });

  it('no numbers: em dash', () => {
    expect(formatGeometryParamsDisplay(base({ shapeKey: 'rectangular' }))).toBe('\u2014');
  });
});


