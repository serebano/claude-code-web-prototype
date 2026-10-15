# v1.3 reference comparisons

Actual references were captured from the signed-in Claude web application and installed Claude Desktop 2.42304.0 on 2026-10-15. Settings-only crops exclude conversation history and account identity. No account preferences were changed.

Web pairs use a 1470×942 viewport and the same 1020×796 modal interior crop. Prototype captures use macOS Chrome for Testing and the selected web surface with matching General preferences. Actual and prototype Chromium builds can differ; rasterization is not asserted identical. Desktop captures were cropped from a 3420×2048 native window at x310,y107 to 2800×1834, and are references rather than same-scale pixel comparisons.

| Route | Side-by-side |
| --- | --- |
| General | [Comparison](comparison-general.png) |
| Claude Code | [Comparison](comparison-claude-code.png) |
| Capabilities | [Comparison](comparison-capabilities.png) |
| Design systems | [Comparison](comparison-design-systems.png) |
| Reflect | [Comparison](comparison-reflect.png) |
| Time and focus | [Comparison](comparison-time-and-focus.png) |
| Claude in Chrome | [Comparison](comparison-claude-in-chrome.png) |

The review corrected sidebar font/icon sizing, section spacing, dropdown arrows, theme previews and weekday alignment. Remaining differences include Reflect loading illustration, some account-gated disabled states, native select popup rendering, asynchronous content and the intentional Local prototype access control. These pairs do not establish every Claude screen or function as identical. See ../../SCREEN-COVERAGE.md for the wider coverage boundary.

`tests/reference-comparison.spec.ts` reproduces prototype crops without contacting Claude. Actual captures are immutable reference evidence. SHA-256 identities are in manifest.json. Regression baselines are separate and run on pinned Linux Chromium.
