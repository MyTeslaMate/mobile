import { exchangeMtmToken } from '@/lib/mtmExchange';

function mockFetch(impl: (input: any, init: any) => Promise<Response>) {
  (globalThis as any).fetch = jest.fn(impl);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  delete (globalThis as any).fetch;
});

describe('exchangeMtmToken', () => {
  it('parses a successful exchange', async () => {
    mockFetch(async () =>
      jsonResponse(200, {
        token: 'tok-123',
        name: 'Julien',
        email: 'j@example.com',
        subscribe_api: true,
        subscribe_teslamate: true,
        teslamate_api_endpoint: 'https://api.example.com',
        auth_type: 'bearer',
      })
    );
    const result = await exchangeMtmToken('mtm-abc');
    expect(result).toEqual({
      ok: true,
      token: 'tok-123',
      name: 'Julien',
      email: 'j@example.com',
      subscribeApi: true,
      subscribeTeslamate: true,
      teslamateApiEndpoint: 'https://api.example.com',
      authType: 'bearer',
    });
  });

  it('defaults authType to bearer when the value is unknown', async () => {
    mockFetch(async () =>
      jsonResponse(200, { token: 'tok', auth_type: 'something-else' })
    );
    const result = await exchangeMtmToken('mtm-abc');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.authType).toBe('bearer');
  });

  it('flags HTTP 401 as token_invalid', async () => {
    mockFetch(async () => jsonResponse(401, {}));
    const result = await exchangeMtmToken('mtm-bad');
    expect(result).toEqual({ ok: false, reason: 'token_invalid' });
  });

  it('flags 400 with error=token_invalid as token_invalid', async () => {
    mockFetch(async () => jsonResponse(400, { error: 'token_invalid' }));
    const result = await exchangeMtmToken('mtm-bad');
    expect(result).toEqual({ ok: false, reason: 'token_invalid' });
  });

  it('extracts signup details on 404/no_account', async () => {
    mockFetch(async () =>
      jsonResponse(404, {
        error: 'no_account',
        email: 'unknown@example.com',
        signup_url: 'https://app.myteslamate.com/register?email=unknown',
      })
    );
    const result = await exchangeMtmToken('mtm-abc');
    expect(result).toEqual({
      ok: false,
      reason: 'no_account',
      email: 'unknown@example.com',
      signupUrl: 'https://app.myteslamate.com/register?email=unknown',
    });
  });

  it('returns network when fetch throws', async () => {
    mockFetch(async () => {
      throw new Error('boom');
    });
    const result = await exchangeMtmToken('mtm-abc');
    expect(result).toEqual({ ok: false, reason: 'network' });
  });

  it('returns unknown for any other status', async () => {
    mockFetch(async () => jsonResponse(500, { error: 'server_exploded' }));
    const result = await exchangeMtmToken('mtm-abc');
    expect(result).toEqual({
      ok: false,
      reason: 'unknown',
      message: 'server_exploded',
    });
  });
});
