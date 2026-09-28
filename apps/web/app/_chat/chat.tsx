'use client';

import { ChatStreamError, streamChat } from '@tripwise/chat-runtime';
import { useEffect, useRef, useState } from 'react';

import styles from './chat.module.css';
import { Composer } from './composer';
import { EmptyState } from './empty-state';
import { PlaneIcon, PlusIcon } from './icons';
import { AssistantReply, UserBubble } from './message';
import { SettingsMenu } from './settings-menu';
import { appendText, type AssistantMessage, type DebugSettings, type Message } from './types';

// The mock server from apps/mock-server (run both with `pnpm dev`).
const CHAT_URL = 'http://localhost:4000/chat';

// Within this distance of the bottom, keep following new tokens.
const STICK_THRESHOLD_PX = 80;

function buildUrl({ fail, tokenDelay, startDelay }: DebugSettings): string {
  const params = new URLSearchParams({
    tokenDelay: String(tokenDelay),
    startDelay: String(startDelay),
  });
  if (fail) params.set('fail', fail);
  return `${CHAT_URL}?${params.toString()}`;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [debug, setDebug] = useState<DebugSettings>({ fail: '', tokenDelay: 40, startDelay: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Follow the stream, unless the user has scrolled up to read something.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  }

  async function streamReply(assistantId: number, prompt: string) {
    const updateReply = (change: (message: AssistantMessage) => AssistantMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId && m.role === 'assistant' ? change(m) : m)),
      );
    };

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    stickToBottom.current = true;

    try {
      const events = streamChat({
        url: buildUrl(debug),
        message: prompt,
        signal: controller.signal,
      });
      for await (const event of events) {
        switch (event.type) {
          case 'token':
            updateReply((m) => ({ ...m, parts: appendText(m.parts, event.data.text) }));
            break;
          case 'tool_call':
            updateReply((m) => ({
              ...m,
              parts: [...m.parts, { kind: 'tool', ...event.data, result: undefined, done: false }],
            }));
            break;
          case 'tool_result':
            updateReply((m) => ({
              ...m,
              parts: m.parts.map((p) =>
                p.kind === 'tool' && p.id === event.data.id
                  ? { ...p, result: event.data.result, done: true }
                  : p,
              ),
            }));
            break;
          case 'error':
            updateReply((m) => ({ ...m, status: 'error', error: event.data.message }));
            break;
          case 'done':
            updateReply((m) => ({ ...m, status: 'done' }));
            break;
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        updateReply((m) => ({ ...m, status: 'stopped' }));
      } else {
        const message = error instanceof ChatStreamError ? error.message : 'Something went wrong.';
        updateReply((m) => ({ ...m, status: 'error', error: message }));
      }
    } finally {
      // A newer request may have replaced this one (e.g. "New chat"); only clear our own.
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsStreaming(false);
      }
    }
  }

  function send(text: string) {
    if (isStreaming) return;
    const userId = nextId.current++;
    const assistantId = nextId.current++;
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', text },
      { id: assistantId, role: 'assistant', parts: [], status: 'streaming', error: null },
    ]);
    void streamReply(assistantId, text);
  }

  /** Re-runs a failed or stopped reply in place, using the user message before it. */
  function retry(assistantId: number) {
    if (isStreaming) return;
    const index = messages.findIndex((m) => m.id === assistantId);
    const prompt = messages[index - 1];
    if (prompt?.role !== 'user') return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId && m.role === 'assistant'
          ? { ...m, parts: [], status: 'streaming', error: null }
          : m,
      ),
    );
    void streamReply(assistantId, prompt.text);
  }

  function newChat() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setMessages([]);
  }

  return (
    <div className={styles['shell']}>
      <header className={styles['header']}>
        <div className={styles['brand']}>
          <div className={styles['brandMark']} aria-hidden="true">
            <PlaneIcon size={16} />
          </div>
          <h1 className={styles['brandName']}>
            Trip<em>wise</em>
          </h1>
          <span className={styles['brandTagline']}>Travel desk</span>
        </div>
        <div className={styles['headerActions']}>
          <SettingsMenu settings={debug} onChange={setDebug} />
          <button type="button" className={styles['newTrip']} onClick={newChat}>
            <PlusIcon size={16} /> New trip
          </button>
        </div>
      </header>

      <div ref={scrollerRef} className={styles['scroller']} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <EmptyState onPick={send} />
        ) : (
          <div className={styles['thread']} role="log" aria-live="polite" aria-busy={isStreaming}>
            {messages.map((m) =>
              m.role === 'user' ? (
                <UserBubble key={m.id} message={m} />
              ) : (
                <AssistantReply
                  key={m.id}
                  message={m}
                  canRetry={!isStreaming}
                  onRetry={() => {
                    retry(m.id);
                  }}
                />
              ),
            )}
          </div>
        )}
      </div>

      <footer className={styles['footer']}>
        <Composer
          isStreaming={isStreaming}
          onSend={send}
          onStop={() => abortRef.current?.abort()}
        />
        <p className={styles['disclaimer']}>
          Replies come from a local mock server. Use the settings menu to simulate failures.
        </p>
      </footer>
    </div>
  );
}
