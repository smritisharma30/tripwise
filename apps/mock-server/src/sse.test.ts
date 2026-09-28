import { describe, expect, it } from 'vitest';

import { formatMalformedEvent, formatSseEvent } from './sse.js';

describe('formatSseEvent', () => {
  it('frames id, event and JSON data, terminated by a blank line', () => {
    expect(formatSseEvent(7, { type: 'token', data: { text: ' Lisbon' } })).toBe(
      'id: 7\nevent: token\ndata: {"text":" Lisbon"}\n\n',
    );
  });

  it('keeps multi-line text on a single data line', () => {
    const frame = formatSseEvent(1, { type: 'token', data: { text: 'a\nb' } });
    expect(frame).toBe('id: 1\nevent: token\ndata: {"text":"a\\nb"}\n\n');
  });
});

describe('formatMalformedEvent', () => {
  it('is well framed but carries data that is not valid JSON', () => {
    const frame = formatMalformedEvent(3);
    expect(frame.endsWith('\n\n')).toBe(true);
    const data = /^data: (.*)$/m.exec(frame)?.[1] ?? '';
    expect(() => JSON.parse(data) as unknown).toThrow(SyntaxError);
  });
});
