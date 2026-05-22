import { MTM_EXCHANGE_URL } from '@/lib/mtmConfig';
import type { TokenType } from '@/contexts/TokenStoreContext';
import type { Region } from '@/hooks/useRegion';

export interface MtmExchangeSuccess {
  ok: true;
  token: string;
  name: string;
  email: string;
  subscribeApi: boolean;
  subscribeTeslamate: boolean;
  teslamateApiEndpoint: string | null;
  authType: 'bearer' | 'basic';
}

export type MtmExchangeFailureReason =
  | 'no_account'
  | 'no_subscription'
  | 'token_invalid'
  | 'network'
  | 'unknown';

export interface MtmExchangeFailure {
  ok: false;
  reason: MtmExchangeFailureReason;
  email?: string;
  signupUrl?: string;
  message?: string;
}

export type MtmExchangeResult = MtmExchangeSuccess | MtmExchangeFailure;

async function postExchange(
  payload: Record<string, unknown>
): Promise<MtmExchangeResult> {
  let response: Response;
  try {
    response = await fetch(MTM_EXCHANGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, reason: 'network' };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // fall through
  }
  const data = (body ?? {}) as Record<string, unknown>;

  if (response.ok && typeof data.token === 'string') {
    return {
      ok: true,
      token: data.token,
      name: typeof data.name === 'string' ? data.name : '',
      email: typeof data.email === 'string' ? data.email : '',
      subscribeApi: Boolean(data.subscribe_api),
      subscribeTeslamate: Boolean(data.subscribe_teslamate),
      teslamateApiEndpoint:
        typeof data.teslamate_api_endpoint === 'string'
          ? data.teslamate_api_endpoint
          : null,
      authType: data.auth_type === 'basic' ? 'basic' : 'bearer',
    };
  }

  if (response.status === 404 && data.error === 'no_account') {
    return {
      ok: false,
      reason: 'no_account',
      email: typeof data.email === 'string' ? data.email : undefined,
      signupUrl:
        typeof data.signup_url === 'string' ? data.signup_url : undefined,
    };
  }

  if (response.status === 401) {
    return { ok: false, reason: 'token_invalid' };
  }

  if (response.status === 400 && data.error === 'token_invalid') {
    return { ok: false, reason: 'token_invalid' };
  }

  return {
    ok: false,
    reason: 'unknown',
    message: typeof data.error === 'string' ? data.error : undefined,
  };
}

export function exchangeTeslaToken(params: {
  accessToken: string;
  type: TokenType;
  region: Region;
}): Promise<MtmExchangeResult> {
  return postExchange({
    tesla_token: params.accessToken,
    type: params.type,
    region: params.region,
  });
}

export function exchangeMtmToken(token: string): Promise<MtmExchangeResult> {
  return postExchange({ mtm_token: token });
}
