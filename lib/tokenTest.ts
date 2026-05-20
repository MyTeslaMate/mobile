import type { Region } from '@/hooks/useRegion';
import type { TokenType } from '@/contexts/TokenStoreContext';

export type TokenTestStatus = 'valid' | 'invalid' | 'error';

export interface TokenTestResult {
  status: TokenTestStatus;
  fullName?: string;
  email?: string;
}

const FLEET_API_BASES: Record<Region, string[]> = {
  intl: [
    'https://fleet-api.prd.na.vn.cloud.tesla.com',
    'https://fleet-api.prd.eu.vn.cloud.tesla.com',
  ],
  cn: ['https://fleet-api.prd.cn.vn.cloud.tesla.cn'],
};

const OWNER_API_BASE = 'https://owner-api.teslamotors.com';

function parseUserInfo(data: unknown): {
  fullName?: string;
  email?: string;
} {
  const root = (data as { response?: unknown })?.response ?? data ?? {};
  const r = root as { full_name?: unknown; email?: unknown };
  const fullName =
    typeof r.full_name === 'string' && r.full_name.trim()
      ? r.full_name.trim()
      : undefined;
  const email =
    typeof r.email === 'string' && r.email.trim() ? r.email.trim() : undefined;
  return { fullName, email };
}

// Returns null when the call should be retried on another region (HTTP 421).
async function probeUserEndpoint(
  url: string,
  accessToken: string
): Promise<TokenTestResult | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // owner-api is behind Cloudflare and rejects requests without a User-Agent.
        'User-Agent': 'tesla-tokens-generator/1.0',
      },
    });
    if (response.ok) {
      try {
        const data = await response.json();
        return { status: 'valid', ...parseUserInfo(data) };
      } catch {
        return { status: 'valid' };
      }
    }
    // 421 = valid token, wrong region — caller should try the next base URL.
    if (response.status === 421) return null;
    if (response.status === 401 || response.status === 403) {
      return { status: 'invalid' };
    }
    return { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}

export async function testToken(
  type: TokenType,
  accessToken: string,
  region: Region
): Promise<TokenTestResult> {
  if (type === 'owner') {
    const result = await probeUserEndpoint(
      `${OWNER_API_BASE}/api/1/users/me`,
      accessToken
    );
    return result ?? { status: 'valid' };
  }

  let last: TokenTestResult = { status: 'valid' };
  for (const base of FLEET_API_BASES[region]) {
    const result = await probeUserEndpoint(
      `${base}/api/1/users/me`,
      accessToken
    );
    // 421 → try next region.
    if (result === null) {
      last = { status: 'valid' };
      continue;
    }
    if (result.status === 'valid' && (result.fullName || result.email)) {
      return result;
    }
    last = result;
  }
  return last;
}
