# Testing the desktop UX prototype

Tests exercise the independently authored browser prototype. They never automate the installed Claude app, inspect private conversations, use account credentials, or connect to a model. API tests exercise the shared local handler and browser service worker; UI flows use the independent mock API. Passing these tests establishes local UI behavior; it does not establish parity with Claude’s backend or native permissions.

## Canonical environment

Screenshot comparisons use **Chromium in `mcr.microsoft.com/playwright:v1.64.1-noble`, Linux amd64**. The npm dependency is pinned to the same Playwright version. CI runs on an amd64 Ubuntu runner inside that image; local Docker explicitly requests `linux/amd64`, including on Apple Silicon. Update the image and dependency together when upgrading Playwright, and review any changed baselines.

The shared configuration fixes the desktop viewport at 1440 × 960, device scale at 1, dark color scheme, reduced motion, English locale, and UTC. Mobile cases explicitly use 390 × 844. Tests wait for fonts and hide blinking carets. Screenshot assertions retain focused menu items and intentional hover states; they do not mask interface defects. Screenshot comparison tolerates at most a 0.1% pixel difference.

## Run checks

From the project root, with Docker running:

```sh
# Canonical complete suite, followed by versioned release-evidence verification
node scripts/visual-tests.mjs all

# Screenshot comparisons only; never writes missing or changed baselines
node scripts/visual-tests.mjs check

# Interaction tests in the same Linux environment, excluding visual/screenshot cases
node scripts/visual-tests.mjs interactions

# Narrow an invocation to a test file or Playwright test-path filter
node scripts/visual-tests.mjs check -- tests/visual.spec.ts
```

The runner uses the pinned image’s Node runtime. It stages a source copy under the system temporary directory, mounts that copy read-only, and copies sources (excluding host environment files and local deployment metadata) into a disposable Linux work directory, and installs with `npm ci`. Anonymous Docker volumes isolate Linux `node_modules` and `dist` from host dependencies/builds. It does not delete host files or replace host dependencies. A unique `test-results/docker-<mode>-<timestamp>-<pid>/` folder receives the report and failure artifacts. The command propagates test/install/release failures as a nonzero exit code.

`all` includes every test file. `check`/`update` select `tests/visual.spec.ts` and `tests/texture.spec.ts` when the latter exists. Pass explicit test filters when adding another screenshot suite. `interactions` excludes test titles containing `visual` or `screenshot`; use that convention for additional visual cases.

For faster host-native interaction development:

```sh
npm ci
npx playwright install chromium
npx playwright test --grep-invert 'visual|screenshot' --update-snapshots=none
```

Host-native rendering is not authoritative for screenshot baselines. The app’s test web server runs on port 4173, builds from source, and refuses to reuse an unrelated existing server. Stop any server already using that port before running tests.

## Update and review screenshots separately

Only update after confirming that the UI change is intended:

```sh
node scripts/visual-tests.mjs update
# Or update a specific visual test file:
node scripts/visual-tests.mjs update -- tests/visual.spec.ts
```

The update run executes in the same pinned Linux image. On success it copies generated `*-snapshots` directories back into `tests/`. It does not delete old images; remove obsolete baselines deliberately as part of review. If any test fails, generated images remain in the test report and host baselines are not copied. Core baselines follow the default path `tests/visual.spec.ts-snapshots/*-chromium-linux.png`; the shared Playwright snapshot path is not overridden. Ordinary check/all runs use `--update-snapshots=none`, so missing baselines are failures, not silently accepted images.

Inspect the source diff and every changed baseline image. Pay particular attention to clipping, scroll position, small text, focus outlines, checked/disabled states, light-mode contrast, and mobile overflow. Then rerun `all` without updating and commit reviewed baseline images with the UI change. Do not use the general `test:update-snapshots` npm shortcut to create host-specific baselines.

Review a retained HTML report with:

```sh
npx playwright show-report test-results/docker-check-<timestamp>-<pid>/playwright-report
```

CI **never updates snapshots**. It installs locked dependencies, runs all Chromium tests, verifies versioned release metadata and screenshot hashes, and uploads reports plus retained failure screenshots/traces for 14 days. A missing or changed baseline fails the job. Release evidence under `docs/screenshots/v<version>/` is distinct from regression baselines under `tests/`: release screenshots document the shipped version, whereas regression images detect unintended UI changes.

## Coverage

The current suite contains 166 tests: 102 UI interaction checks, 9 API cases, one reference-comparison capture, and 54 visual/texture cases (51 UI snapshots and three texture behaviors).

- **Mock API:** workspace migration, CRUD/fork isolation, settings and virtual files, validation/error responses, concurrent writes, run completion/cancellation, event-envelope subset, secondary-pane isolation, and service-worker persistence. The standalone Node server also passed an HTTP health/session/terminal smoke test.


- **Settings interactions:** an explicit 21-category inventory; every enabled switch flips, persists across reload, and restores; every dropdown changes, persists, and restores. Additional cases cover local editors, invalid JSON recovery, imports, exports, contextual information, category links, customization links, search including option labels, empty results, Escape layers, focus trapping, themes, fonts, transcript sizing, branch prefix, and bypass-permission enable/revocation.
- **Menus and navigation:** account/navigation/session menus, keyboard wrap and typeahead, focus restoration, grouping, pin/rename/archive/restore, conversation actions, composer menus, commands, search, shortcut help, and attachments.
- **Panels and splits:** sample files/diffs/preview/terminal, panel controls, independent secondary sessions, permissions, right/below splits, and resize/focus behavior as covered in the corresponding interaction suite.
- **51 core screenshot cases:** all 21 settings categories; 14 menu/search/palette surfaces; all seven panels; two split layouts; lower General/Code settings; light workspace/settings; mobile workspace/settings; and hovered sidebar session actions. Additional texture-specific cases are maintained in their own suite when present.

Tests deliberately distinguish effective appearance/local-editor behavior from saved demonstration preferences. Native startup, OS shortcuts, sleep prevention, computer use, remote execution, real notifications, billing, authorization tokens, sharing, and MCP/browser connections are not implemented services and are not asserted to work. Font fallbacks and OS-specific glyph rendering can differ outside the canonical container. This suite is not a full accessibility audit, cross-browser certification, load test, or verification of Claude’s native/backend behavior.
