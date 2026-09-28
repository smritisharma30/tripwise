# Chat streaming protocol

Contract between `apps/mock-server` (producer) and `@tripwise/chat-runtime` (consumer).

## Request

```
POST /chat?tokenDelay=40&startDelay=0&fail=<mode>&failAt=<n>
Content-Type: application/json
```

The body is currently ignored by the mock.

| Param        | Default    | Meaning                                              |
| ------------ | ---------- | ---------------------------------------------------- |
| `tokenDelay` | `40`       | ms between events (0–30000)                          |
| `startDelay` | `0`        | ms after headers, before the first event (0–30000)   |
| `fail`       | none       | `drop`, `malformed` or `error`                       |
| `failAt`     | mid-stream | 0-based scenario index where the failure is injected |

Invalid values return `400` with `{ "error": "invalid_query", "message": "..." }`.

## Response

```
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Transfer-Encoding: chunked
```

Each event is framed as below and terminated by a blank line (`\n\n`):

```
id: <integer, increasing from 1>
event: <type>
data: <single-line JSON>
```

## Event types

| `event`       | `data`                                                     | Terminal? |
| ------------- | ---------------------------------------------------------- | --------- |
| `token`       | `{ "text": string }` (leading space included; concatenate) | no        |
| `tool_call`   | `{ "id": string, "name": string, "args": object }`         | no        |
| `tool_result` | `{ "id": string, "result": unknown }` (`id` matches call)  | no        |
| `done`        | `{ "reason": "complete" }`                                 | yes       |
| `error`       | `{ "code": string, "message": string }`                    | yes       |

A healthy stream ends with exactly one terminal event, then the server closes the response.

## Failure modes

| `fail`      | What the wire shows                                                        | Class       |
| ----------- | -------------------------------------------------------------------------- | ----------- |
| `drop`      | Stream stops mid-way; socket closed with no terminal event                 | transport   |
| `malformed` | One extra `token` event whose `data` is not valid JSON, then normal stream | parsing     |
| `error`     | An `error` event, then a clean close                                       | application |
| (slow)      | `startDelay`: headers arrive at once, first event arrives late             | latency     |

## Notes for the client

- Browser `EventSource` supports GET only, so this endpoint is consumed with `fetch()` and
  the response body's `ReadableStream`.
- Network chunks do not align with events: one read may contain half an event, or several.
