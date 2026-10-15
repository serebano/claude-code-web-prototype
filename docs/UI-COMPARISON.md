# Live desktop comparison — 2026-10-15

Reference: installed Claude desktop, inspected through its live macOS UI. Comparison used a 1710×1024 logical browser viewport against the native screenshot at twice that pixel resolution. User-specific chat content, account values, credentials and native screenshots are excluded from this repository.

| Surface | Observed mismatch | Revision |
| --- | --- | --- |
| Sidebar | Small icon-only mode control, expanded navigation | Full-width Home/Code segmented control; New, Artifacts, Customize, More; group/sort; session context menus; resize handle |
| Composer | Tall, two-row input | Compact single-row input, plus menu on left, voice demo on right, permissions/model below |
| Session header | Rename-only title, broad View menu | Session actions; native-style Side chat/Background tasks/Plan menu; separate layout controls |
| Session rail | Extra panel heading and decorative surfaces | Direct bordered sections, tighter spacing, transparent background |
| Settings | Small modal, missing navigation icons, appearance in wrong category | 1400px maximum/90vh dialog, 210px navigation, icon rows, blue switches; code appearance in Claude Code |
| Settings content | Minimal Code options | Code themes/font, interface font, transcript size/width/view, Remote Control, sessions, browser, simulator and PR controls |
| Typography | Undersized navigation; loose transcript leading | System font stack, 15px navigation, 16px transcript, reduced leading |
| Session management | No per-row menu or recovery | Pin, rename, archive, restore from More; persistent browser storage |

## Verification and boundaries

The interface is independently authored React/TypeScript/Vite code. It does not contain extracted Claude code, commercial font files, native screenshots, real conversations, or account data. System and common installed fonts are used as approximations for named font choices; OpenDyslexic is used only when installed. A browser cannot reproduce native menus, Electron window chrome, global shortcuts, OS integrations, or Claude services exactly. Backend/OS settings are demonstrative and explicitly labeled. Browser-reserved shortcuts have equivalent menu commands.

Only sample project content is included. All conversation state is browser-local. No AI service is connected.
