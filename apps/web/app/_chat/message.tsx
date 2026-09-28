import { PlaneIcon, RetryIcon } from './icons';
import styles from './chat.module.css';
import { ToolCard } from './tool-card';
import type { AssistantMessage, UserMessage } from './types';

export function UserBubble({ message }: { message: UserMessage }) {
  return (
    <div className={styles['userRow']}>
      <div className={styles['userBubble']}>{message.text}</div>
    </div>
  );
}

interface AssistantReplyProps {
  message: AssistantMessage;
  onRetry: () => void;
  canRetry: boolean;
}

export function AssistantReply({ message, onRetry, canRetry }: AssistantReplyProps) {
  const { parts, status } = message;
  const isStreaming = status === 'streaming';
  const lastPart = parts.at(-1);

  return (
    <div className={styles['assistantRow']}>
      <div className={styles['avatar']} aria-hidden="true">
        <PlaneIcon size={16} />
      </div>
      <div className={styles['assistantBody']}>
        <span className={styles['srOnly']}>Tripwise:</span>

        {isStreaming && parts.length === 0 && (
          <div className={styles['typing']} aria-label="Tripwise is typing">
            <span />
            <span />
            <span />
          </div>
        )}

        {parts.map((part, index) =>
          part.kind === 'text' ? (
            <p key={index} className={styles['text']}>
              {part.text}
              {isStreaming && part === lastPart && (
                <span className={styles['caret']} aria-hidden="true" />
              )}
            </p>
          ) : (
            <ToolCard key={part.id} tool={part} />
          ),
        )}

        {status === 'error' && (
          <div className={styles['errorBox']} role="alert">
            <span>{message.error ?? 'Something went wrong.'}</span>
            {canRetry && (
              <button type="button" className={styles['retryButton']} onClick={onRetry}>
                <RetryIcon size={14} /> Retry
              </button>
            )}
          </div>
        )}

        {status === 'stopped' && (
          <div className={styles['stoppedNote']}>
            <span>Stopped</span>
            {canRetry && (
              <button type="button" className={styles['retryButton']} onClick={onRetry}>
                <RetryIcon size={14} /> Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
