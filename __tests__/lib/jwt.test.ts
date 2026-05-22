import { decodeJwt, getTokenExpiry, getTokenScopes, isTokenExpired } from '@/lib/jwt';

// Tiny helper: build a fake JWT with the given payload. The signature is just
// padding — decodeJwt only parses the payload, it does not verify.
function makeJwt(payload: object): string {
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function base64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

describe('decodeJwt', () => {
  it('returns null when the token does not have 3 parts', () => {
    expect(decodeJwt('not.a.jwt.format')).toBeNull();
    expect(decodeJwt('only.two')).toBeNull();
    expect(decodeJwt('')).toBeNull();
  });

  it('returns null on malformed payload base64', () => {
    expect(decodeJwt('header.@@not-base64@@.sig')).toBeNull();
  });

  it('decodes a well-formed payload', () => {
    const token = makeJwt({ sub: 'user-1', exp: 1700000000 });
    expect(decodeJwt(token)).toEqual({ sub: 'user-1', exp: 1700000000 });
  });
});

describe('getTokenScopes', () => {
  it('reads the scp array when present', () => {
    expect(getTokenScopes({ scp: ['read', 'write'] })).toEqual(['read', 'write']);
  });

  it('falls back to splitting the scope string', () => {
    expect(getTokenScopes({ scope: 'read write admin' })).toEqual([
      'read',
      'write',
      'admin',
    ]);
  });

  it('drops empty fragments from the scope string', () => {
    expect(getTokenScopes({ scope: 'read   write' })).toEqual(['read', 'write']);
  });

  it('returns an empty array when neither scp nor scope is present', () => {
    expect(getTokenScopes({})).toEqual([]);
  });
});

describe('getTokenExpiry / isTokenExpired', () => {
  it('returns null when exp is missing', () => {
    expect(getTokenExpiry({})).toBeNull();
    expect(isTokenExpired({})).toBe(false);
  });

  it('flags expiry against current time', () => {
    const past = Math.floor((Date.now() - 60_000) / 1000);
    const future = Math.floor((Date.now() + 60_000) / 1000);
    expect(isTokenExpired({ exp: past })).toBe(true);
    expect(isTokenExpired({ exp: future })).toBe(false);
  });
});
