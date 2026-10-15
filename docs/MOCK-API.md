# Independent prototype API

This is an independently defined mock contract, **not Claude's API**. The interface uses `fetch` against `/api/prototype/v1`. A module service worker handles these same-origin requests and persists data in browser IndexedDB (`prototype-api-v1`). No requests reach Anthropic, no AI model runs, and terminal/file operations never access the host filesystem.

The same Request → Response handler runs in a real local Node HTTP server that also serves the built app from `dist/` on the same origin:

```sh
VITE_MOCK_API_BASE_URL=/api/prototype/v1 npm run build
MOCK_API_PORT=4188 node scripts/mock-api-server.mjs
# Open http://127.0.0.1:4188/
curl http://127.0.0.1:4188/api/prototype/v1/health
curl -X POST http://127.0.0.1:4188/api/prototype/v1/sessions \
  -H 'Content-Type: application/json' -d '{"title":"Example"}'
```

The build variable selects the real same-origin HTTP adapter and disables worker registration. Use a **fresh port/origin** to avoid a previously installed service worker intercepting the example server. Afterward, build without that variable for the normal static-hosted worker version.

The Node example binds loopback only and uses memory storage; restarting it clears its backend data. `MOCK_API_PORT` defaults to 4175. The static server restricts reads to the built `dist/` tree, checks symlink destinations, serves MIME types, and falls back to the SPA for extensionless paths. It never serves repository source or arbitrary local files.

A same-origin reverse proxy remains an option for a separate backend. Cross-origin API URLs are rejected. Do not enter production credentials; this server has no authentication and is a local example.

## Routes

All request/response bodies are JSON except the optional SSE snapshot. Errors use `{ "error": { "code": "INVALID_REQUEST", "message": "..." } }` and an HTTP status. Bodies are bounded to 1 MiB; invalid JSON and unsafe keys are rejected.

| Method / route | Behavior |
| --- | --- |
| `GET /health` | Mock mode and explicit `executesCommands:false` |
| `GET /workspace` | Full `{uiState, sessions, tasks, settings, updatedAt}`; 404 until initialized |
| `PUT /workspace` | `{uiState}` maps `cw.*` keys to raw JSON strings; synchronizes sessions/settings/tasks/files and preserves runs |
| `GET, POST /sessions` | List `{sessions}` / create `{title,project?}` → `{session}` |
| `GET, PATCH, DELETE /sessions/:id` | Read, rename/project/archive/pin patch, delete |
| `POST /sessions/:id/fork` | Independent deep copy with a new ID |
| `POST /sessions/:id/messages` | `{prompt,permission?}` appends user message and returns pending `{run:{id,status}}` |
| `POST /runs` | `{sessionId?,prompt,permission?,model?,effort?,channel?}`; unknown primary session IDs create minimal local sessions; secondary sessions remain isolated |
| `GET, DELETE /runs/:id` | Poll or cancel a run; completion occurs after 1.4 seconds and appends one scripted reply |
| `GET /runs/:id/events` | One SSE status snapshot per request, not a continuous model token stream |
| `GET /files` | List virtual files |
| `GET, PUT /files?path=src/example.ts` | Read/write `{content}` in virtual storage; relative paths only, maximum 256 KiB per file |
| `GET, POST /tasks` | List/create inert schedule records `{name,time?,enabled?}` |
| `GET, PATCH, DELETE /tasks/:id` | Read/edit/delete records; schedules never execute |
| `GET, PATCH /settings` | Read `{settings}`; merge string/boolean preference values |
| `POST /terminal` | `{command}` supports simulated `help`, `pwd`, `ls`, `clear`; everything else explicitly remains unexecuted |

Collections, records, and runs use the named envelopes shown above. Workspace is returned directly. Mutations update its monotonically increasing `updatedAt` to support reload reconciliation. Completed secondary replies update only their matching `cw.splitSession` entry and are idempotent; cancellation appends nothing. Local UI storage remains a fallback copy; API state can restore it.

## Limited event adapter

`POST /sessions/:id/events` accepts `{events:[{payload:event}]}`. The prototype supports text-only `{type:"user",uuid,message:{role:"user",content:"..."}}` and `{type:"control_request",request_id,request:{subtype:"interrupt"}}`. Interrupt cancels pending runs belonging to that session. Up to 16 events can be sent per request. Other event types are rejected.

These event names/envelope patterns were observed in the desktop resources (see `API-EVIDENCE.md`), but the endpoint, replies, validation, authorization, lifecycle, and supported subset are our own. This does not establish compatibility with Claude's service, and it must not be presented as a drop-in Claude backend.

## Tests

`tests/api.spec.ts` validates the shared handler, concurrent mutations, input errors, traversal rejection, deterministic runs, cancellation, event subset, virtual terminal behavior, and persistent browser-worker fetches. The existing UI tests additionally exercise the fetch-based message flow and preference persistence. Run the pinned suite with `node scripts/visual-tests.mjs interactions`.
