import type { ColorItem } from '@srm/colors-data-access';
import type { CoatingItem } from '@srm/coatings-data-access';
import type { SurfaceFinishItem } from '@srm/surface-finishes-data-access';
import {
  findCoatingMatch,
  findColorMatch,
  findSurfaceFinishMatch,
  materialCharacteristicsDraftsToPayload,
  planMissingReferencesForMaterialCharacteristicsImport,
  splitCoatingCell,
} from '@srm/dictionaries-utils';

function color(id: string, name: string, hex: string, ralCode?: string): ColorItem {
  const clean = hex.replace('#', '');
  return {
    id,
    name,
    hex,
    ralCode,
    rgb: {
      r: Number.parseInt(clean.slice(0, 2), 16),
      g: Number.parseInt(clean.slice(2, 4), 16),
      b: Number.parseInt(clean.slice(4, 6), 16),
    },
  };
}

describe('material-characteristics-bulk-import', () => {
  const colors: ColorItem[] = [color('c-grey', 'Серый', '#6B7280'), color('c2', 'Light grey', '#CBD0CC', 'RAL 7035')];

  const finishes: SurfaceFinishItem[] = [
    { id: 'sf-matte', finishType: 'Matte', roughnessClass: 'Ra 3.2', raMicron: 3.2 },
    { id: 'sf-g', finishType: 'Glossy', roughnessClass: 'Ra 0.4', raMicron: 0.4 },
  ];

  const coatings: CoatingItem[] = [
    {
      id: 'ct-powder',
      coatingType: 'Powder coating',
      coatingSpec: 'RAL polyester',
      thicknessMicron: 80,
    },
    { id: 'ct-a', coatingType: 'Anodizing', coatingSpec: 'Clear', thicknessMicron: 20 },
  ];

  const snap = { colors, surfaceFinishes: finishes, coatings };

  describe('splitCoatingCell', () => {
    it('splits middle dot', () => {
      expect(splitCoatingCell('Powder coating · RAL polyester')).toEqual({
        coatingType: 'Powder coating',
        coatingSpec: 'RAL polyester',
      });
    });

    it('single token', () => {
      expect(splitCoatingCell('Anodizing')).toEqual({ coatingType: 'Anodizing', coatingSpec: undefined });
    });
  });

  describe('findColorMatch', () => {
    it('matches hex', () => {
      expect(findColorMatch('#6B7280', colors)?.id).toBe('c-grey');
    });

    it('matches ralCode', () => {
      expect(findColorMatch('RAL 7035', colors)?.id).toBe('c2');
    });

    it('empty raw → null', () => {
      expect(findColorMatch('  ', colors)).toBeNull();
    });
  });

  describe('findSurfaceFinishMatch', () => {
    it('matches finishType', () => {
      expect(findSurfaceFinishMatch('Matte', finishes)?.id).toBe('sf-matte');
    });

    it('matches combined label', () => {
      expect(findSurfaceFinishMatch('Matte / Ra 3.2', finishes)?.id).toBe('sf-matte');
    });
  });

  describe('findCoatingMatch', () => {
    it('matches type only (first hit)', () => {
      expect(findCoatingMatch('Anodizing', undefined, coatings)?.id).toBe('ct-a');
    });

    it('matches type and spec', () => {
      expect(
        findCoatingMatch('Powder coating', 'RAL polyester', coatings)?.id
      ).toBe('ct-powder');
    });
  });

  describe('planMissingReferencesForMaterialCharacteristicsImport', () => {
    it('empty raws → nothing to create', () => {
      const plan = planMissingReferencesForMaterialCharacteristicsImport(
        [
          {
            name: 'X',
            colorRaw: '',
            finishRaw: '',
            coatingCell: '',
            isActive: true,
          },
        ],
        snap
      );
      expect(plan.colorsToCreate).toHaveLength(0);
      expect(plan.finishesToCreate).toHaveLength(0);
      expect(plan.coatingsToCreate).toHaveLength(0);
    });

    it('unknown color → planned create', () => {
      const plan = planMissingReferencesForMaterialCharacteristicsImport(
        [
          {
            name: 'X',
            colorRaw: 'Unknown pink',
            finishRaw: 'Matte',
            coatingCell: 'Powder coating · RAL polyester',
            isActive: true,
          },
        ],
        snap
      );
      expect(plan.colorsToCreate.length).toBeGreaterThanOrEqual(1);
      expect(plan.finishesToCreate).toHaveLength(0);
      expect(plan.coatingsToCreate).toHaveLength(0);
    });
  });

  describe('materialCharacteristicsDraftsToPayload', () => {
    it('maps all refs when raws resolve', () => {
      const drafts = [
        {
          name: 'Профиль А',
          code: 'MC-A',
          densityKgM3: 7850,
          colorRaw: 'Серый',
          finishRaw: 'Matte',
          coatingCell: 'Powder coating · RAL polyester',
          isActive: true,
        },
      ];
      const out = materialCharacteristicsDraftsToPayload(drafts, snap);
      expect(out[0]).toMatchObject({
        name: 'Профиль А',
        code: 'MC-A',
        densityKgM3: 7850,
        colorId: 'c-grey',
        surfaceFinishId: 'sf-matte',
        coatingId: 'ct-powder',
        isActive: true,
      });
    });

    it('allows empty optional refs', () => {
      const drafts = [
        {
          name: 'Без отделки',
          colorRaw: '',
          finishRaw: '',
          coatingCell: '',
          isActive: true,
        },
      ];
      const out = materialCharacteristicsDraftsToPayload(drafts, snap);
      expect(out[0].colorId).toBeUndefined();
      expect(out[0].surfaceFinishId).toBeUndefined();
      expect(out[0].coatingId).toBeUndefined();
    });

    it('throws when color raw set but not in catalog', () => {
      expect(() =>
        materialCharacteristicsDraftsToPayload(
          [
            {
              name: 'Bad',
              colorRaw: '__no_such_color__',
              finishRaw: '',
              coatingCell: '',
              isActive: true,
            },
          ],
          snap
        )
      ).toThrow(/неразрешённый цвет/);
    });
  });
});
