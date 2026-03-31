import {
  colorsPayloadFromFormRaw,
  geometriesPayloadFromValues,
  materialsPayloadFromValues,
  workTypesPayloadFromValues,
} from './dictionaries-page-payload-builders';

describe('dictionaries-page-payload-builders', () => {
  it('builds work types payload with trim and rounded money', () => {
    const result = workTypesPayloadFromValues({
      name: '  Laser  ',
      shortLabel: '  LS  ',
      hourlyRateRub: 1250.9,
      isActive: true,
    });

    expect(result).toEqual({
      name: 'Laser',
      shortLabel: 'LS',
      hourlyRateRub: 1251,
      isActive: true,
    });
  });

  it('builds materials payload with optional empty fields normalized', () => {
    const result = materialsPayloadFromValues({
      name: '  Steel 20  ',
      code: '  ',
      materialCharacteristicId: 'mc-1',
      geometryId: 'g-1',
      geometryName: 'Pipe',
      unitId: '',
      unitName: 'kg',
      purchasePriceRub: '999.4',
      notes: '   ',
      isActive: true,
    });

    expect(result).toEqual({
      name: 'Steel 20',
      code: undefined,
      materialCharacteristicId: 'mc-1',
      geometryId: 'g-1',
      geometryName: 'Pipe',
      unitId: undefined,
      unitName: 'kg',
      purchasePriceRub: 999,
      notes: undefined,
      isActive: true,
    });
  });

  it('builds geometries payload with null numeric values removed', () => {
    const result = geometriesPayloadFromValues({
      name: '  Sheet  ',
      shapeKey: 'sheet',
      heightMm: null,
      lengthMm: 1200,
      widthMm: 800,
      diameterMm: null,
      thicknessMm: null,
      notes: '',
      isActive: false,
    });

    expect(result).toEqual({
      name: 'Sheet',
      shapeKey: 'sheet',
      heightMm: undefined,
      lengthMm: 1200,
      widthMm: 800,
      diameterMm: undefined,
      thicknessMm: undefined,
      notes: undefined,
      isActive: false,
    });
  });

  it('builds colors payload with normalized RAL and uppercase HEX', () => {
    const result = colorsPayloadFromFormRaw({
      ralCode: 'ral 7016',
      name: ' Графит ',
      hex: '#ff00aa',
    });

    expect(result).toEqual({
      ralCode: 'RAL 7016',
      name: 'Графит',
      hex: '#FF00AA',
      rgb: { r: 255, g: 0, b: 170 },
    });
  });
});

