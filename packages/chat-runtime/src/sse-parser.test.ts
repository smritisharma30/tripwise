import { describe, expect, it } from 'vitest';

import { parseSse, type SseMessage } from './sse-parser';
import { streamOf } from './test-utils';

async function collect(chunks: (string | Uint8Array<ArrayBuffer>)[]): Promise<SseMessage[]> {
  const messages: SseMessage[] = [];
  for await (const message of parseSse(streamOf(chunks))) messages.push(message);
  return messages;
}

describe('parseSse', () => {
  it('parses a complete event', async () => {
    expect(await collect(['id: 1\nevent: token\ndata: {"text":"hi"}\n\n'])).toEqual([
      { event: 'token', data: '{"text":"hi"}', lastEventId: '1' },
    ]);
  });

  it('handles an event split across chunks at any point', async () => {
    const wire = 'event: token\ndata: abc\n\nevent: done\ndata: x\n\n';
    for (let i = 1; i < wire.length; i++) {
      const messages = await collect([wire.slice(0, i), wire.slice(i)]);
      expect(messages.map((m) => m.event)).toEqual(['token', 'done']);
    }
  });

  it('handles several events in one chunk', async () => {
    const messages = await collect(['data: a\n\ndata: b\n\ndata: c\n\n']);
    expect(messages.map((m) => m.data)).toEqual(['a', 'b', 'c']);
  });

  it('accepts \\r\\n and \\r line endings, including \\r\\n split across chunks', async () => {
    expect(await collect(['data: a\r\n\r\n', 'data: b\r\r'])).toMatchObject([
      { data: 'a' },
      { data: 'b' },
    ]);
    expect(await collect(['event: x\r', '\ndata: a\r', '\n\r', '\n'])).toMatchObject([
      { event: 'x', data: 'a' },
    ]);
  });

  it('keeps multi-byte characters intact across chunk splits', async () => {
    const bytes = new TextEncoder().encode('data: €89\n\n');
    // "€" is 3 bytes (positions 6–8); split in the middle of it.
    expect(await collect([bytes.slice(0, 7), bytes.slice(7)])).toMatchObject([{ data: '€89' }]);
  });

  it('joins multiple data lines, skips comments, defaults the event name', async () => {
    expect(await collect([': ping\ndata: line 1\ndata: line 2\n\n'])).toEqual([
      { event: 'message', data: 'line 1\nline 2', lastEventId: '' },
    ]);
  });

  it('discards an event that never received its closing blank line', async () => {
    expect(await collect(['data: complete\n\n', 'data: cut off\n'])).toMatchObject([
      { data: 'complete' },
    ]);
  });
});
