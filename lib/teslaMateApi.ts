import type { TeslaMateSession } from '@/contexts/TeslaMateApiContext';

export interface TmCar {
  car_id: number;
  name: string;
  car_details?: {
    eid?: number | null;
    vid?: number | null;
    vin?: string | null;
    model?: string | null;
    trim_badging?: string | null;
    efficiency?: number | null;
  } | null;
  car_exterior?: {
    exterior_color?: string | null;
    spoiler_type?: string | null;
    wheel_type?: string | null;
  } | null;
}

export interface TmCarStatus {
  car_id: number;
  display_name: string;
  state: string;
  state_since?: string | null;
  odometer?: number | null;
  battery_details?: {
    battery_level?: number | null;
    usable_battery_level?: number | null;
    est_battery_range?: number | null;
    rated_battery_range?: number | null;
    ideal_battery_range?: number | null;
    est_battery_range_km?: number | null;
    charge_limit_soc?: number | null;
  };
  charging_details?: {
    plugged_in?: boolean | null;
    charging_state?: string | null;
    charger_power?: number | null;
    time_to_full_charge?: number | null;
  };
  climate_details?: {
    is_climate_on?: boolean | null;
    inside_temp?: number | null;
    outside_temp?: number | null;
  };
  driving_details?: {
    shift_state?: string | null;
    speed?: number | null;
    heading?: number | null;
  };
  car_details?: {
    model?: string | null;
    trim_badging?: string | null;
    car_version?: string | null;
    odometer?: number | null;
  };
  car_exterior?: {
    exterior_color?: string | null;
  };
  car_status?: {
    healthy?: boolean | null;
    locked?: boolean | null;
    sentry_mode?: boolean | null;
    windows_open?: boolean | null;
    doors_open?: boolean | null;
    trunk_open?: boolean | null;
    frunk_open?: boolean | null;
    is_user_present?: boolean | null;
  };
  car_versions?: {
    version?: string | null;
    update_available?: boolean | null;
    update_version?: string | null;
  };
  car_geodata?: {
    geofence?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  tpms_details?: {
    tpms_pressure_fl?: number | null;
    tpms_pressure_fr?: number | null;
    tpms_pressure_rl?: number | null;
    tpms_pressure_rr?: number | null;
    tpms_soft_warning_fl?: boolean | null;
    tpms_soft_warning_fr?: boolean | null;
    tpms_soft_warning_rl?: boolean | null;
    tpms_soft_warning_rr?: boolean | null;
  } | null;
  units?: {
    unit_of_length?: string | null;
    unit_of_pressure?: string | null;
    unit_of_temperature?: string | null;
  } | null;
}

export interface TmBatteryHealth {
  battery_health_percentage?: number | null;
  max_capacity?: number | null;
  current_capacity?: number | null;
  max_range?: number | null;
  current_range?: number | null;
  rated_efficiency?: number | null;
}

export interface TmBatteryHealthResponse {
  battery_health?: TmBatteryHealth;
  units?: { unit_of_length?: string | null } | null;
}

export interface TmDrive {
  drive_id: number;
  start_date: string;
  end_date: string | null;
  duration_min: number;
  start_address?: string | null;
  end_address?: string | null;
  consumption_net?: number | null;
  odometer_details?: {
    odometer_start?: number | null;
    odometer_end?: number | null;
    odometer_distance?: number | null;
  };
  speed_max?: number | null;
  speed_avg?: number | null;
}

export interface TmCharge {
  charge_id: number;
  start_date: string;
  end_date: string | null;
  charge_energy_added: number;
  charge_energy_used?: number | null;
  duration_min: number;
  address?: string | null;
  cost?: number | null;
  currency?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface TmDriveDetail extends TmDrive {
  duration_str?: string;
  power_max?: number | null;
  power_min?: number | null;
  battery_details?: {
    start_usable_battery_level?: number | null;
    start_battery_level?: number | null;
    end_usable_battery_level?: number | null;
    end_battery_level?: number | null;
    reduced_range?: boolean | null;
    is_sufficiently_precise?: boolean | null;
  };
  range_ideal?: {
    start_range?: number | null;
    end_range?: number | null;
    range_diff?: number | null;
  };
  range_rated?: {
    start_range?: number | null;
    end_range?: number | null;
    range_diff?: number | null;
  };
  outside_temp_avg?: number | null;
  inside_temp_avg?: number | null;
  energy_consumed_net?: number | null;
  consumption_net?: number | null;
  drive_details?: Array<{
    detail_id?: number;
    date?: string;
    latitude?: number | null;
    longitude?: number | null;
    speed?: number | null;
    power?: number | null;
    odometer?: number | null;
    battery_level?: number | null;
    usable_battery_level?: number | null;
    elevation?: number | null;
  }>;
}

export interface TmChargeDetail extends TmCharge {
  duration_str?: string;
  battery_details?: {
    start_battery_level?: number | null;
    end_battery_level?: number | null;
  };
  range_ideal?: {
    start_range?: number | null;
    end_range?: number | null;
  };
  range_rated?: {
    start_range?: number | null;
    end_range?: number | null;
  };
  outside_temp_avg?: number | null;
  odometer?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  charge_details?: Array<{
    date?: string;
    battery_level?: number | null;
    outside_temp?: number | null;
    charger_details?: {
      charger_power?: number | null;
      charger_voltage?: number | null;
      charger_actual_current?: number | null;
    };
  }>;
}

interface ListEnvelope<T> {
  data: T;
}

const B64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(input: string): string {
  let output = '';
  let i = 0;
  while (i < input.length) {
    const c1 = input.charCodeAt(i++) & 0xff;
    const c2 = i < input.length ? input.charCodeAt(i++) & 0xff : NaN;
    const c3 = i < input.length ? input.charCodeAt(i++) & 0xff : NaN;
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | (Number.isNaN(c2) ? 0 : c2 >> 4);
    let e3 = ((c2 & 15) << 2) | (Number.isNaN(c3) ? 0 : c3 >> 6);
    let e4 = c3 & 63;
    if (Number.isNaN(c2)) {
      e3 = e4 = 64;
    } else if (Number.isNaN(c3)) {
      e4 = 64;
    }
    output +=
      B64_CHARS.charAt(e1) +
      B64_CHARS.charAt(e2) +
      (e3 === 64 ? '=' : B64_CHARS.charAt(e3)) +
      (e4 === 64 ? '=' : B64_CHARS.charAt(e4));
  }
  return output;
}

function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase();
}

// Endpoints like `https://<service>.api.myteslamate.com` are protected by HTTP
// Basic Auth where login = `<service>` (the subdomain) and password = the
// session token. Self-hosted instances use the Bearer token directly.
function authHeader(session: TeslaMateSession): Record<string, string> {
  if (session.authType === 'basic') {
    const host = hostOf(session.endpoint);
    const subdomain = host.endsWith('.api.myteslamate.com')
      ? host.slice(0, -'.api.myteslamate.com'.length).split('.')[0]
      : host.split('.')[0];
    return {
      Authorization: `Basic ${base64Encode(`${subdomain}:${session.token}`)}`,
    };
  }
  return { Authorization: `Bearer ${session.token}` };
}

async function get<T>(session: TeslaMateSession, path: string): Promise<T> {
  const url = `${session.endpoint.replace(/\/$/, '')}${path}`;
  console.log('[TeslaMate] GET', url);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...authHeader(session),
    },
  });
  console.log('[TeslaMate] ←', response.status, url);
  if (response.status === 401 || response.status === 403) {
    throw new TeslaMateApiError('unauthorized', response.status);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.log('[TeslaMate] body', body.slice(0, 200));
    throw new TeslaMateApiError('http_error', response.status);
  }
  const json = (await response.json()) as ListEnvelope<T> | T;
  console.log(
    '[TeslaMate] keys',
    path,
    json && typeof json === 'object' ? Object.keys(json as object) : typeof json
  );
  if (json && typeof json === 'object' && 'data' in (json as object)) {
    const inner = (json as ListEnvelope<T>).data;
    console.log(
      '[TeslaMate] data keys',
      path,
      inner && typeof inner === 'object' ? Object.keys(inner as object) : typeof inner
    );
    return inner;
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
  const data = await get<
    | { status: TmCarStatus; units?: TmCarStatus['units'] }
    | TmCarStatus
  >(session, `/api/v1/cars/${carId}/status`);
  if (data && typeof data === 'object' && 'status' in (data as object)) {
    const envelope = data as {
      status: TmCarStatus;
      units?: TmCarStatus['units'];
    };
    // The /status endpoint returns `units` as a sibling of `status`; surface
    // it on the status object so consumers can read the pressure unit.
    if (envelope.units) envelope.status.units = envelope.units;
    return envelope.status;
  }
  return data as TmCarStatus;
}

export async function getCarBatteryHealth(
  session: TeslaMateSession,
  carId: number
): Promise<TmBatteryHealthResponse> {
  return get<TmBatteryHealthResponse>(
    session,
    `/api/v1/cars/${carId}/battery-health`
  );
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

function rangeQuery(range?: DateRange): string {
  if (!range) return '';
  const parts: string[] = [];
  if (range.startDate) parts.push(`startDate=${encodeURIComponent(range.startDate)}`);
  if (range.endDate) parts.push(`endDate=${encodeURIComponent(range.endDate)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function listDrives(
  session: TeslaMateSession,
  carId: number,
  range?: DateRange
): Promise<TmDrive[]> {
  const data = await get<{ drives: TmDrive[] } | TmDrive[]>(
    session,
    `/api/v1/cars/${carId}/drives${rangeQuery(range)}`
  );
  return Array.isArray(data) ? data : data.drives ?? [];
}

export async function listCharges(
  session: TeslaMateSession,
  carId: number,
  range?: DateRange
): Promise<TmCharge[]> {
  const data = await get<{ charges: TmCharge[] } | TmCharge[]>(
    session,
    `/api/v1/cars/${carId}/charges${rangeQuery(range)}`
  );
  return Array.isArray(data) ? data : data.charges ?? [];
}

export async function getDrive(
  session: TeslaMateSession,
  carId: number,
  driveId: number
): Promise<TmDriveDetail> {
  const data = await get<{ drive: TmDriveDetail } | TmDriveDetail>(
    session,
    `/api/v1/cars/${carId}/drives/${driveId}`
  );
  return 'drive' in (data as object)
    ? (data as { drive: TmDriveDetail }).drive
    : (data as TmDriveDetail);
}

export async function getCharge(
  session: TeslaMateSession,
  carId: number,
  chargeId: number
): Promise<TmChargeDetail> {
  const data = await get<{ charge: TmChargeDetail } | TmChargeDetail>(
    session,
    `/api/v1/cars/${carId}/charges/${chargeId}`
  );
  return 'charge' in (data as object)
    ? (data as { charge: TmChargeDetail }).charge
    : (data as TmChargeDetail);
}
