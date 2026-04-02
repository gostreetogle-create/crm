import type { ClientItem } from '@srm/clients-data-access';
import type { OrganizationItem } from '@srm/organizations-data-access';
import { formatClientFio } from '@srm/clients-data-access';

export function getKpOrganizationOptionLabel(org: OrganizationItem): string {
  const s = org.shortName?.trim();
  return s || org.name;
}

export function getKpClientLabel(c: ClientItem): string {
  return formatClientFio(c);
}

export function filterKpOrganizations(
  organizations: readonly OrganizationItem[],
  searchRaw: unknown,
  selectedOrganization: OrganizationItem | null,
): OrganizationItem[] {
  const q = String(searchRaw ?? '').trim().toLowerCase();
  const list = organizations.filter((o) => o.isActive);
  const filtered = !q
    ? [...list]
    : list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) || (o.shortName?.toLowerCase().includes(q) ?? false),
      );

  if (selectedOrganization && q && !filtered.some((o) => o.id === selectedOrganization.id)) {
    return [selectedOrganization, ...filtered];
  }

  return filtered;
}

export function filterKpClients(
  clients: readonly ClientItem[],
  searchRaw: unknown,
  selectedContact: ClientItem | null,
): ClientItem[] {
  const q = String(searchRaw ?? '').trim().toLowerCase();
  const list = clients.filter((c) => c.isActive);

  const match = (c: ClientItem) => {
    if (!q) {
      return true;
    }
    const fio = formatClientFio(c).toLowerCase();
    return (
      fio.includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false) ||
      (c.address?.toLowerCase().includes(q) ?? false)
    );
  };

  let filtered = list.filter(match);
  if (selectedContact && q && !filtered.some((c) => c.id === selectedContact.id)) {
    filtered = [selectedContact, ...filtered];
  }
  return filtered;
}

export function getKpRecipientDisplayLabel(
  selectedOrganization: OrganizationItem | null,
  selectedContact: ClientItem | null,
): string {
  if (selectedOrganization) {
    return getKpOrganizationOptionLabel(selectedOrganization);
  }
  if (selectedContact) {
    return getKpClientLabel(selectedContact);
  }
  return '— не выбрано —';
}

