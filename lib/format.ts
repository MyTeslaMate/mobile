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

export function formatMonthYear(
  iso: string | null | undefined,
  locale = 'en'
): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatCost(
  cost: number | null | undefined,
  currency: string | null | undefined
): string | null {
  if (cost == null) return null;
  const value = cost.toFixed(2);
  return currency ? `${value} ${currency}` : value;
}

// TeslaMate's `name` field is often blank — most users never rename the car in
// Tesla's app. Fall back to the model badge ("Model Y") which is always set.
export function formatCarName(
  source: {
    name?: string | null;
    car_id?: number | null;
    display_name?: string | null;
    car_details?: { model?: string | null; trim_badging?: string | null } | null;
  } | null | undefined
): string {
  if (!source) return '—';
  const name = source.name?.trim();
  if (name) return name;
  const display = source.display_name?.trim();
  if (display) return display;
  const model = source.car_details?.model?.trim();
  if (model) return `Tesla Model ${model}`;
  return source.car_id != null ? `Car #${source.car_id}` : '—';
}
