export interface JwtPayload {
  exp?: number;
  iat?: number;
  scp?: string[];
  scope?: string;
  sub?: string;
  [key: string]: unknown;
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding =
    normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + padding);
}

export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenScopes(payload: JwtPayload): string[] {
  if (Array.isArray(payload.scp)) return payload.scp;
  if (typeof payload.scope === 'string') {
    return payload.scope.split(' ').filter(Boolean);
  }
  return [];
}

export function getTokenExpiry(payload: JwtPayload): Date | null {
  return typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null;
}

export function isTokenExpired(payload: JwtPayload): boolean {
  const expiry = getTokenExpiry(payload);
  return expiry !== null && expiry.getTime() <= Date.now();
}
