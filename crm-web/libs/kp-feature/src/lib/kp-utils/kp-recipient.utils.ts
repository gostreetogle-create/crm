import type { OrganizationItem } from '@srm/organizations-data-access';

export type KpRecipientParseResult =
  | { type: 'org'; id: string }
  | { type: 'contact'; id: string }
  | null;

/**
 * Разбор recipient в формате:
 * - `org:<id>`
 * - `contact:<id>`
 * - legacy: само значение = id организации (если найдено в organizations)
 */
export function parseKpRecipient(
  raw: string,
  organizations: readonly OrganizationItem[],
  orgPrefix: string,
  contactPrefix: string,
): KpRecipientParseResult {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(orgPrefix)) {
    const id = trimmed.slice(orgPrefix.length).trim();
    return id ? { type: 'org', id } : null;
  }

  if (trimmed.startsWith(contactPrefix)) {
    const id = trimmed.slice(contactPrefix.length).trim();
    return id ? { type: 'contact', id } : null;
  }

  const legacyOrg = organizations.find((o) => o.id === trimmed);
  return legacyOrg ? { type: 'org', id: trimmed } : null;
}

