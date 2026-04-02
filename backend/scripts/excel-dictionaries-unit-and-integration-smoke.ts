import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  __debug_getExcelDictionariesAdaptersForTests,
  buildUnifiedExcelExportBuffer,
  importUnifiedExcelFromBuffer,
} from '../src/lib/excel-dictionaries/excel-dictionaries.service.ts';

function findAdapter(sheetName: string) {
  const adapters = __debug_getExcelDictionariesAdaptersForTests();
  const a = adapters.find((x) => x.sheetName === sheetName);
  assert.ok(a, `Adapter "${sheetName}" not found`);
  return a!;
}

async function unitTests(): Promise<void> {
  const units = findAdapter('Units');
  const colors = findAdapter('Colors');
  const kpPhotos = findAdapter('KpPhotos');

  // Units: missing "Название"
  {
    const res = units.parseRow(
      { ID: '', Название: '', Код: 'pcs', Комментарий: '' },
      2,
      {},
    );
    assert.equal(res.ok, false);
    assert.equal(res.skipped, true);
    assert.ok(res.errors.some((e: any) => e.field === 'Название'), 'Units should error on Название');
  }

  // Colors: invalid RGB format
  {
    const res = colors.parseRow(
      { ID: '', RAL: 'RAL 7035', Название: 'Light grey', HEX: '#CBD0CC', RGB: '1,2' },
      2,
      {},
    );
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e: any) => e.field === 'RGB'), 'Colors should error on RGB');
  }

  // KpPhotos: missing URL
  {
    const ctx = {
      existingByIdCache: { organization: new Set(['org-valid']) },
    };
    const res = kpPhotos.parseRow(
      {
        ID: '',
        Название: 'Фон',
        'ID организации': 'org-invalid',
        'Название фото': 'Вид 1',
        'URL фото': '',
        Активен: 'да',
      },
      2,
      ctx,
    );
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e: any) => e.field === 'URL фото'), 'KpPhotos should error on URL фото');
  }

  // If we reached here: unit tests ok
  // eslint-disable-next-line no-console
  console.log('[excel-dictionaries] unit tests: OK');
}

async function integrationExportMutateImportTest(): Promise<void> {
  const exportBuf = await buildUnifiedExcelExportBuffer();

  const wb = XLSX.read(exportBuf, { type: 'buffer' });

  const mutateSheet = (
    sheetName: string,
    sheetDisplayName: string,
    rowIndexZeroBased: number,
    headerField: string,
    newValue: unknown,
  ) => {
    const sheet = wb.Sheets[sheetDisplayName];
    assert.ok(sheet, `Sheet "${sheetDisplayName}" not found in export`);

    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
    assert.ok(aoa.length >= 2, `Sheet "${sheetName}" too small`);

    const headerRow = aoa[0].map((x) => String(x).trim());
    const idx = headerRow.indexOf(headerField);
    assert.ok(idx >= 0, `Header "${headerField}" not found in sheet "${sheetName}"`);

    const targetRowIndex = rowIndexZeroBased + 1; // +1 because header row at 0
    while (aoa.length <= targetRowIndex) {
      aoa.push(new Array(headerRow.length).fill(''));
    }
    if (!Array.isArray(aoa[targetRowIndex])) {
      aoa[targetRowIndex] = new Array(headerRow.length).fill('');
    }
    const row = aoa[targetRowIndex] as unknown[];
    while (row.length < headerRow.length) row.push('');
    row[idx] = newValue;

    wb.Sheets[sheetDisplayName] = XLSX.utils.aoa_to_sheet(aoa);
  };

  // Trigger parse errors on import:
  // Units: remove "Название" in row 2
  const units = findAdapter('Units');
  const kpPhotos = findAdapter('KpPhotos');
  mutateSheet('Units', units.sheetDisplayNameRu, 0, 'Название', '');
  // KpPhotos: remove "URL фото" in row 2
  mutateSheet('KpPhotos', kpPhotos.sheetDisplayNameRu, 0, 'URL фото', '');

  const mutatedBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const report = await importUnifiedExcelFromBuffer(mutatedBuf);

  assert.equal(report.ok, true);

  const unitsReport = report.sheets['Units'];
  const kpReport = report.sheets['KpPhotos'];

  assert.ok(unitsReport.errors.length >= 1, 'Units should have at least one error');
  assert.ok(unitsReport.errors.some((e) => e.field === 'Название'), 'Units error should be about Название');

  assert.ok(kpReport.errors.length >= 1, 'KpPhotos should have at least one error');
  assert.ok(kpReport.errors.some((e) => e.field === 'URL фото'), 'KpPhotos error should be about URL фото');

  // eslint-disable-next-line no-console
  console.log('[excel-dictionaries] integration export->mutate->import: OK');
}

await unitTests();
await integrationExportMutateImportTest();

