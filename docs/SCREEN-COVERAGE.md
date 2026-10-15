# Screen fidelity coverage

Audit date: 2026-10-15. This inventory maps every case in `tests/visual.spec.ts` to actual-reference evidence. A prototype screenshot passing its own baseline detects regressions; it does **not** demonstrate that Claude and the prototype are identical. Source tokens corroborate structure and dimensions, not every rendered screen or account state.

Evidence keys:

- **G** — [General same-page comparison](reference/2026-10-15/general-comparison.png), with original [actual crop](reference/2026-10-15/claude-web-general.jpg); detailed viewport/crop provenance in [web audit](WEB-UX-AUDIT.md). The comparison predates the imported fonts in this pass.
- **V3** — actual app captures in [reference/2026-10-15-v1.3](reference/2026-10-15-v1.3/). A reference alone is not a paired comparison.
- **W** — measured web DOM/geometry or observed menu contents recorded in [web audit](WEB-UX-AUDIT.md), without a retained matching menu screenshot.
- **S** — packaged renderer evidence in [source audit](SOURCE-AUDIT.md), scoped to the file and offsets recorded there. Split sizing and shell density are source-derived, not a live comparison.
- **U** — no retained actual screenshot or sufficiently specific screen evidence in this repository. The prototype is tested, but target fidelity is unverified.

## Settings: 20 desktop snapshots and 6 web snapshots

| Snapshot suffix | Actual evidence | Current comparison boundary |
| --- | --- | --- |
| settings-general | G, W, S | Same-state geometry compared; refreshed font comparison still required |
| settings-account | U | No retained target comparison; demo identity and account actions |
| settings-privacy | U | No retained target comparison; account managers simulated |
| settings-billing | U | No retained target comparison; no payments |
| settings-usage | U | No retained target comparison; sample counters |
| settings-capabilities | V3 `claude-web-capabilities.png` | Actual web reference captured; differences depend on feature gates |
| settings-memory | U | No retained target comparison; local demonstration |
| settings-design-systems | V3 `claude-web-design-systems.png` | Actual web reference captured; guide actions simulated |
| settings-reflect | V3 `claude-web-reflect.png` | Actual web reference captured; backend behavior unknown |
| settings-time-and-focus | V3 `claude-web-time-and-focus.png` | Actual web reference captured; timers/preferences are demo state |
| settings-claude-code | V3 `claude-web-code.png`, `claude-desktop-code.png`, S | Web and desktop differ; references must not be conflated |
| settings-claude-in-chrome | V3 `claude-web-claude-in-chrome.png` | Actual web reference captured; no browser integration |
| settings-system | U | No retained target comparison; OS actions simulated |
| settings-extensions | V3 `claude-desktop-extensions.png` | Actual desktop reference captured; editor saves local config |
| settings-developer | V3 `claude-desktop-developer.png` | Actual desktop reference captured; local/native backend differs |
| settings-skills | U | No retained target comparison; prototype collection UI |
| settings-connectors | U | No retained target comparison; no external authentication |
| settings-plugins | U | No retained target comparison; prototype collection UI |
| settings-api-keys | U | No retained target comparison; no credentials issued |
| settings-about | U | Intentionally identifies the prototype and its version |

## Menus and dialogs: 14 snapshots

| Snapshot suffix | Actual evidence | Current comparison boundary |
| --- | --- | --- |
| menu-more-navigation | U | Prototype navigation, no retained target comparison |
| menu-group-sort | S (shell only) | Sidebar dimensions known; specific popup unverified |
| menu-account | U | Prototype account menu, no retained target comparison |
| menu-sidebar-session | S (shell only) | Sidebar row tokens known; popup contents unverified |
| menu-session-title | U | Local actions tested; target popup not paired |
| menu-layout-panels | S (split constraints only) | Layout commands are implemented; menu geometry unverified |
| menu-view-options | U | Side chat/tasks/plan implemented; target popup not paired |
| menu-composer-add | U | Attachment/commands/connectors demo; target popup not paired |
| menu-permissions | W | Auto/Accept edits/Plan observed for cloud session; additional desktop/demo modes differ |
| menu-model-effort | W | 172px width, colors, four models, effort and fast-mode observed; no paired screenshot |
| menu-command-palette | U | Prototype command subset; target dialog unverified |
| menu-workspace-search | U | Searches local sessions; target dialog unverified |
| menu-secondary-pane | S (split constraints only) | Prototype pane operations tested; target popup unverified |
| menu-model-effort-submenu | W | Labels/descriptions and nested structure observed; exact placement and pointer timing unverified |

## Panels, splits and alternate states: 16 snapshots

| Snapshot suffix | Actual evidence | Current comparison boundary |
| --- | --- | --- |
| panel-session-details | U | Sample metadata; no retained target comparison |
| panel-changes | U | Sample diff; no retained target comparison |
| panel-files | S (API/source architecture) | Virtual file example; actual browser panel not paired |
| panel-browser-preview | U | Local demonstration preview; target screen unverified |
| panel-terminal | S (API/source architecture) | Safe command simulation; actual terminal not reproduced |
| panel-background-tasks | U | Sample tasks; no retained target comparison |
| panel-plan | U | Local checklist; no retained target comparison |
| split-right | S | Source-backed sizing/resize semantics; actual same-content image not captured |
| split-below | S | Source-backed 320px minimum/equal-half fallback; actual image not captured |
| settings-general-bottom | S, partial G | General crop is upper portion; lower controls unpaired |
| settings-claude-code-bottom | S, V3 (upper Code views) | Lower controls are not proven by upper captures |
| light-workspace | S (color tokens) | No same-state light reference |
| light-settings | S (color tokens) | No same-state light reference |
| mobile-workspace | U | Responsive browser adaptation; no matching actual mobile reference |
| mobile-settings | U | Responsive browser adaptation; no matching actual mobile reference |
| sidebar-session-hover | S (shell tokens) | Hover action works; actual same-state image not captured |

## Out-of-snapshot and functional boundaries

These 56 visual cases are the maintained prototype surface inventory, not an inventory of every Claude screen. Home/new-session, Projects, Artifacts, Scheduled, collection detail dialogs, editor validation/error states, menu overflow, accessibility modes and arbitrary account/feature combinations need their own target comparisons before any exhaustive identity claim. The separate texture tests cover a deterministic approximation, not the original shader's complete output distribution.

The explicit functional tests exercise the menus/settings/splits independently from screenshots. Native OS operations, authenticated AI responses, real repository execution, external accounts and service state remain simulated. See [implementation gaps](IMPLEMENTATION-GAPS.md) and [mock API contract](MOCK-API.md).

Future comparisons should use matching route, visible content, theme, font selection, text scale, viewport, device pixel ratio, platform, focus and scroll state. Preserve actual and prototype images separately and record differences before accepting new regression baselines. Mark a row as paired only after reviewing both images; never promote **U**, **S** or **W** to pixel identity because a local test passed.

## Resize cancellation refinement

The packaged split implementation (`shared-23-Bu_lvvVo.js`, bytes 289400–292300, identity in SOURCE-AUDIT) distinguishes committed and canceled resize completion: column tracks restore when completion is false, and the row state is committed only on a true completion flag. The prototype previously kept the last preview width after `pointercancel`. Its shared resize handle now restores the drag-start value on pointer cancellation, lost capture, or Escape. Escape is the prototype's explicit cancellation gesture; this source slice does not establish Claude's original key binding. Focused tests in `tests/menu-fidelity.spec.ts` check cancel followed by a successful committed resize for sidebar, tool panel and split handle.

## v1.3 paired review

Seven web routes were captured again at 1470×942 on macOS Chromium with a 1020×796 settings crop: General, Claude Code, Capabilities, Design systems, Reflect, Time and focus, and Claude in Chrome. See [the retained pairs](reference/2026-10-15-v1.3/README.md). They exposed and guided corrections to icons, fonts, section gaps, previews and controls. These are visual reviews, not zero-difference certificates. Six stable web routes also have independent regression baselines (Reflect is asynchronous and tested behaviorally).
