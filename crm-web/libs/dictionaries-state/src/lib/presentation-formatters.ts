/** Единые RU-форматы для подписей в таблицах/хабах (даты, суммы). */

export function formatRuDateOrDash(raw: string | null | undefined): string {
  const v = String(raw ?? '').trim();
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU');
}

export function formatRuDateTimeOrDash(raw: string | null | undefined): string {
  const v = String(raw ?? '').trim();
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRuMoney2(v: number): string {
  if (!Number.isFinite(v)) return '0';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}
