# Interaction audit — v1.1.0

Audited 2026-10-15 against the previously observed Claude Desktop UI and the actual running prototype, not just source inspection. Native backend/OS effects are intentionally outside this UI prototype. “Pass” below means the implemented local interaction works, not that Claude services are connected.

## Coverage

| Area | Exercised behavior | Result |
| --- | --- | --- |
| All 21 settings categories | Open category, inspect content; 47 switch controls inspected, each enabled switch changed and restored; all 20 dropdowns changed and restored | Pass |
| Settings details | Account edits/info; privacy managers; billing/usage info; memory/import; design guidance; Reflect; Chrome; system/browser/permissions/storage; extension config; developer; About; Code managers; Cowork; Customize routing | Pass |
| Settings editor validation | Invalid extension JSON rejected; valid object saved/reopened; nested Escape returns to category | Pass |
| Search | Option text “Dracula” finds correct Code setting; Escape clears search before closing | Pass |
| Appearance | Theme, transcript font/size/width, code palette/font, diff preview and reduced motion state propagate; Code transcript follows interface font while Home follows Chat font | Packaged Sans/Serif and icon fonts loaded; source identity tests added |
| Session state | Draft, permission and model isolated between sessions; active session/local links restore | Pass |
| Session menus | Rename, fork, pin, archive and restore; local link and JSON export | Pass |
| Navigation | Home/Code, Projects create/open, Artifacts preview, Scheduled create/toggle/delete, Customize Skills/Connectors/Plugins add/remove, environment grouping | Pass |
| Split menus | Open right, move below, resize, focus primary/secondary, close; Escape returns focus | Pass |
| Split session picker | Copies actual sample messages into independent fork, identifies source, preserves fork state | Pass; independent fork rather than synchronized session |
| Split composer | Send, stop, new/select session cancellation, rename Escape, models/permissions; duplicate send guarded | Pass |
| Tool panels | Each sample file, diff expansion, preview month change, terminal help/pwd/ls/unknown/clear, plan checks survive panel close, background task sample details | Pass |
| Keyboard | Cmd+K command search/Enter; Cmd+, settings; Cmd+Shift+D/F/P; Ctrl+backtick; Cmd+backslash; Cmd+semicolon; Ctrl+brackets pane focus; Ctrl+Cmd+W; menu Escape focus restoration | Pass in test browser |
| Responsive | 1440×960 desktop; 390×844 stacked splits and settings; no document horizontal overflow | Pass |
| Production | TypeScript/Vite build, clean browser console on production preview | Pass |

## Deliberate simulations

Voice, OS permissions, global shortcuts, browser automation, account/billing, token administration, external connectors, schedulers, sandboxing, Remote Control, simulator access, repository edits and AI generation do not execute. Their controls save browser-local demo preferences or show an explanatory detail panel. Share exports/copies locally; a local session link requires the same browser's stored session. Anthropic Sans/Serif and icons use the packaged resources recorded in public/fonts/manifest.json. OpenDyslexic is used only if installed.

The settings audit is recorded as behavior coverage, not a claim of exact pixel or service parity. Native menus can vary by session environment and enabled features. Browser-reserved shortcuts may be intercepted.

## Repeatable manual regression

1. Open the clean production preview; verify the sidebar version.
2. Create two sessions; give each different draft/model/mode; switch and reload.
3. Open all menu families with keyboard; navigate arrows/Home/End; dismiss with Escape and verify focus.
4. Fork, rename, pin, archive, restore; export JSON and open a copied local link.
5. Open both split directions, resize, change focus, fork an existing transcript, stop a response, cancel a rename, close/reopen.
6. Visit each settings category; inspect every control, restore changed values, verify valid/invalid configuration save and search.
7. Test all file/diff/preview/terminal/plan panels and collection pages.
8. Repeat at mobile width, capture versioned screenshots and run `npm run verify:release`.
