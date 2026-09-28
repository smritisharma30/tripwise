import { describe, expect, it, vi } from 'vitest';

import { ChatStreamError, streamChat, type ChatEvent } from './stream-chat';
import { streamOf } from './test-utils';

const fakeFetch = (body: ReadableStream<Uint8Array<ArrayBuffer>>, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));

async function run(fetchImpl: typeof fetch): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of streamChat({ url: '/chat', message: 'hi', fetch: fetchImpl })) {
    events.push(event);
  }
  return events;
}

describe('streamChat', () => {
  it('yields typed events and stops after done', async () => {
    const events = await run(
      fakeFetch(
        streamOf([
          'event: token\ndata: {"text":"Hi"}\n\n',
          'event: done\ndata: {"reason":"complete"}\n\n',
        ]),
      ),
    );
    expect(events).toEqual([
      { type: 'token', data: { text: 'Hi' } },
      { type: 'done', data: { reason: 'complete' } },
    ]);
  });

  it('skips a malformed event and keeps going', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const events = await run(
      fakeFetch(
        streamOf([
          'event: token\ndata: {"text": "unterminated\n\n',
          'event: done\ndata: {"reason":"complete"}\n\n',
        ]),
      ),
    );
    expect(events.map((e) => e.type)).toEqual(['done']);
  });

  it('throws "incomplete" when the stream closes without a terminal event', async () => {
    const promise = run(fakeFetch(streamOf(['event: token\ndata: {"text":"Hi"}\n\n'])));
    await expect(promise).rejects.toMatchObject({ code: 'incomplete' });
  });

  it('throws "http" on a non-2xx response', async () => {
    await expect(run(fakeFetch(streamOf([]), 400))).rejects.toBeInstanceOf(ChatStreamError);
  });

  it('throws "network" when the connection drops mid-stream', async () => {
    const body = new ReadableStream<Uint8Array<ArrayBuffer>>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: token\ndata: {"text":"Hi"}\n\n'));
        controller.error(new TypeError('terminated'));
      },
    });
    await expect(run(fakeFetch(body))).rejects.toMatchObject({ code: 'network' });
  });
});
