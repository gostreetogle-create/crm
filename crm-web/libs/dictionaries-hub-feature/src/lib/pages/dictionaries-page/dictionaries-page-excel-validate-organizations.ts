import type { OrganizationItemInput } from '@srm/organizations-data-access';
import { mapLegalFormToOrganizationKind, organizationKindToLegalForm } from './dictionaries-page-form-utils';
import type { DictionariesPage } from './dictionaries-page';

export function validateAndMapOrganizationsRows(
  this: DictionariesPage,
  rows: ReadonlyArray<Record<string, unknown>>,
): {
  ok: boolean;
  rows: OrganizationItemInput[];
  errors: string[];
} {
  const errors: string[] = [];
  const mapped: OrganizationItemInput[] = [];

  if (!rows.length) return { ok: false, rows: mapped, errors: ['Пустой файл.'] };

  const requiredHeaders: string[] = this.organizationsExcelHeaders();
  const firstKeys = Object.keys(rows[0] ?? {});
  const missingHeaders = requiredHeaders.filter((h: string) => !firstKeys.includes(h));
  if (missingHeaders.length) {
    return { ok: false, rows: mapped, errors: [`Нет колонок: ${missingHeaders.join(', ')}`] };
  }

  rows.forEach((row, idx) => {
    const rowNo = idx + 2;
    const kindRaw = String(row['Вид организации'] ?? '').trim();
    const kind = mapLegalFormToOrganizationKind(kindRaw);
    const name = String(row['Полное наименование'] ?? '').trim();
    const shortName = String(row['Короткое наименование'] ?? '').trim();
    const inn = String(row['ИНН'] ?? '').trim();
    const kpp = String(row['КПП'] ?? '').trim();
    const ogrn = String(row['ОГРН'] ?? '').trim();
    const okpo = String(row['ОКПО'] ?? '').trim();
    const phone = String(row['Телефон'] ?? '').trim();
    const email = String(row['Email'] ?? '').trim();
    const website = String(row['Сайт'] ?? '').trim();
    const legalAddress = String(row['Юридический адрес'] ?? '').trim();
    const postalAddress = String(row['Почтовый адрес'] ?? '').trim();
    const bankName = String(row['Банк'] ?? '').trim();
    const bankBik = String(row['БИК'] ?? '').trim();
    const bankAccount = String(row['Расчётный счёт'] ?? '').trim();
    const bankCorrAccount = String(row['Корр. счёт'] ?? '').trim();
    const signerName = String(row['Подписант'] ?? '').trim();
    const signerPosition = String(row['Должность подписанта'] ?? '').trim();
    const notes = String(row['Заметки'] ?? '').trim();
    const activeRaw = String(row['Активен'] ?? '')
      .trim()
      .toLowerCase();

    if (!name || name.length < 2) {
      errors.push(`Строка ${rowNo}: укажите полное наименование (минимум 2 символа).`);
      return;
    }

    let isActiveRow = true;
    if (!activeRaw) {
      isActiveRow = true;
    } else if (['да', 'yes', 'true', '1'].includes(activeRaw)) {
      isActiveRow = true;
    } else if (['нет', 'no', 'false', '0'].includes(activeRaw)) {
      isActiveRow = false;
    } else {
      errors.push(`Строка ${rowNo}: в «Активен» укажите да или нет.`);
      return;
    }

    if (!kindRaw) {
      errors.push(`Строка ${rowNo}: укажите вид организации (ООО или ИП).`);
      return;
    }

    mapped.push({
      name,
      shortName: shortName || undefined,
      legalForm: organizationKindToLegalForm(kind),
      inn: inn || undefined,
      kpp: kind === 'IP' ? undefined : kpp || undefined,
      ogrn: ogrn || undefined,
      okpo: okpo || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      legalAddress: legalAddress || undefined,
      postalAddress: postalAddress || undefined,
      bankName: bankName || undefined,
      bankBik: bankBik || undefined,
      bankAccount: bankAccount || undefined,
      bankCorrAccount: bankCorrAccount || undefined,
      signerName: signerName || undefined,
      signerPosition: signerPosition || undefined,
      notes: notes || undefined,
      isActive: isActiveRow,
      contactIds: [],
      contactLabels: [],
    });
  });

  if (errors.length) return { ok: false, rows: mapped, errors: errors.slice(0, 6) };
  return { ok: true, rows: mapped, errors: [] };
}
