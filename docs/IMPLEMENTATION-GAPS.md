# Fidelity boundary for v1.2.0

This prototype is independently implemented. Screenshot regression success means the prototype did not change unexpectedly; it does not mean every pixel or behavior equals Claude.

| Area | Implemented and checked | Remaining difference |
| --- | --- | --- |
| General settings | Same measured dialog, navigation width, row heights, section baselines, segmented controls; iterative same-viewport macOS captures | Proprietary font glyphs, some icons and native dropdown chevrons; desktop-only navigation entries retained |
| Menus | Anchored popups, nested effort, pointer/keyboard traversal, Escape/focus return, checked states | Unobserved model catalogs are explicitly unavailable, not invented |
| Splits | Independent sessions/forks, resizable right/below panes, focus, persistence, cancellable API requests | Not a reconstruction of every native transport or window mode |
| Messages | Per-session asynchronous mock runs, completion, stop acknowledgement, durable transcript snapshots | Scripted responses; optional SSE route is a status snapshot, not real token streaming |
| Files/terminal | Virtual-file reads/writes through endpoints and simulated command responses | No host filesystem or shell execution |
| Settings/tasks/customization | Local UI preferences and workspace persistence through the mock API | Schedules do not execute; real billing, authentication, connectors, permissions and notifications are not implemented services |
| Backend example | Shared browser-worker/IndexedDB and Node HTTP handler; typed adapter; validation and API tests | Independent routes and schemas, no Claude wire-compatibility guarantee; Node example is memory-only and unauthenticated loopback |
| Source audit | Hashed package resources, scoped call-site evidence, visible web measurements | Private server implementation, live auth/stream negotiation and all feature gates remain unknown |

See WEB-UX-AUDIT.md for the screenshot comparison, API-EVIDENCE.md for observed contracts, MOCK-API.md for the runnable endpoint example, and ../TESTING.md for repeatable checks.
