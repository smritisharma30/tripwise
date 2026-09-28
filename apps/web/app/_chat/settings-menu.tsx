import { SettingsIcon } from './icons';
import styles from './chat.module.css';
import type { DebugSettings } from './types';

interface SettingsMenuProps {
  settings: DebugSettings;
  onChange: (settings: DebugSettings) => void;
}

/** Mock-server knobs (failure injection, delays). A native <details> popover, no JS needed. */
export function SettingsMenu({ settings, onChange }: SettingsMenuProps) {
  return (
    <details className={styles['settings']}>
      <summary className={styles['iconButton']} aria-label="Mock server settings">
        <SettingsIcon />
      </summary>
      <div className={styles['settingsPanel']}>
        <p className={styles['settingsTitle']}>Mock server</p>
        <label className={styles['field']}>
          Failure mode
          <select
            value={settings.fail}
            onChange={(e) => {
              onChange({ ...settings, fail: e.target.value as DebugSettings['fail'] });
            }}
          >
            <option value="">None</option>
            <option value="drop">Drop connection</option>
            <option value="malformed">Malformed event</option>
            <option value="error">Error event</option>
          </select>
        </label>
        <label className={styles['field']}>
          Token delay (ms)
          <input
            type="number"
            min={0}
            step={10}
            value={settings.tokenDelay}
            onChange={(e) => {
              onChange({ ...settings, tokenDelay: e.target.valueAsNumber || 0 });
            }}
          />
        </label>
        <label className={styles['field']}>
          Start delay (ms)
          <input
            type="number"
            min={0}
            step={500}
            value={settings.startDelay}
            onChange={(e) => {
              onChange({ ...settings, startDelay: e.target.valueAsNumber || 0 });
            }}
          />
        </label>
      </div>
    </details>
  );
}
