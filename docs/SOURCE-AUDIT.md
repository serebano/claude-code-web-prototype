# Packaged source audit: layout and component evidence

Read-only static investigation, 2026-10-15. No Claude execution, native UI inspection, network retrieval, or asset copying. This document records facts and tiny identifying expressions, not implementation code. Numbers below describe shipped declarations and branches, not a measured live screen.

## Scope and provenance

The installed bundle includes `Contents/Resources/ion-dist/index.html`, a substantial renderer tree (25 CSS files, 69 WOFF/WOFF2 assets, 21 TTF assets in this inventory), and local Electron code. The previously extracted main bundle installs an `app://` handler using `ion-dist` at byte 6703410 in `claude-evidence/sources/.vite/build/index.chunk-BWk6pVUt.js`. Its route enum includes `claude-code-desktop`, `code`, and `epitaxy` at byte 833463. This is actual packaged renderer evidence; describing the entire renderer as unavailable remote UI would be inaccurate. Account state, remote responses, runtime overrides and feature gates remain unobserved.

REA skill was consulted earlier in this investigation. The current REA session has zero retained records; the portable prior `claude-evidence/rea-evidence.json` was reused for provenance. It records ASAR SHA256 `82a54170115e3e20c9600a257a5b2679cbadb83f38baf5111235f123af484163`, original analysis `ev_8f6322403234cbffb392fd1ca017c9af9e7cedebee02d8422d25bee90fb3ca44`, and projection `ev_4d9f8a93af001df9fe58f76abc46a4687dda111d8ab4d6fe0ce346b123e6175f`. Its limits include 442 inventoried files outside selected source analysis and integrity contradictions for several native/unpacked binaries. Those native integrity observations do not authenticate or invalidate these separately hashed ion-dist files. The fresh CSS findings below are direct file inspection, not newly generated REA claims.

## Which shell, and which density?

- `index.html` opening element declares `data-density="comfortable"` and `class="cds-root ..."`. That is document bootstrap state, not proof that every child uses comfortable density.
- CODE_ROOT byte 934 onward explicitly creates a provider with `density:"compact"`, then an `epitaxy-root` with `data-chat-text-size` and `data-transcript-width`, enclosing `dframe-root`.
- CODE_PANEL imports CODE_ROOT at byte 2065; its body identifies `EpitaxyChatPanel` with feature `epitaxy`, pane `popout`, and session messages. Thus that compact subroot is genuinely Code-related, although specifically the inspected popout path. Do not universally infer the active main-window provider from that path.
- FRAME byte 248677 renders the sidebar with `data-code-list` conditionally and dynamic `data-density`. At byte 256745 it renders the shared dframe root; byte 256976 injects sidebar width from state. SHELL therefore supplies shared sidebar defaults including a Code-list override; it is not merely the unrelated Artifact `frame-shell.html`.
- Runtime-selected density, font, text size, zoom and experimental panel feature remain unknown. A faithful prototype should model these independently.

## Verified shell dimensions

SHELL bytes [24197,25497) define the base dframe token set. Selected tiny identifying declarations: `--df-sidebar-width:288px`, `--df-header-h:48px`, `--df-row-h:26px`.

| Property | Base shell | Comfortable sidebar override |
|---|---:|---:|
| Sidebar width | 288px default, overridden by JS state | same default |
| Sidebar left / top / bottom inset | 8px; top adds chrome-bar height | same mechanism |
| Header height | 48px | no assertion of override |
| Card radius | 8px | no assertion of override |
| Row height | 26px | 32px |
| Row text / group text | 13px / 12px | 14px / 13px |
| Row gap | 4px | 8px |
| Icon / leading slot | 16px / 24px | 20px / 28px |
| Footer button / gap | 24px / 3px | 32px / 6px |
| Group top spacing / pill radius | 12px / 6px | 16px / 8px |

Comfortable override: SHELL [62019,62424). Code-list compact session-list overrides use row 28px/control24px at [10400,10591); desktop pinned list restores row26/control20 at [10591,10999). Do not flatten all lists to one row size.

## CDS controls, typography and spacing

CSS [1675768,1676600) gives compact defaults, [1713167,1715338) comfortable overrides. All converted pixel numbers here assume 16px root rem and `--cds-rem-scale=1`; the source keeps rem scaling.

| Token | Compact | Comfortable |
|---|---:|---:|
| Control height / nested height | 24 / 18px | 32 / 22px |
| Component radius / composer radius | 6 / 12px | 8 / 14px |
| Icon | 16px | 20px |
| Padding xs/sm/md/lg/xl | 4/6/8/12/20px | 6/8/12/16/24px |
| Gap xs/sm/md/lg/xl | 6/8/12/20/32px | 8/12/16/28/40px |
| Body text | 13px | 14px |
| Prose text | 14px | 16px |
| Heading / title | 14 / 20px | 15 / 22px |

Compact body/prose declarations are at CSS 1689645/1689706. Tailwind's separate spacing unit is `.25rem` at byte 13450; avoid conflating numeric utility classes with named CDS pad/gap tokens.

CSS [1661180,1662855) sets the root fallback sans stack to system UI, but the later `.cds-root` rule at byte1679217 overrides its default to Anthropic Sans with system UI fallback. The explicit `.cds-root[data-font=system]` rule at1712958 selects system UI instead. Therefore Anthropic Sans is the default CDS family; effective runtime selection remains unobserved. Base weight tokens are regular400, medium500, semibold580, bold600. CSS around byte2413 declares packaged anthropic-sans variable font300–800 and anthropic-serif300–800. No fonts are copied into this project. Accessibility fonts and CJK fallbacks also ship.

## Code transcript and composer

CSS [1787200,1788340) declares normal transcript 14px with line-height1.42857 (approximately20px); small13px retains that multiplier; large15px has1.46667 (approximately22px). Turn gap is .75 line and item gap .5 line; normal values are approximately15px/10px. Base chat gutter32px. Composer prompt text follows normal14/small13/large15px, while coarse-pointer CSS in SHELL raises prompt input to16px.

COLUMNS byte15821 defines base max chat measure768px, medium960px, large1280px, each permitting `--chat-column-measure` override. These are max measures, not fixed widths and not proof of the gutter-inclusive rendered bounding box. Code text scale should not force sidebar/control text to the same size.

## Colors: CDS and dframe are separate layers

CSS base semantic surface declarations at [1682096,1682350), dark surface override at [1698489,1698665), palette around [1663313,1664100), text semantics around1689259 and dark overrides1701245:

| Semantic role | Light | Dark |
|---|---|---|
| surface0 | #f9f9f7 | #0b0b0b |
| surface1 | #fcfcfb | #151515 |
| surface2 | #ffffff | #1a1a19 |
| surface3 / popover | #ffffff | #20201f |
| primary text | #0b0b0b | #ffffff |
| secondary text | #52514e | #c3c2b7 |
| muted text | #898781 | #898781 |

This table resolves base CDS token aliases; individual components override them. The HTML sets page background to surface1. Dark dframe at SHELL byte27382 has its own neutral z levels: z0=3.9%, z1=10.2%, z2=14.9%, z3=20%, z4=23.9%; later `.dframe-root .dframe-sidebar` dark rule assigns hsl(z2). These must not be silently replaced by one universal #191919. Borders and hover fills are alpha/color-mix expressions, not simply a single solid gray. Neutral theme variants beyond the inspected default remain possible.

## Split panels and resizing

STATE byte5225 vicinity defines row split `MIN:.15`, `MAX:.85`, `DEFAULT:.5`, `MIN_PX:320`. Export `Ca as ji` is imported by SPLIT as `ji as FO`; this resolves the otherwise minified constant rather than relying on a nearby number. STATE also sets column count ceiling5 and a width divisor360 at byte5118 vicinity; distinguish that count policy from a guaranteed absolute width for every panel.

SPLIT [287573,287738) computes row fraction minimum as max(.15,320/hostHeight), maximum1-minimum; when the minimum reaches .5, both bounds become .5. Consequently two rows cannot each maintain320px inside a host shorter than640px; the implementation falls back to equal halves. SPLIT [289400,292300) implements explicit column/row resizing: Home/End extremes, double-click reset/equalization, drag commit/cancel, and resize labels/value ARIA. It uses its own grid/state logic. A shared primitive in the prototype is a reasonable independent design choice, not proof it uses a third-party resizable-panels package.

SHELL [35663,36300): column hit target12px spanning the seam (right -6px); row hit target12px centered on the fractional split; corner target12x12px. These are interaction hit areas, not visual gutter widths.

## Settings layout

SETTINGS [107125,108370) defines centered modal width viewport minus2rem and height dynamic viewport minus2rem. Normal maxima1024px wide and50rem high (800px at16px rem). A gated rail branch expands maxima to max(1024px,min(1280px,viewport minus6rem)) and max(50rem,min(60rem,viewport minus6rem)). There is a stacked branch, and native titlebar inset can override height. Avoid asserting a single fixed modal size.

SETTINGS [108370,109850) identifies a close-button row56px high with named medium end padding. A fallback content branch has horizontal extra-large padding, large bottom padding, and numeric top spacing2 (8px at16px rem). Its exact pixels depend on provider density. This is not a complete audit of every settings section or all rail widths.

## Library and boundary conclusions

Bounded search of `ion-dist/assets/v1/*.js` found no literal `react-resizable-panels`, `PanelGroup`, `ResizablePanel`, or `data-panel-group`. This is not proof of absence after minification. Nine files reference `data-radix-popper-content-wrapper`; OVERLAYS byte282382 uses it in overlay exclusion/selectors. That proves compatibility with Radix-shaped DOM, not installed Radix version or ownership of current menus. Many active components identify as CDS Popup/Root or `data-cds`; no package-version attribution was verified.

This shipped-artifact audit did not fetch remote pages or measure live geometry. A subsequent [web runtime audit](WEB-UX-AUDIT.md) measured the ordinary 1024 × 800 settings branch and informed the prototype’s current geometry. The current account may use a different gate, density, theme, zoom, content width, or a remotely supplied route. Actionable implementation facts are the token scales, separate density/text settings, measured-in-source split constraints, and correctly scoped shell defaults. Pixel-perfect live equivalence remains unverified.

## File identities

All offsets above are zero-based UTF-8 byte offsets into the installed files below. These source files remain outside the repository. Only this sanitized findings document is written here.

- **CSS**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/c6a992d55-sXiDGMFQ.css`; 1793068 bytes; SHA256 `c2274556b074a9fd6455d9cadf99fcd5696a6d33ee15ebd264886fd37ddc033b`.
- **SHELL**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/shared-styles-Bl9zqrv-.css`; 81009 bytes; SHA256 `193fe6e02ead582010748005459b9f1ba80bb637e339dabf77c147b714edca33`.
- **COLUMNS**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/shared-6-Cby4X-ms.js`; 386223 bytes; SHA256 `d637cb22b602b75eeaa11ee8c4a1f072b8ea7f7ac799688ed7744c3304fe80f0`.
- **STATE**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/shared-16-B0xHzPjj.js`; 127465 bytes; SHA256 `2665ff96e9e354cc35f6dc7a450d7c036a86dda699588f1f70d047dd5c231b70`.
- **SPLIT**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/shared-23-Bu_lvvVo.js`; 388953 bytes; SHA256 `9b1c4145c0b95e5baf7a7da6c20010272a651001899e9a136cf4942f9d3f8940`.
- **FRAME**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/shared-22-HztmyUTM.js`; 264901 bytes; SHA256 `28629418dc0265d7ffb911e9df66066349a1d650feca61743e4f49aaab9a1ad1`.
- **CODE_ROOT**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/c3af3d0ed-C_0fOAbx.js`; 1425 bytes; SHA256 `ed40470fb3d471af62e267c52816fa04e7a0f8520a72204cb24779f545e4128f`.
- **CODE_PANEL**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/c5638815a-D1NXo6h5.js`; 32365 bytes; SHA256 `23256ab51cac0f66e039232852258ae0f5688b7fba65498e0dc2a229e363136c`.
- **SETTINGS**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/shared-19-CkPOiIKm.js`; 523403 bytes; SHA256 `45133785ddcdf5381b29e2f313d4500a5fbe23b975fe049a648652d7151870af`.
- **OVERLAYS**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/shared-1-CAAiD7E3.js`; 332988 bytes; SHA256 `c608dab61da6ed8864d0d5356426b3d89eeaec1436e537cfb328004739144f65`.

## New-session interactive character field (immediate mouse-effect finding)

**High-confidence match to the reported behavior:** the module exports `LandingTextureLayer`, and its only importing caller labels its lazy import `code_landing_texture`. This is a GPU-rendered ambient glyph field with pointer wakes and click ripples, not a circular CSS spotlight and not uniform falling Matrix columns. The source can explain broad irregular patches and trails that fade after the pointer stops. Live screen equivalence has not been independently measured in this audit.

### Activation, eligibility and accessibility

The caller TEXTURE_HOST [68800,69700) checks both availability and being on the landing page, plus animation mode not being disabled. It delays appearance by3000ms (`NB=3e3`, byte48791), pausing/restarting the pending delay when document visibility changes. It lazy-loads the effect, passes `shown`, and passes `animate` only when animation policy permits and reduced-motion is false. It calls the component from its landing layout at byte832669. Availability is also controlled by contextual conditions; these gates are not proven enabled for every account.

TEXTURE [29400,35394) waits for a visible focused document, font readiness, idle scheduling and renderer readiness. The wrapper is absolutely inset0, aria-hidden, pointer-events-none, uses the UI monospace stack and muted-as-secondary ink. It starts transparent. Successful readiness and shown state fade the wrapper in over3000ms; hide/unmount grace is500ms. The canvas has its own visibility and opacity transitions. This double lifecycle explains a deliberate initial blank period without needing pointer movement to be an activation trigger.

High contrast (`prefers-contrast: more`) or forced colors disables initialization. Device-pixel ResizeObserver support is required. WebGL2 is requested low-power, transparent, no antialias/depth/stencil, and fail-if-major-performance-caveat. A detected software GPU renderer is rejected. Renderer/context failure is fail-open for the UI: no texture. Reduced motion produces a still rendering when the component starts with animation disabled; animation loop and interactive wakes are disabled. It does not require deleting all static decorative characters. Hidden/unfocused animated documents stop scheduling and fade out; focus can resume. A later reduced-motion policy change stops running via the prop.

### Grid and glyphs

TEXTURE [315,1640), [1790,3600): cell width is max(5,round(6.5×DPR)) device pixels; cell height is twice width. Columns/rows round up to cover the viewport; minimum24columns and8rows. The grid is centered and constrained to roughly21million device pixels by reducing counts when needed. Glyph target9CSS px, monospace weight300; DPR below1.5 adds100 weight. Actual glyph width is constrained to fit its cell. An offscreen 16-column,6-row atlas rasterizes printable ASCII plus middle dot; characters with mismatched monospace advance are excluded. Each visit randomly picks a mixed, letter-biased or digit-biased alphanumeric sequence. Recent looks are remembered under `code-landing-texture-recent` to avoid immediate repeats (up to3 retained). This is decorative text, not source code, user content or a live terminal.

### Ambient field composition

TEXTURE [3600,4450) seeds a reproducible per-visit field and picks a diagonal heading (about18–42degrees, or mirrored138–162degrees), nominal speed42–64CSS units/second, gust length380–560px, width120–190px, bending60–110px over scales300–440px. The field has multiple moving noise octaves, broad pane-sized swells, small eddies, fine creases and threadlike streaks. The broad patches are elongated in wind direction, appear at leading edges and have trailing falloff; most of the pane may be completely unlit. Each cell advances independently through its glyph sequence at roughly0.72–1.68steps/second before any click excitation. The shader omits cells whose surrounding wind samples and glow are below its visibility thresholds, explaining areas that look entirely blank.

TEXTURE [14000,18900): pointer disturbances are added into the ambient field before lighting. Small coordinate warps (~24px) prevent perfectly geometric outlines. A calmer ellipse is centered at50% page width and45% height, with axes250px/80px; opacity contribution at its center is reduced to30% of the surrounding field. This leaves content/composer readable while the rest of the page receives broader patches. Ambient reveal ramps smoothly over4seconds, but pointer warmth and click energy can reveal their local area immediately before that ramp completes.

### Pointer wake: why stopping fades it

TEXTURE [5650,7220) listens on the layer's parent, so the decorative layer itself remains inert. Only mouse pointermove generates wakes. Speed is smoothed with an80ms time constant; gaps beyond250ms restart tracking. It accepts a path sample only after at least18px travel and35ms, then smoothsteps speed between60 and800px/second. Very weak force (<.04) is discarded. Each wake is a segment with midpoint, direction and half-length, not one fixed circle at the cursor. Up to48segments remain; each lasts up to2.4seconds. Its radius begins50px and expands40px/second, rises over50ms and decays exponentially with650ms scale. Strength also depends on path length relative to90px; negligible strength below.002 is skipped.

The shader measures distance from each segment, producing broad continuous strokes even for quick mouse movement. Contributions saturate rather than stacking without bound. They light fine-grained characters directly, whether or not ambient wind is passing, and slightly strengthen the ambient field. When held still, no new segments arrive, so these wakes visibly decay in well under their2.4second lifetime. Ambient wind can continue; do not falsely model all characters as permanently hidden unless the pointer is moving. Pointerleave resets tracking, allowing existing trails to decay.

### Click ripple and exclusions

Primary-button pointerdown generates a ripple unless its target is inside an interactive descendant: native link/button/input/textarea/select/label/summary; editable content; draggable=true; tabindex other than-1; or ARIA button/link/textbox/combobox/listbox/option/menu/menuitem/tab/switch/checkbox/radio/slider/dialog. These exclusions apply to taps, not mouse tracking generally. Keyboard activity refreshes the idle budget without creating a ripple.

At most6tap events are retained for3.6seconds. Their fronts expand toward620px with1.3second exponential approach, widen from85px by60px/second, decay on a1.5second scale, and displace ambient sampling outward by up to44px times instantaneous strength. Ripple bands have a130px spatial oscillation with weaker trailing glow. Every third accepted tap uses a negative force (-1.15) interpreted as a heart-shaped ripple rather than a circle. Tap glow can excite glyph cycling and briefly tint characters blue. These are verified numeric parameters, not copied shader code.

### Color and effective opacity

TEXTURE config at byte315: base strength .26 in both dark and light, cap .9, rest .03, scale1, glow headroom3. The computed canvas opacity is .78 under defaults (base×headroom). **That is not glyph opacity:** the fragment alpha divides plain ink strength by headroom, multiplies atlas coverage and computed CSS ink alpha, and varies by wind/rest/calm/reveal. Plain fully-lit ink peaks around.26×CSS-ink-alpha, with much lower normal and resting levels; unlit cells can be omitted entirely. The resting multiplier is only.03, so it should remain extremely subtle. Hover/wake warmth is mostly monochrome ink; click ripples supply the blue tint. Glow color normalized RGB is dark(.1,.68,1), light(0,.25,1), approximately dark#1aadff and light#0040ff; source hue is chosen from computed color-scheme. Ink RGB and alpha come from the wrapper's actual computed color, not a hard-coded gray.

### Power and timing

Default draw interval40ms (~25fps),10ms while click ripples remain,83ms when backing off. Animation budget180seconds of recent activity, then8seconds to settle; activity extends the budget and can resume over3seconds. GPU/CPU lateness can pause it with retry starting60seconds and exponential backoff capped480seconds. Resize work debounces150ms. WebGL context loss hides and kills rendering. An independent implementation should keep these attention/accessibility/performance behaviors while using original math and drawing code; do not transplant the packaged shaders or font assets.

- **TEXTURE**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/c9d397622-Ddkc2XHN.js`; 35394 bytes; SHA256 `9c632651e14ba8e4cfcb40e28daf7e0c9b82a380c0c76aeb5c1a3ab9eef240f8`.
- **TEXTURE_HOST**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/cc43287c9-DAfOi8yP.js`; 857882 bytes; SHA256 `62ef8705cfef03f4e4159dbe8f6f3a052fcdf902cf0e64ab2f5bd8d4279ba1f2`.

## Font binary metadata correction and reuse evidence

Fresh read-only WOFF2 metadata inspection confirms the resources below. The compressed table stream was decoded with built-in Brotli, and its byte length exactly matched the sum of directory table lengths for all four files. Only metadata tables were inspected; no font was copied, installed or served.

All four fonts report version26.179.2, copyright2025–2026 Anthropic PBC, manufacturer BSPK LLC, designer BSPK x Geist x Anthropic, and vendor URL bspk.xyz. These credits do not establish equivalence to a publicly available Geist font. Each font has weight axis minimum300/default400/maximum800 and optical-size axis minimum16/default16/maximum48.

Metrics for all four at default coordinates: unitsPerEm2000; horizontal ascent1985, descent-515, lineGap0; OS/2 typographic ascent1985, descent-515, lineGap0; x-height1080 (54%em), cap height1440 (72%em). These are intrinsic font metrics; application CSS can impose a different line-height. They do not imply identical glyph widths between Sans and Serif or equivalence to a system substitute. No substitute with verified identical advances was established.

No name-table license-description record (ID13) or license-URL record (ID14) was present in these inspected fonts. OS/2 fsType is0, an embedding metadata value; it is not treated here as an independent permission or license grant. The inspected `ion-dist/third-party-notices.txt` says it covers optional accessibility fonts and is not a complete font inventory; its named licenses concern those accessibility fonts, not Anthropic Sans/Serif. Thus this bounded bundle inspection did not establish an explicit reuse grant for the supplied proprietary fonts in a private prototype. Whether such a use is permitted remains unresolved; no legal conclusion or claim of prohibition is made. No network legal lookup was performed.

- **Anthropic Sans Variable Text Regular**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/cc27851ad-DDVos-BJ.woff2`; 118172 bytes; SHA256 `542f0e8bf7a27f2300f4cfb4b8ad168bc4cf7dc1eeeb8471cac66802f58e137c`.
- **Anthropic Sans Variable Text Regular Italic**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/c9d3a3a49-CJtkx3-S.woff2`; 129536 bytes; SHA256 `ad89863fd0eb36e001166ea2a51e5102d18ffbbe4a0b321291a94d3739a5696b`.
- **Anthropic Serif Variable Text Regular**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/c66fc489e-2VcCjn5t.woff2`; 165536 bytes; SHA256 `ac9c19c70558c5152b92119f83ca37dded627b524d75552a26fcda015d4106be`.
- **Anthropic Serif Variable Text Regular Italic**: `/Applications/Claude.app/Contents/Resources/ion-dist/assets/v1/cc410af59-Dcb-9NUS.woff2`; 163440 bytes; SHA256 `d2fd488ae565a92da356c44e13cb3a5f7080f4ce1bfdd9ad11a30f0dcc3e6ba8`.
