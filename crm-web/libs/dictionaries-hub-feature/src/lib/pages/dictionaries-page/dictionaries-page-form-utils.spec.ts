import {
  mapLegalFormToOrganizationKind,
  normalizeRalCode,
  normalizeWorkTypeName,
  organizationKindToLegalForm,
  parseNumberOrNull,
} from './dictionaries-page-form-utils';

describe('dictionaries-page-form-utils', () => {
  it('parseNumberOrNull handles comma decimal', () => {
    expect(parseNumberOrNull('12,5')).toBe(12.5);
    expect(parseNumberOrNull('')).toBeNull();
  });

  it('normalizeRalCode classic and design', () => {
    expect(normalizeRalCode('ral 7016')).toBe('RAL 7016');
    expect(normalizeRalCode('RAL DESIGN 123 45 67')).toBe('RAL DESIGN 123 45 67');
  });

  it('organization kind mapping', () => {
    expect(mapLegalFormToOrganizationKind('ИП')).toBe('IP');
    expect(organizationKindToLegalForm('OOO')).toBe('ООО');
  });

  it('normalizeWorkTypeName lowercases', () => {
    expect(normalizeWorkTypeName('  АбВ  ')).toBe('абв');
  });
});
