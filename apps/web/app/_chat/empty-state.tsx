import type { ComponentType } from 'react';

import styles from './chat.module.css';
import { MapIcon, PlaneIcon, SuitcaseIcon, SunIcon } from './icons';

interface Suggestion {
  kicker: string;
  text: string;
  Icon: ComponentType<{ size?: number }>;
}

const SUGGESTIONS: Suggestion[] = [
  {
    kicker: 'Flights',
    text: 'Find me cheap flights from London to Lisbon',
    Icon: PlaneIcon,
  },
  {
    kicker: 'Weekend',
    text: 'Plan a 3-day weekend in Lisbon',
    Icon: SuitcaseIcon,
  },
  {
    kicker: 'Inspiration',
    text: 'Where is warm to visit in December?',
    Icon: SunIcon,
  },
  {
    kicker: 'Itinerary',
    text: 'Build a Tokyo itinerary on a budget',
    Icon: MapIcon,
  },
];

const ROUTE = 'M10 60 Q160 -20 310 60';

function FlightPath() {
  return (
    <svg className={styles['flightPath']} viewBox="0 0 320 70" aria-hidden="true">
      <defs>
        <linearGradient id="flight-path-gradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#ec3d7f" />
        </linearGradient>
      </defs>
      <path
        className={styles['flightPathLine']}
        d={ROUTE}
        stroke="url(#flight-path-gradient)"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <circle className={styles['flightPathFrom']} cx="10" cy="60" r="5" />
      <circle className={styles['flightPathTo']} cx="310" cy="60" r="5" />
      {/* CSS moves this along the same path (offset-path) and rotates it to face forward. */}
      <g className={styles['flightPathPlane']}>
        <path d="M-9 0 L7 0 M1 -7 L4 0 L1 7 M-7 -3 L-6 0 L-7 3" fill="none" />
      </g>
    </svg>
  );
}

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className={styles['empty']}>
      <FlightPath />
      <p className={styles['eyebrow']}>
        <span className={styles['eyebrowDot']} aria-hidden="true" />
        Your travel desk
      </p>
      <h2 className={styles['emptyTitle']}>
        Where to <em>next</em>?
      </h2>
      <p className={styles['emptySubtitle']}>
        Tell me where you&rsquo;re dreaming of. I&rsquo;ll find flights, compare options and sketch
        out the days.
      </p>
      <div className={styles['suggestions']}>
        {SUGGESTIONS.map(({ kicker, text, Icon }) => (
          <button
            key={text}
            type="button"
            className={styles['suggestion']}
            onClick={() => {
              onPick(text);
            }}
          >
            <span className={styles['suggestionIcon']} aria-hidden="true">
              <Icon size={20} />
            </span>
            <span className={styles['suggestionCopy']}>
              <span className={styles['suggestionKicker']}>{kicker}</span>
              <span className={styles['suggestionText']}>{text}</span>
            </span>
            <span className={styles['suggestionArrow']} aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
