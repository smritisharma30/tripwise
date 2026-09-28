import { describe, expect, it } from 'vitest';

import { parseStreamOptions } from './options.js';

const parse = (query: string) => parseStreamOptions(new URLSearchParams(query), 20);

describe('parseStreamOptions', () => {
  it('applies defaults', () => {
    expect(parse('')).toEqual({
      ok: true,
      options: { tokenDelayMs: 40, startDelayMs: 0, fail: null, failAt: 10 },
    });
  });

  it('reads every parameter', () => {
    expect(parse('tokenDelay=5&startDelay=2000&fail=drop&failAt=3')).toEqual({
      ok: true,
      options: { tokenDelayMs: 5, startDelayMs: 2000, fail: 'drop', failAt: 3 },
    });
  });

  it.each([
    'tokenDelay=-1',
    'tokenDelay=1.5',
    'tokenDelay=abc',
    'tokenDelay=',
    'startDelay=999999',
    'failAt=20',
    'fail=dorp',
  ])('rejects %s', (query) => {
    expect(parse(query).ok).toBe(false);
  });
});
