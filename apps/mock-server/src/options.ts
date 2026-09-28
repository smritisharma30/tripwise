export const FAILURE_MODES = ['drop', 'malformed', 'error'] as const;
export type FailureMode = (typeof FAILURE_MODES)[number];

export interface StreamOptions {
  tokenDelayMs: number;
  /** Delay after headers are sent, before the first event (simulates a slow model). */
  startDelayMs: number;
  fail: FailureMode | null;
  /** Index into the scenario at which the failure is injected. */
  failAt: number;
}

export type ParseResult = { ok: true; options: StreamOptions } | { ok: false; error: string };

const MAX_DELAY_MS = 30_000;

function isFailureMode(value: string): value is FailureMode {
  return (FAILURE_MODES as readonly string[]).includes(value);
}

function parseInteger(
  params: URLSearchParams,
  name: string,
  fallback: number,
  max: number,
): number | string {
  const raw = params.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(value) || value < 0 || value > max) {
    return `${name} must be an integer between 0 and ${String(max)}`;
  }
  return value;
}

/**
 * Reads ?tokenDelay, ?startDelay, ?fail, ?failAt. Invalid values are rejected rather than
 * silently defaulted, so a typo like ?fail=dorp can't quietly run the happy path.
 */
export function parseStreamOptions(params: URLSearchParams, eventCount: number): ParseResult {
  const tokenDelayMs = parseInteger(params, 'tokenDelay', 40, MAX_DELAY_MS);
  if (typeof tokenDelayMs === 'string') return { ok: false, error: tokenDelayMs };

  const startDelayMs = parseInteger(params, 'startDelay', 0, MAX_DELAY_MS);
  if (typeof startDelayMs === 'string') return { ok: false, error: startDelayMs };

  const failAt = parseInteger(params, 'failAt', Math.floor(eventCount / 2), eventCount - 1);
  if (typeof failAt === 'string') return { ok: false, error: failAt };

  const rawFail = params.get('fail');
  if (rawFail !== null && !isFailureMode(rawFail)) {
    return { ok: false, error: `fail must be one of: ${FAILURE_MODES.join(', ')}` };
  }

  return { ok: true, options: { tokenDelayMs, startDelayMs, fail: rawFail, failAt } };
}
