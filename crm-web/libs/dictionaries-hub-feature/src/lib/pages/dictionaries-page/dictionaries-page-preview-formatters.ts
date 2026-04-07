export function formatMaterialPriceRub(value: unknown): string {
  const num = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return new Intl.NumberFormat('ru-RU').format(num);
}

export function formatContactsSubtitle(phone?: string | null, email?: string | null): string {
  return [phone?.trim(), email?.trim()].filter(Boolean).join(' · ');
}

export function formatOrganizationSubtitle(shortName?: string | null, inn?: string | null): string {
  const parts: string[] = [];
  if (shortName?.trim()) parts.push(shortName.trim());
  if (inn?.trim()) parts.push(`ИНН ${inn.trim()}`);
  return parts.join(' · ');
}
