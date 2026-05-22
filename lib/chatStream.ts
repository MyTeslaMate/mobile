import { REVERB_APP_KEY, REVERB_AUTH_URL, REVERB_WS_URL } from '@/lib/mtmConfig';

// Minimal Pusher-protocol client for Reverb. We don't pull in laravel-echo +
// pusher-js because RN compat needs polyfills and we only consume a single
// private channel here. Wire protocol reference:
// https://pusher.com/docs/channels/library_auth_reference/pusher-websockets-protocol

export type ChatStreamEvent =
  | { kind: 'started'; message_id: number }
  | { kind: 'text_delta'; message_id: number; index: number; text: string }
  | { kind: 'reasoning_delta'; message_id: number; text: string }
  | {
      kind: 'tool_use_start';
      message_id: number;
      index: number;
      name: string;
      server_label?: string;
    }
  | { kind: 'tool_input_delta'; message_id: number; index: number; delta: string }
  | {
      kind: 'tool_result';
      message_id: number;
      index: number;
      name: string;
      server_label?: string;
      output: unknown;
      output_size?: number;
      error?: string | null;
    }
  | {
      kind: 'done';
      message_id: number;
      error?: string | null;
      usage?: Record<string, unknown>;
    }
  | { kind: 'error'; message: string; message_id?: number };

export interface ChatStreamHandle {
  close: () => void;
}

export interface ChatStreamArgs {
  token: string;
  /** The `channel` field returned by sendChatMessage, e.g. "App.Models.User.42". */
  channel: string;
  onEvent: (event: ChatStreamEvent) => void;
  onError?: (err: Error) => void;
  /** Optional connection-ready callback (after subscription succeeds). */
  onReady?: () => void;
}

interface PusherFrame {
  event: string;
  data?: string;
  channel?: string;
}

export function startChatStream(args: ChatStreamArgs): ChatStreamHandle {
  const { token, channel, onEvent, onError, onReady } = args;
  const privateName = channel.startsWith('private-') ? channel : `private-${channel}`;

  const wsUrl = `${REVERB_WS_URL}/app/${REVERB_APP_KEY}?protocol=7&client=mtm-rn&version=1.0&flash=false`;

  let ws: WebSocket | null = new WebSocket(wsUrl);
  let closed = false;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    closed = true;
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    if (ws) {
      try {
        ws.close();
      } catch {
        // ignore
      }
      ws = null;
    }
  };

  const fail = (err: Error) => {
    if (!closed) onError?.(err);
    cleanup();
  };

  ws.onerror = () => {
    fail(new Error('ws_error'));
  };

  ws.onclose = () => {
    cleanup();
  };

  ws.onmessage = async (msg) => {
    if (closed || !ws) return;
    let frame: PusherFrame;
    try {
      frame = JSON.parse(typeof msg.data === 'string' ? msg.data : '');
    } catch {
      return;
    }

    if (frame.event === 'pusher:ping') {
      ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      return;
    }

    if (frame.event === 'pusher:error') {
      const detail = safeParseData(frame.data);
      fail(new Error(`pusher: ${detail?.message ?? 'unknown'}`));
      return;
    }

    if (frame.event === 'pusher:connection_established') {
      const detail = safeParseData(frame.data);
      const socketId = detail?.socket_id;
      if (typeof socketId !== 'string') {
        fail(new Error('no_socket_id'));
        return;
      }
      try {
        const auth = await fetchAuth(token, socketId, privateName);
        ws.send(
          JSON.stringify({
            event: 'pusher:subscribe',
            data: { auth, channel: privateName },
          })
        );
      } catch (e: any) {
        fail(new Error(e?.message ?? 'auth_failed'));
      }
      return;
    }

    if (
      frame.event === 'pusher_internal:subscription_succeeded' &&
      frame.channel === privateName
    ) {
      onReady?.();
      return;
    }

    // Application event: `.chat.stream` — Laravel Echo prefixes broadcast names
    // with a dot when they use the `broadcastAs` convention.
    if (
      (frame.event === '.chat.stream' || frame.event === 'chat.stream') &&
      frame.channel === privateName
    ) {
      const payload = safeParseData(frame.data);
      if (payload && typeof payload.kind === 'string') {
        onEvent(payload as ChatStreamEvent);
      }
    }
  };

  // Reverb sends activity pings; we proactively send our own every 30s to
  // keep idle middleboxes from dropping the connection.
  pingTimer = setInterval(() => {
    if (closed || !ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
    } catch {
      // ignore
    }
  }, 30_000);

  return { close: cleanup };
}

async function fetchAuth(
  token: string,
  socketId: string,
  channelName: string
): Promise<string> {
  const body = new URLSearchParams({
    socket_id: socketId,
    channel_name: channelName,
  }).toString();

  const res = await fetch(REVERB_AUTH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`auth_${res.status}`);
  }

  const json = (await res.json()) as { auth?: string };
  if (!json.auth) {
    throw new Error('auth_missing_signature');
  }
  return json.auth;
}

function safeParseData(data: string | undefined): any {
  if (data == null) return null;
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return null;
  }
}
