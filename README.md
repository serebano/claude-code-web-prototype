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
