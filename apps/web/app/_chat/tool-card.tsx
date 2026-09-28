import { CheckIcon, PlaneIcon } from './icons';
import styles from './chat.module.css';
import type { ToolPart } from './types';

interface Flight {
  airline: string;
  departs: string;
  priceEur: number;
}

// Tool results are `unknown` on the wire, so check the shape before rendering it as flights.
function isFlightResult(result: unknown): result is { flights: Flight[] } {
  if (typeof result !== 'object' || result === null || !('flights' in result)) return false;
  return Array.isArray(result.flights);
}

const priceFormat = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function ToolCard({ tool }: { tool: ToolPart }) {
  if (tool.name === 'search_flights') return <FlightSearch tool={tool} />;

  return (
    <details className={styles['toolCard']}>
      <summary className={styles['toolStatus']}>
        {tool.done ? <CheckIcon size={14} /> : <span className={styles['spinner']} />}
        {tool.done ? 'Used' : 'Using'} <code>{tool.name}</code>
      </summary>
      <pre className={styles['toolJson']}>
        {JSON.stringify({ args: tool.args, result: tool.result }, null, 2)}
      </pre>
    </details>
  );
}

function FlightSearch({ tool }: { tool: ToolPart }) {
  const from = typeof tool.args['from'] === 'string' ? tool.args['from'] : '???';
  const to = typeof tool.args['to'] === 'string' ? tool.args['to'] : '???';
  const date = formatDate(typeof tool.args['date'] === 'string' ? tool.args['date'] : null);
  const flights = isFlightResult(tool.result) ? tool.result.flights : [];
  const cheapest = Math.min(...flights.map((f) => f.priceEur));

  return (
    <section className={styles['flightSearch']} aria-label={`Flights from ${from} to ${to}`}>
      <p className={styles['toolStatus']}>
        {tool.done ? (
          <PlaneIcon size={14} />
        ) : (
          <span className={styles['spinner']} aria-hidden="true" />
        )}
        {tool.done
          ? `${String(flights.length)} flights found`
          : `Searching flights ${from} → ${to}…`}
      </p>

      {tool.done ? (
        flights.map((flight) => (
          <BoardingPass
            key={`${flight.airline}-${flight.departs}`}
            flight={flight}
            from={from}
            to={to}
            date={date}
            isBest={flight.priceEur === cheapest}
          />
        ))
      ) : (
        <div className={[styles['pass'], styles['passLoading']].join(' ')} aria-hidden="true" />
      )}
    </section>
  );
}

interface BoardingPassProps {
  flight: Flight;
  from: string;
  to: string;
  date: string | null;
  isBest: boolean;
}

// Only the best-priced pass gets the accent colour, so the eye goes straight to it.
function BoardingPass({ flight, from, to, date, isBest }: BoardingPassProps) {
  return (
    <article className={[styles['pass'], isBest ? styles['passBest'] : ''].join(' ')}>
      <div className={styles['passMain']}>
        <p className={styles['passAirline']}>{flight.airline}</p>
        <div className={styles['passRoute']}>
          <span className={styles['passCode']}>{from}</span>
          <span className={styles['passLine']} aria-hidden="true">
            <PlaneIcon size={14} />
          </span>
          <span className={styles['passCode']}>{to}</span>
        </div>
        <dl className={styles['passMeta']}>
          <div>
            <dt>Departs</dt>
            <dd>{flight.departs}</dd>
          </div>
          {date && (
            <div>
              <dt>Date</dt>
              <dd>{date}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className={styles['passStub']}>
        {isBest && <span className={styles['stamp']}>Best price</span>}
        <span className={styles['passPriceLabel']}>Fare</span>
        <span className={styles['passPrice']}>{priceFormat.format(flight.priceEur)}</span>
      </div>
    </article>
  );
}
