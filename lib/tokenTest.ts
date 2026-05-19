import type { Region } from '@/hooks/useRegion';
import type { TokenType } from '@/contexts/TokenStoreContext';

export type TokenTestResult = 'valid' | 'invalid' | 'error';

const FLEET_API_BASE: Record<Region, string> = {
  intl: 'https://fleet-api.prd.na.vn.cloud.tesla.com',
  cn: 'https://fleet-api.prd.cn.vn.cloud.tesla.cn',
};

const OWNER_API_BASE = 'https://owner-api.teslamotors.com';

async function probe(url: string, accessToken: string): Promise<TokenTestResult> {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // 421 = valid token but the account belongs to another Fleet region.
    if (response.ok || response.status === 421) return 'valid';
    if (response.status === 401 || response.status === 403) return 'invalid';
    return 'error';
  } catch {
    return 'error';
  }
}

export function testToken(
  type: TokenType,
  accessToken: string,
  region: Region
): Promise<TokenTestResult> {
  const url =
    type === 'fleet'
      ? `${FLEET_API_BASE[region]}/api/1/vehicles`
      : `${OWNER_API_BASE}/api/1/vehicles`;
  return probe(url, accessToken);
}
