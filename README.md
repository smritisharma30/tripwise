# Tripwise

An AI trip-planning assistant with a streaming chat interface.

## Repository layout

| Path                    | Package                  | Purpose                                          |
| ----------------------- | ------------------------ | ------------------------------------------------ |
| `apps/web`              | `@tripwise/web`          | Next.js (App Router) front end                   |
| `apps/mock-server`      | `@tripwise/mock-server`  | Fake SSE chat backend with failure injection     |
| `packages/chat-runtime` | `@tripwise/chat-runtime` | Streaming chat client: SSE parser + typed events |
| `docs/sse-protocol.md`  |                          | Wire contract between the server and the client  |
| `docs/decisions`        |                          | Architecture decision records                    |

All packages are private and are not published to npm.

## Getting started

Requires Node 22.12+ (see `.nvmrc`). pnpm is pinned through `packageManager` and
provided by corepack.

```sh
corepack enable
pnpm install
pnpm dev          # web on :3000, mock server on :4000
```

Try the stream directly:

```sh
curl -N -X POST 'http://localhost:4000/chat'
curl -N -X POST 'http://localhost:4000/chat?fail=drop&failAt=5'
```

## Scripts

| Command             | What it does                            |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | Run all apps in watch mode              |
| `pnpm build`        | Production build                        |
| `pnpm lint`         | ESLint (type-aware) across all packages |
| `pnpm typecheck`    | `tsc --noEmit` across all packages      |
| `pnpm test`         | Vitest across all packages              |
| `pnpm format:check` | Prettier check                          |

## Architecture

_To be written._
