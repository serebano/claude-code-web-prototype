# Code Workspace

An independently authored, interactive Claude Code-style web UI prototype.

## Run

```sh
npm install
npm run dev
```

Production: `npm run build`; inspect the build with `npm run preview`.

## Stack and fidelity

React, TypeScript, Vite, Tailwind CSS, and Lucide icons. React, TypeScript, Vite, and Tailwind were identified in the inspected desktop package. The source here is original; it does not include Anthropic application code, private packages, or extracted assets. Electron, native OS integrations, and Claude's private backend are not part of a browser prototype.

Implemented: responsive sidebar and session rail; persistent local sessions and forks; scripted send/stop flow; file attachments by filename only; read-only example file tree; illustrative diff; interactive dashboard preview; demo terminal (help/pwd/ls/clear only); search; rename/export; projects; locally saved schedules; customization preferences; dark/light appearance; modal keyboard focus containment.

Demo boundaries: no AI calls, shell execution, filesystem access, automatic scheduling, external integrations, or actual source-code changes. Model/permission/environment choices are UI controls only. Browser-local storage is specific to each origin. New deployments open with sample data.

## Validation

- TypeScript and Vite production build.
- Browser checks: Files, Changes, dashboard period selection; message submission and scripted response; permission selection; schedule creation, reload persistence, and removal.
- Desktop and mobile layout inspection.

The private Sites deployment is configured in `.openai/hosting.json`.

## Desktop UX fidelity update

Reconstructed from observed Claude Desktop 2.37337.1 UI and the separately stored evidence in `../claude-evidence`. Independently authored implementation; no proprietary source or fonts are bundled.

- Searchable settings with General, Account, Privacy, Billing, Usage, Capabilities, Memory, Design systems, Reflect, Time and focus, Claude Code, Chrome, System, Extensions, Developer, Skills, Connectors, Plugins, and API keys.
- Appearance preferences apply locally: system/light/dark, font family, transcript size/width, reduced motion.
- Keyboard-navigable session/account/view menus, command palette, shortcut reference, session pin/rename/fork/export.
- Resizable side-by-side or stacked conversation panes; secondary sessions/drafts persist independently. Keyboard resizing and pane focus controls.
- Larger system-font typography, desktop sidebar width, revised neutral surfaces, composer spacing, and responsive stacked panes.

Validation: production TypeScript/Vite build; UI checks for settings shortcut, appearance updates, split resize/move, independent demo response, command search, and 390px responsive layout.

Limits: browser-reserved shortcuts can be intercepted by the browser. Model/backend, native computer/browser controls, account/billing, and integration switches are simulations. System fonts approximate the reference; this is not an exact full native-app clone.

## Latest comparison

See [docs/UI-COMPARISON.md](docs/UI-COMPARISON.md) for the live desktop comparison and remaining browser/native limitations. The current revision adds a compact composer, native-style View/Add/session menus, resizable sidebar, archive recovery, and expanded Claude Code settings.

## Releases and screenshots

Current release: **v1.1.0**. See [Changelog](CHANGELOG.md), [interaction audit](docs/INTERACTION-AUDIT.md), and [release workflow](docs/RELEASING.md). Git tags identify reproducible snapshots; screenshots are kept by version and checked with SHA-256 manifests.

![Workspace v1.1.0](docs/screenshots/v1.1.0/workspace.jpg)
![Settings v1.1.0](docs/screenshots/v1.1.0/settings-code.jpg)
![Split view v1.1.0](docs/screenshots/v1.1.0/split-right.jpg)

[All v1.1.0 screenshots](docs/screenshots/v1.1.0/) include General settings, layout menu, stacked panels and mobile. These show the current prototype with sample data, not private conversations from the native Claude application.

```sh
npm ci
npm run build
npm run verify:release
npm run preview
```
