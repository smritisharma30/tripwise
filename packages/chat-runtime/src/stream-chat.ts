import { parseSse, type SseMessage } from './sse-parser';

// Mirrors apps/mock-server/src/sse.ts. See docs/sse-protocol.md.
export type ChatEvent =
  | { type: 'token'; data: { text: string } }
  | {
      type: 'tool_call';
      data: { id: string; name: string; args: Record<string, unknown> };
    }
  | { type: 'tool_result'; data: { id: string; result: unknown } }
  | { type: 'done'; data: { reason: 'complete' } }
  | { type: 'error'; data: { code: string; message: string } };

const EVENT_TYPES = new Set<string>(['token', 'tool_call', 'tool_result', 'done', 'error']);

/** Failures on the client side of the stream (the server's own `error` event is separate). */
export type ChatStreamErrorCode =
  | 'http' // non-2xx response
  | 'network' // couldn't connect, or the connection dropped mid-stream
  | 'incomplete'; // stream closed cleanly but without a `done` or `error` event

export class ChatStreamError extends Error {
  override name = 'ChatStreamError';

  constructor(
    readonly code: ChatStreamErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export interface StreamChatOptions {
  url: string;
  message: string;
  signal?: AbortSignal;
  /** Injectable for tests. */
  fetch?: typeof fetch;
}

/**
 * Sends a message and yields chat events as they arrive. Ends after `done` or `error`.
 * Throws ChatStreamError for transport problems; if `signal` aborts, the AbortError is
 * rethrown as-is so callers can tell "user pressed stop" apart from a failure.
 */
export async function* streamChat({
  url,
  message,
  signal,
  fetch: fetchImpl = fetch,
}: StreamChatOptions): AsyncGenerator<ChatEvent> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ message }),
      signal: signal ?? null,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ChatStreamError('network', 'Could not reach the chat server.', { cause: error });
  }

  if (!response.ok || !response.body) {
    throw new ChatStreamError('http', `Chat server responded with ${String(response.status)}.`);
  }

  try {
    for await (const sse of parseSse(response.body)) {
      const event = toChatEvent(sse);
      if (!event) {
        // Skip one bad event rather than failing the whole reply.
        console.warn('[chat-runtime] skipping malformed event', sse);
        continue;
      }
      yield event;
      if (event.type === 'done' || event.type === 'error') return;
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ChatStreamError('network', 'The connection was lost mid-reply.', { cause: error });
  }

  throw new ChatStreamError('incomplete', 'The reply ended unexpectedly.');
}

function toChatEvent({ event, data }: SseMessage): ChatEvent | null {
  if (!EVENT_TYPES.has(event)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  // Trusts the payload shape once the JSON parses (no runtime schema validation yet).
  return { type: event, data: parsed } as ChatEvent;
}
