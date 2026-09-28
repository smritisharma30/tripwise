// Wire protocol for POST /chat. See docs/sse-protocol.md for the client-facing contract.

export type ChatEvent =
  | { type: 'token'; data: { text: string } }
  | {
      type: 'tool_call';
      data: { id: string; name: string; args: Record<string, unknown> };
    }
  | { type: 'tool_result'; data: { id: string; result: unknown } }
  | { type: 'done'; data: { reason: 'complete' } }
  | { type: 'error'; data: { code: string; message: string } };

export type ChatEventType = ChatEvent['type'];

/**
 * Frames one event per the SSE spec: `field: value` lines, terminated by a blank line.
 * JSON.stringify escapes newlines inside strings, so the payload always fits on one
 * `data:` line and can't accidentally end the event early.
 */
export function formatSseEvent(id: number, event: ChatEvent): string {
  return `id: ${String(id)}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * A well-framed event whose data is not valid JSON. The SSE layer parses it fine;
 * only the client's JSON.parse step fails, which is exactly what we want to test.
 */
export function formatMalformedEvent(id: number): string {
  return `id: ${String(id)}\nevent: token\ndata: {"text": "unterminated\n\n`;
}
