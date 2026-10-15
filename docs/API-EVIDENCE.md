# Code API and native boundary evidence

Static inspection of installed shipped resources, 2026-10-15. No requests to Claude services, account inspection, credentials, target execution, or proprietary implementation/assets copied. UTF-8 byte ranges below are zero-based and end-exclusive; identifiers are searchable source evidence, not a claim of public API support. REA provenance and extraction limitations are recorded in SOURCE-AUDIT.md. This focused follow-up directly inspects separately hashed files; it does not claim fresh REA evidence records.

## Observed contracts

The packaged application has multiple session transports. A mock should preserve this distinction in its internal model even if one local service handles them all.

| Operation | Shipped contract | Evidence |
|---|---|---|
| List Code sessions | GET `/v1/code/sessions`; repeated `tags`, `statuses`; optional `limit`, `cursor`, `include_trigger_sessions`, `only_trigger_sessions`, `hearth_channel_id`, `chat_project_id`, `trigger_id`. Parsed JSON may include `resume_token`. | HTTP [242880,243800) |
| Get Code session | GET `/v1/code/sessions/{id}`; optional `include_hearth_binding=true`. Decoder accepts `session`, or `response_shape` containing an `id`. | HTTP [41800,42400), [242400,242900) |
| Start | Creation builder supplies `title`, `events`, `tags`, either `environment_id` or `self_hosted_runner_pool_id`, and `session_context`. Context can include sources/outcomes, model, effort_level, permission_mode, tool restrictions and MCP configuration. A POST-to-base invocation follows the builder in the creation flow. This is a client shape, not a complete server schema. | HTTP [254800,256500), [256700,257700) |
| Submit event | POST `/v1/code/sessions/{id}/events`, JSON `{events:[{payload:...}]}`. Optional attestation and user-declared URLs exist. Feature-gated legacy branch posts `/v1/sessions/{id}/events` with unwrapped event values. | HTTP [248700,250600), [260600,261400) |
| Read event history | GET `/v1/code/sessions/{id}/events?limit=…&sort_order=…`, with optional cursor. Another drain path uses `/v1/sessions/{id}/events?limit=500&after_id=…`. Observed page values include `data`, `next_cursor`; event values include `event_id` and `payload`. | TRANSPORT [7700,8200), [159000,159700), [162400,163300) |
| Rename | PUT `/v1/code/sessions/{id}`, JSON `{title:...}`; transport also best-effort submits rename control event. | TRANSPORT [204200,204750) |
| Archive / restore | POST `/v1/code/sessions/{id}/archive` or `/unarchive`, JSON `{}`. | TRANSPORT [204700,205200) |
| Delete | DELETE `/v1/code/sessions/{id}`, JSON `{}`. | TRANSPORT [205100,205500) |
| Read marker | POST `/v1/code/sessions/{id}/mark_read`, JSON `{event_id:...}`. | HTTP [267400,268200) |
| Liveness | POST `/v1/code/sessions/{id}/ping`, optional `{cause:...}`. Heartbeat check path `/v1/code/sessions/heartbeat_check` has a parsed result with `checks_enabled`, and per-session outcomes `fresh`, `probe_dispatched`, `no_worker`, `recently_checked`, `unknown`. | HTTP [242180,242500); HEARTBEAT [148150,148650) |
| Synced file write | PUT `/v1/code/sessions/{id}/synced_file`, fields `path`, encoded `content`, optional `if_match_sha256`; successful response requires `content_sha256`; 409 has explicit conflict handling. The encoding helper was not fully traced. | HTTP [248000,248700) |

HTTP [41800,42400) supplies version `2023-06-01`, beta `ccr-byoc-2025-07-29`, client feature `ccr`, and organization UUID headers. ARTIFACT_CLIENT [2780,3200), [5490,5750) separately confirms credentials-included fetches, but that file is an artifact-comments client and must not be mistaken for the entire Code screen. No real header values were read.

## Message, stop and status semantics

TRANSPORT [200600,202500) builds a user event with `type:user`, UUID, session ID, null parent tool-use ID, and `message:{role:user,content:...}`. Content can be text or mixed blocks. Attachments, mentions, model/fast-mode controls and priority may accompany it. This is stronger evidence than assuming a conventional `/messages` endpoint.

Stop is a posted event with `type:control_request`, a request ID, and `request:{subtype:interrupt}`; optional `cancel_queued:true` is tracked separately. Stop receipt handling exists. Aborting a browser fetch alone would not implement this interaction. TRANSPORT [201880,202500).

Status mapping retains lifecycle status, worker status and connection status separately, then derives a session status/status bucket. List records retain title, environment, timestamps, unread flag, summaries, tags, origin, relations and context. HTTP [243800,245100). A local mock should distinguish connection loss from an agent that is running, idle, paused or archived; the complete enum mapping remains untraced.

The transport advertises capability flags such as cancelQueued, unarchive, fileSuggestions, fetchTail and context usage. A separate CLI-tail adapter explicitly rejects send, stop and rename with a read-only message. TRANSPORT [62700,64700), [176300,177100). Do not enable every button for every session type.

## Files are also live control RPC

TRANSPORT [173190,174350) requests `list_directory` with `path` over an active session connection and returns distinct unsupported, denied and unavailable states. Successful directory data may establish a root.

TRANSPORT [174400,175900) requests `read_file` with `path`, optional `max_bytes` and `encoding`. It validates paths against known roots (with separate explicitly uncontained handling), rejects malformed paths, races a timeout and distinguishes no handle, outside roots, empty response and rate limiting. Media reads request base64, reject truncated results, and construct a data URL. These controls cannot be faithfully represented by pretending every file is a public URL.

TRANSPORT [198750,200600) also contains `file_suggestions`, `get_workspace_diff` and branch-status operations. This audit establishes control subtype names and local routing, not the entire socket protocol. TERMINAL [3150,3500) independently establishes a terminal WebSocket URL choice between `/v1/code/sessions/{id}/terminal` and `/v2/ccr-sessions/{id}/terminal`; that does not prove conversation streaming uses the same route.

## Native IPC boundary

MAIN [1919600,1922800) declares the typed `LocalSessions` interface. Methods include start(info), forkSession(parentSessionId, optional sessionId/message UUID/target cwd), sendMessage(sessionId, message, optional images/tool states/attachments/priority/UUID/mentions and other options), setModel, setEffort, stop, interrupt, stopTask and retryStart. These are renderer-to-desktop method declarations, not HTTP routes.

MAIN [1925477,1927100) includes getTranscript(sessionId), getTranscriptTail(sessionId, limit), getTranscriptPage(sessionId, beforeUuid, limit, options), requestTranscriptPort(), readTranscript(request), searchSessions, readSessionFile, readSessionFileWithStatus and listSessionDirectory. MAIN [1939230,1939700) declares event notifications including onEvent, sessionViewRequest, sessionDirectoryChanged and onToolPermissionRequest. The transcript-port method is evidence of an additional transfer mechanism; this audit does not fully reconstruct serialization/channel names.

This complements the browser-native bridge evidence in `claude-evidence/native-excerpts.txt`: Chrome native messaging, framed JSON and Unix-domain bridge sockets serve a separate integration role and should not be conflated with the session REST API.

## Inferences for an independent mock implementation

A transport interface with session CRUD, transcript paging, event submission/subscription, interrupt, permission replies and workspace access would let the prototype use a local mock now and another authorized implementation later. Normalize session IDs at the transport boundary: the shipped HTTP helper changes the `session_` prefix to `cse_`. Preserve event UUIDs and request IDs for deduplication and stop acknowledgement. Keep draft restoration and retry state independent of streamed text.

These are design recommendations inferred from call sites, not claims that Claude supports an external replacement backend. Mock API paths can deliberately differ and must be labeled as independent prototype endpoints. Mock data should be synthetic; do not reuse account/session content, signing credentials, device attestations or private files.

## Unknown and unverified

- No server behavior, runtime feature gates, actual endpoint availability, authentication negotiation or backend authorization was tested.
- Creation-response completeness, all status enums, message ordering/replay guarantees and exact conversation streaming negotiation remain incomplete.
- Optional attestation fields are observed but signing/account logic is deliberately outside this mock contract.
- Packaged SDK code also contains managed-agent `/v1/sessions` resources; their presence alone does not establish use by this Code UI. Only the legacy Code callsite described above is linked here.
- This is a focused contract inventory, not a complete desktop/API reverse engineering claim.

## Source identities

- **HTTP**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/shared-104-Cqo2-vQh.js` — 358274 bytes; SHA256 `8fa6dc2deb952fdb02f30b1736a86db0b19a5c2c8645a32f852dd8fc3a959045`.
- **TRANSPORT**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/c5da7eb42-B8cTG8SI.js` — 287764 bytes; SHA256 `2548bc9a215aadf8a969c1b6ff5748ab28e31b6a194c5faee4b52b6a159bc5e0`.
- **MAIN**: `/Users/serebano/Documents/ChatGPT/testst/claude-evidence/sources/.vite/build/index.chunk-BWk6pVUt.js` — 6983168 bytes; SHA256 `f7d74e113f34761a675816fe2abf65b3ddc190327ee7623d9c822f7b59cceaca`.
- **ARTIFACT_CLIENT**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/c43c83380-IgWujZ0B.js` — 15101 bytes; SHA256 `d6b0b5d9a35fb1afee225bb6f311c12a9438b84375ee7af2b153d530e16f4dc1`.
- **TERMINAL**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/c03935b01-CyJKQj4N.js` — 103811 bytes; SHA256 `f9a982192fb8f0a1894714c0cf58b9a0be001e29e797492d6165fa408f02a6d9`.
- **HEARTBEAT**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/shared-18-D4XxL6Tg.js` — 328678 bytes; SHA256 `0f178aaa40d0c0f2119a69bab11ed1ad48ffd513b3e0e4c236b2420b3f7d6b79`.
