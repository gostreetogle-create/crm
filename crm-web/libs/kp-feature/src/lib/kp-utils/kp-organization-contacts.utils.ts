import type { OrganizationItem } from '@srm/organizations-data-access';

/**
 * Политика выбора `organizationContactId` для КП:
 * - если recipient не указывает org (`org:<id>`), то контакт = ''.
 * - если у org 0 контактов -> контакт = ''.
 * - если у org 1 контакт -> контакт = этот id.
 * - если у org много контактов -> если текущий `organizationContactId` есть в списке, то сохраняем; иначе ''.
 *
 * Возвращает:
 * - строку id (или ''), если нужно сделать `setValue`
 * - `null`, если менять не надо (оставить текущее значение)
 */
export function resolveKpOrganizationContactId(
  recipientRaw: string,
  organizations: readonly OrganizationItem[],
  currentContactIdRaw: string,
  orgPrefix: string,
): string | null {
  const recipient = String(recipientRaw ?? '').trim();
  const orgId = recipient.startsWith(orgPrefix) ? recipient.slice(orgPrefix.length).trim() : '';
  const cur = String(currentContactIdRaw ?? '').trim();

  if (!orgId) {
    return '';
  }

  const org = organizations.find((o) => o.id === orgId);
  const linked = org?.contactIds ?? [];

  if (linked.length === 0) {
    return '';
  }

  if (linked.length === 1) {
    return linked[0];
  }

  if (cur && linked.includes(cur)) {
    return null; // keep
  }

  return '';
}

