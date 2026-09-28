// UI state for the chat. An assistant reply is a list of parts so text and tool activity
// render in the order they streamed in (text → tool card → more text).

export interface TextPart {
  kind: 'text';
  text: string;
}

export interface ToolPart {
  kind: 'tool';
  id: string;
  name: string;
  args: Record<string, unknown>;
  result: unknown;
  done: boolean;
}

export type Part = TextPart | ToolPart;

export type ReplyStatus = 'streaming' | 'done' | 'error' | 'stopped';

export interface UserMessage {
  id: number;
  role: 'user';
  text: string;
}

export interface AssistantMessage {
  id: number;
  role: 'assistant';
  parts: Part[];
  status: ReplyStatus;
  error: string | null;
}

export type Message = UserMessage | AssistantMessage;

/** Query params understood by the mock server, for exercising failure modes. */
export interface DebugSettings {
  fail: '' | 'drop' | 'malformed' | 'error';
  tokenDelay: number;
  startDelay: number;
}

/**
 * Appends a streamed token, extending the last text part or starting a new one. Tokens carry
 * their leading space (" I found"), which would indent a new paragraph, so trim that off.
 */
export function appendText(parts: Part[], text: string): Part[] {
  const last = parts.at(-1);
  if (last?.kind === 'text') {
    return [...parts.slice(0, -1), { kind: 'text', text: last.text + text }];
  }
  return [...parts, { kind: 'text', text: text.trimStart() }];
}
