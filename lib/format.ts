export function formatDate(iso: string | null | undefined, locale = 'en'): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, '0')}`;
}

export function formatKm(km: number | null | undefined): string {
  if (km == null) return '—';
  return `${km.toFixed(1)} km`;
}

export function formatKwh(kwh: number | null | undefined): string {
  if (kwh == null) return '—';
  return `${kwh.toFixed(1)} kWh`;
}

export function formatCost(
  cost: number | null | undefined,
  currency: string | null | undefined
): string | null {
  if (cost == null) return null;
  const value = cost.toFixed(2);
  return currency ? `${value} ${currency}` : value;
}
