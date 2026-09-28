import { useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react';

import { SendIcon, StopIcon } from './icons';
import styles from './chat.module.css';

interface ComposerProps {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

const MAX_HEIGHT_PX = 200;

export function Composer({ isStreaming, onSend, onStop }: ComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${String(Math.min(el.scrollHeight, MAX_HEIGHT_PX))}px`;
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setValue('');
    requestAnimationFrame(resize);
  }

  // Enter sends, Shift+Enter inserts a newline. Skip while an IME is composing
  // (e.g. Japanese input), where Enter confirms the character instead.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className={styles['composer']} onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className={styles['composerInput']}
        value={value}
        rows={1}
        placeholder="Where do you want to go?"
        aria-label="Message Tripwise"
        autoFocus
        onChange={(event) => {
          setValue(event.target.value);
          resize();
        }}
        onKeyDown={handleKeyDown}
      />
      {isStreaming ? (
        <button
          type="button"
          className={styles['composerButton']}
          onClick={onStop}
          aria-label="Stop generating"
        >
          <StopIcon />
        </button>
      ) : (
        <button
          type="submit"
          className={styles['composerButton']}
          disabled={!value.trim()}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      )}
    </form>
  );
}
