import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

import { parseStreamOptions, type StreamOptions } from './options.js';
import { scenario } from './scenario.js';
import { formatMalformedEvent, formatSseEvent } from './sse.js';

const ALLOWED_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:3000';

export function createMockServer(): Server {
  return createServer((req, res) => {
    handleRequest(req, res).catch((error: unknown) => {
      console.error('[mock-server] unhandled error', error);
      if (res.headersSent) res.destroy();
      else sendJson(res, 500, { error: 'internal_error' });
    });
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (url.pathname !== '/chat') {
    sendJson(res, 404, { error: 'not_found' });
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const parsed = parseStreamOptions(url.searchParams, scenario.length);
  if (!parsed.ok) {
    sendJson(res, 400, { error: 'invalid_query', message: parsed.error });
    return;
  }

  // The body (the user's message) is ignored, but it must still be drained so Node can
  // reuse the keep-alive socket.
  req.resume();

  await streamScenario(res, parsed.options);
}

async function streamScenario(res: ServerResponse, options: StreamOptions): Promise<void> {
  // Fires when the client disconnects (or we end/destroy the response). Listen on `res`,
  // not `req`: req's 'close' fires as soon as the request body has been read.
  const controller = new AbortController();
  res.on('close', () => {
    controller.abort();
  });
  const { signal } = controller;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Stops nginx-style proxies from buffering the stream.
    'X-Accel-Buffering': 'no',
  });
  // Send the status line and headers now, so the client's fetch() resolves even
  // during a slow start.
  res.flushHeaders();

  let nextId = 1;
  try {
    if (options.startDelayMs > 0) await sleep(options.startDelayMs, undefined, { signal });

    for (const [index, event] of scenario.entries()) {
      if (index > 0) await sleep(options.tokenDelayMs, undefined, { signal });

      if (options.fail !== null && index === options.failAt) {
        switch (options.fail) {
          case 'drop':
            // Kill the socket with no terminating chunk: a transport-level failure.
            res.destroy();
            return;
          case 'error':
            // A well-formed, in-band error: an application-level failure.
            res.end(
              formatSseEvent(nextId, {
                type: 'error',
                data: { code: 'upstream_unavailable', message: 'The model provider timed out.' },
              }),
            );
            return;
          case 'malformed':
            // Inject a bad frame, then carry on so the client can prove it recovers.
            res.write(formatMalformedEvent(nextId++));
            break;
        }
      }

      // Events here are tiny, so we ignore write() backpressure (its boolean return).
      res.write(formatSseEvent(nextId++, event));
    }
    res.end();
  } catch (error) {
    // sleep() rejects with an AbortError once the client has gone; that's expected.
    if (signal.aborted) return;
    throw error;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
}
