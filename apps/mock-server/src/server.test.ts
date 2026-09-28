import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { scenario } from './scenario.js';
import { createMockServer } from './server.js';

// These tests inspect raw stream text with regexes on purpose: real SSE parsing belongs
// in @tripwise/chat-runtime.

const server = createMockServer();
let baseUrl = '';

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${String((server.address() as AddressInfo).port)}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const chat = (query = '') => fetch(`${baseUrl}/chat?tokenDelay=0&${query}`, { method: 'POST' });
const eventTypes = (body: string) => [...body.matchAll(/^event: (.+)$/gm)].map((m) => m[1]);
const ids = (body: string) => [...body.matchAll(/^id: (\d+)$/gm)].map((m) => Number(m[1]));

describe('POST /chat', () => {
  it('streams the full scenario and ends with done', async () => {
    const res = await chat();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');

    const body = await res.text();
    expect(eventTypes(body)).toEqual(scenario.map((e) => e.type));
    expect(ids(body)).toEqual(scenario.map((_, i) => i + 1));
  });

  it('fail=error ends cleanly with an error event and no done', async () => {
    const body = await (await chat('fail=error&failAt=3')).text();
    expect(eventTypes(body)).toEqual(['token', 'token', 'token', 'error']);
  });

  it('fail=malformed injects one bad frame and keeps streaming', async () => {
    const body = await (await chat('fail=malformed&failAt=2')).text();
    expect(body).toContain('data: {"text": "unterminated\n\n');
    expect(eventTypes(body)).toHaveLength(scenario.length + 1);
    expect(eventTypes(body).at(-1)).toBe('done');
  });

  it('fail=drop cuts the connection mid-stream', async () => {
    const res = await chat('fail=drop&failAt=3');
    expect(res.status).toBe(200);
    await expect(res.text()).rejects.toThrow();
  });

  it('startDelay sends headers immediately but delays the first event', async () => {
    const res = await chat('startDelay=200');
    if (!res.body) throw new Error('expected a streaming body');
    const reader = res.body.getReader();
    const start = performance.now();
    await reader.read();
    expect(performance.now() - start).toBeGreaterThanOrEqual(150);
    await reader.cancel();
  });

  it('rejects invalid query params with 400', async () => {
    const res = await chat('fail=dorp');
    expect(res.status).toBe(400);
  });

  it('answers CORS preflight', async () => {
    const res = await fetch(`${baseUrl}/chat`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
  });

  it('returns 405 for GET and 404 for unknown paths', async () => {
    expect((await fetch(`${baseUrl}/chat`)).status).toBe(405);
    expect((await fetch(`${baseUrl}/nope`, { method: 'POST' })).status).toBe(404);
  });
});
