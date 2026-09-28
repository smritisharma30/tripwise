import type { ChatEvent } from './sse.js';

// Split into word-sized chunks with the leading space attached (" flights"), which is
// how real LLM tokens tend to arrive. Clients must concatenate, not join with spaces.
function tokens(text: string): ChatEvent[] {
  return (text.match(/\s*\S+/g) ?? []).map((chunk) => ({ type: 'token', data: { text: chunk } }));
}

export const scenario: readonly ChatEvent[] = [
  ...tokens('Let me look up flights from London to Lisbon for you.'),
  {
    type: 'tool_call',
    data: {
      id: 'call_1',
      name: 'search_flights',
      args: { from: 'LHR', to: 'LIS', date: '2026-10-14' },
    },
  },
  {
    type: 'tool_result',
    data: {
      id: 'call_1',
      result: {
        flights: [
          { airline: 'TAP', departs: '07:15', priceEur: 89 },
          { airline: 'British Airways', departs: '12:40', priceEur: 134 },
        ],
      },
    },
  },
  ...tokens(' I found 2 options. The cheapest is TAP at €89, departing at 07:15.'),
  { type: 'done', data: { reason: 'complete' } },
];
