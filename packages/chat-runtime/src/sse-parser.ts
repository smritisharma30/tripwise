// Minimal Server-Sent Events parser, following the WHATWG spec:
// https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation

export interface SseMessage {
  /** The `event:` field, or "message" when the server didn't send one. */
  event: string;
  /** All `data:` lines of the event, joined with "\n". */
  data: string;
  /** The most recent `id:` seen on the stream (it persists across events). */
  lastEventId: string;
}

// Lines may end in \r\n, \n or \r. A \r at the very end of the buffer is NOT treated as a
// line end yet: it might be the first half of a \r\n split across two network chunks.
const LINE_END = /\r\n|\r(?!$)|\n/;

/**
 * Turns a byte stream into SSE messages. Network chunks don't line up with events: one
 * chunk can hold half an event or several, so incomplete text is buffered between reads.
 */
export async function* parseSse(
  body: ReadableStream<Uint8Array<ArrayBuffer>>,
): AsyncGenerator<SseMessage> {
  // TextDecoderStream keeps multi-byte characters (e.g. "€") intact across chunk splits.
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();

  let buffer = '';
  let eventType = '';
  let dataLines: string[] = [];
  let lastEventId = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();

      buffer += done ? '' : value;
      // At end of stream a trailing \r can no longer be half of a \r\n: it's a line end.
      const lines = buffer.split(done ? /\r\n|\r|\n/ : LINE_END);
      // The last piece has no line ending yet; keep it for the next chunk.
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        // A blank line completes the current event.
        if (line === '') {
          if (dataLines.length > 0) {
            yield { event: eventType || 'message', data: dataLines.join('\n'), lastEventId };
          }
          eventType = '';
          dataLines = [];
          continue;
        }

        // Lines starting with ":" are comments (often used as keep-alive pings).
        if (line.startsWith(':')) continue;

        // "field: value". A line with no colon is a field with an empty value.
        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        let value = colon === -1 ? '' : line.slice(colon + 1);
        if (value.startsWith(' ')) value = value.slice(1);

        switch (field) {
          case 'event':
            eventType = value;
            break;
          case 'data':
            dataLines.push(value);
            break;
          case 'id':
            if (!value.includes('\0')) lastEventId = value;
            break;
          // `retry` only matters for auto-reconnect, which we don't do. Unknown fields are
          // ignored per spec.
        }
      }

      // Stream ended. Any event without its closing blank line is discarded (per spec).
      if (done) return;
    }
  } finally {
    // Runs on normal end, on error, and when the consumer stops early (break / return):
    // cancelling tells fetch to close the connection. cancel() rejects on an already
    // errored stream, which we don't care about here.
    await reader.cancel().catch(() => undefined);
  }
}
