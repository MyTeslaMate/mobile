import { MTM_BASE_URL } from '@/lib/mtmConfig';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** Populated locally from `reasoning_delta` stream events — not from the API. */
  reasoning?: string;
  tool_calls: ChatToolCall[] | null;
  usage: Record<string, unknown> | null;
  created_at: string | null;
}

export interface ChatToolCall {
  index?: number;
  name?: string;
  server?: string;
  input?: unknown;
  output?: unknown;
  status?: string;
}

export interface ChatHistoryResponse {
  conversation_id: number | null;
  messages: ChatMessage[];
}

export interface ChatSendResponse {
  conversation_id: number;
  user_message_id: number;
  assistant_message_id: number;
  channel: string;
}

export interface ChatConversation {
  id: number;
  title: string;
  updated_at: string | null;
}

const BASE = `${MTM_BASE_URL}/api/chat`;

async function call<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new ChatApiError(response.status, await safeText(response));
  }

  return (await response.json()) as T;
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export class ChatApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Chat API ${status}`);
  }
}

export function sendChatMessage(
  token: string,
  args: { conversationId: number | null; content: string }
): Promise<ChatSendResponse> {
  return call<ChatSendResponse>(token, '/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: args.conversationId,
      content: args.content,
      tools_preset: 'mobile',
    }),
  });
}

export function loadChatHistory(
  token: string,
  conversationId?: number | null
): Promise<ChatHistoryResponse> {
  const q = conversationId ? `?conversation_id=${conversationId}` : '';
  return call<ChatHistoryResponse>(token, `/history${q}`);
}

export function listChatConversations(
  token: string
): Promise<{ conversations: ChatConversation[] }> {
  return call(token, '/conversations');
}

export function deleteChatConversation(
  token: string,
  id: number
): Promise<{ ok: boolean }> {
  return call(token, `/conversations/${id}`, { method: 'DELETE' });
}
