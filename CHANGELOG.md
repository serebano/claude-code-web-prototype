# Changelog

## 1.1.0 — 2026-10-15

### Fixed
- Isolate and persist primary session drafts, attachments, model, effort, permission and environment choices.
- Restore copied local session links; retain the last active session across reloads.
- Track running responses by session; stop only the selected response.
- Copy actual prototype messages into independent split forks, with duplicate-title disambiguation.
- Fix split rename cancellation, repeated sends, menu keyboard navigation and focus restoration.
- Persist plan progress and pane widths; group sessions by their chosen environment.
- Apply per-session transcript overrides, code theme/font and diff-preview preferences.
- Make settings search, nested Escape, focus, local editors, JSON validation and exports consistent.
- Route Customize links to Skills, Connectors or Plugins with working local demo add/remove controls.
- Restore keyboard access to model/permission menus and command/search results.

### Added
- Versioned screenshots with hashes, release instructions, and an interaction audit matrix.
- CI checks for production build, release metadata and screenshot integrity.
- Visible app version, annotated Git tags and GitHub release.

### Limits
- Native OS actions, billing/account operations, external connections and model responses remain explicitly simulated.
- Split copies are independent forks, not synchronized views of one conversation.
- Browser-reserved shortcuts may be intercepted; equivalent menu commands remain available.

## 1.0.0 — 2026-10-15

Initial privately published prototype: desktop comparison, settings, menus, resizable split panes, demo files/diffs/preview/terminal, and browser-local sessions.
