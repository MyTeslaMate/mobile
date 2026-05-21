import type { TeslaMateSession } from '@/contexts/TeslaMateApiContext';

export interface TmCar {
  car_id: number;
  name: string;
  model: string | null;
  vin?: string | null;
  trim_badging?: string | null;
  exterior_color?: string | null;
}

export interface TmCarStatus {
  car_id: number;
  display_name: string;
  state: string;
  battery_details?: {
    battery_level?: number | null;
    usable_battery_level?: number | null;
    est_battery_range_km?: number | null;
    charge_limit_soc?: number | null;
  };
  charging_details?: {
    charging_state?: string | null;
    charger_power?: number | null;
    time_to_full_charge?: number | null;
  };
  climate_details?: {
    inside_temp?: number | null;
    outside_temp?: number | null;
  };
  driving_details?: {
    shift_state?: string | null;
    speed?: number | null;
  };
  car_details?: {
    car_version?: string | null;
    odometer?: number | null;
  };
  car_geodata?: {
    geofence?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export interface TmDrive {
  drive_id: number;
  start_date: string;
  end_date: string | null;
  distance: number;
  duration_min: number;
  start_address?: string | null;
  end_address?: string | null;
  consumption?: number | null;
  start_km?: number | null;
  end_km?: number | null;
}

export interface TmCharge {
  charge_id: number;
  start_date: string;
  end_date: string | null;
  charge_energy_added: number;
  duration_min: number;
  address?: string | null;
  cost?: number | null;
  currency?: string | null;
}

interface ListEnvelope<T> {
  data: T;
}

function authHeader(session: TeslaMateSession): Record<string, string> {
  if (session.authType === 'basic') {
    return { Authorization: `Basic ${session.token}` };
  }
  return { Authorization: `Bearer ${session.token}` };
}

async function get<T>(session: TeslaMateSession, path: string): Promise<T> {
  const url = `${session.endpoint.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...authHeader(session),
    },
  });
  if (response.status === 401 || response.status === 403) {
    throw new TeslaMateApiError('unauthorized', response.status);
  }
  if (!response.ok) {
    throw new TeslaMateApiError('http_error', response.status);
  }
  const json = (await response.json()) as ListEnvelope<T> | T;
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    return (json as ListEnvelope<T>).data;
  }
  return json as T;
}

export class TeslaMateApiError extends Error {
  constructor(
    public code: 'unauthorized' | 'http_error' | 'network',
    public status?: number
  ) {
    super(`TeslaMate API error: ${code}${status ? ` (${status})` : ''}`);
  }
}

export async function listCars(session: TeslaMateSession): Promise<TmCar[]> {
  const data = await get<{ cars: TmCar[] } | TmCar[]>(session, '/api/v1/cars');
  return Array.isArray(data) ? data : data.cars ?? [];
}

export async function getCarStatus(
  session: TeslaMateSession,
  carId: number
): Promise<TmCarStatus> {
  const data = await get<{ status: TmCarStatus } | TmCarStatus>(
    session,
    `/api/v1/cars/${carId}/status`
  );
  return 'status' in (data as object)
    ? (data as { status: TmCarStatus }).status
    : (data as TmCarStatus);
}

export async function listDrives(
  session: TeslaMateSession,
  carId: number,
  page = 1
): Promise<TmDrive[]> {
  const data = await get<{ drives: TmDrive[] } | TmDrive[]>(
    session,
    `/api/v1/cars/${carId}/drives?page=${page}`
  );
  return Array.isArray(data) ? data : data.drives ?? [];
}

export async function listCharges(
  session: TeslaMateSession,
  carId: number,
  page = 1
): Promise<TmCharge[]> {
  const data = await get<{ charges: TmCharge[] } | TmCharge[]>(
    session,
    `/api/v1/cars/${carId}/charges?page=${page}`
  );
  return Array.isArray(data) ? data : data.charges ?? [];
}
