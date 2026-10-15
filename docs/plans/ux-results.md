# UX implementation evidence

Owner: Codex. Started 2026-10-15. No Release or client version bump is part of this work.

## UX-00 — baseline established

Environment: Linux x86_64 container, AMD EPYC 9V74, approximately 9.7 GiB RAM, Bun 1.4.3 with hoisted dependencies, system headless Chromium (exact browser version in the raw report), 1280×900 viewport. No backend or application was running when work began. No service credentials are configured. Full-service scenarios and native macOS/Windows tests are unavailable; they remain explicitly pending below.

Baseline source: `a356b05`, upstream v2.0.28. `bun run check`: 49 passing tests / 244 assertions; production/PWA build passed. Production connection screen → frontend plugin manager opened without page errors. Screenshots captured in the task workspace. Build warnings: generated CSS, mixed static/dynamic imports and large chunks.

A production fixture of the real grouping adapter and floating navigator uses fixed synthetic titles: 20/100/500 open sessions, four instances, five projects per instance. One warm-up and ten repeated interactions per size; two animation frames are included in each observation. [Raw browser samples](measurements/ux-00-ui.json) include open/selection durations, long tasks and coarse DOM/heap counters. Opening medians were 75.9/41.2/114.4ms; slowest samples 188.5/144.7/135.6ms. This noisy baseline does not establish a general performance budget or native session-switch latency. Filtering is absent in the baseline. [Reproduction instructions](../../packages/app/performance/ux/README.md).

The separate [tab reducer baseline](measurements/ux-00-tabs.json) has seven samples of 20,000 operations, median 8.15ms, checksum 720,000. The post-sync production bundle is byte-identical (SHA-256 `428a70f634bb49d36d4c636366191596246a2517ef6b45c7e0094ddfb1f11d4f`); [post-sync samples](measurements/upstream-2.0.29-tabs.json) are timing noise, not a UI improvement claim.

### Executable regression checklist

- [x] Production connection screen and plugin manager render without page errors.
- [x] Fixture 20/100/500 open/select cycles, stable instance/project ownership, raw samples retained.
- [x] Production connection recovery: invalid address, wrong credentials, network failure, cancel/retry and success with simulated HTTP boundaries.
- [x] Folded group attention/running/unread indicators and keyboard descriptions.
- [x] Navigator filter, same-name ownership, IME, Escape, keyboard selection and preserved collapse preferences.
- [x] Historical search scope, pagination failure/cancellation and ownership isolation.
- [x] Plugin configuration preview, cancel, invalid configuration and retry.
- [x] Version provenance and current-service changes.
- [ ] Live service: connect, send, stream, switch, permissions, Review and terminal. Requires an already running authorized service.
- [ ] Native macOS/Windows: normal/maximized restore, monitor removal, scaling, external links. Requires those platforms.
- [ ] Full-session long-history reading during streaming, return-to-latest and side-panel/layout continuity. Adapter fixtures alone cannot verify these.

## UX-01 — connection recovery implemented

Interactive checks bypass shared health-cache promises and own a 30-second deadline, cancellation and immutable input snapshot. Cancelling or leaving the screen invalidates all late health/pairing results; it never saves a connection. Pairing redemption itself may finish in the background (its existing native five-second probes are unchanged). Authentication, invalid address, mixed content, network and timeout feedback are distinct. Retry reuses the form; edit focuses credentials/address; diagnostic help lists possible causes without dumping raw errors, passwords or tokens. Existing duplicate-URL registration and pairing/QR paths remain.

The health hook is an explicitly declared service-attachment overlay. No health polling cadence or backend lifecycle changed. `bun run check`: 49 tests passed; production/PWA build passed. `node packages/app/performance/ux/connection.mjs` drives the production connection screen through invalid address, HTTP 401, credential focus, network failure, cancellation followed by late success, timeout (browser clock), successful registry insertion and HTTPS mixed-content rejection. All eight checks passed without page errors. HTTP responses are simulated; this is not a real backend test. Pairing and QR scanning retain native behavior but were not exercised against a live service.

## UX-02 — grouped status implemented

Instance/project headings aggregate native session-family permission/form attention, connection health, busy/pending and unread state, in that order. The native avatar-state hook now exposes its already computed `needsAttention` accessor through a declared overlay; no additional polling or message loading is introduced. Each heading displays at most one marker with an accessible reason in its label and tooltip. The marker belongs to the existing fold button; it does not introduce a second navigation action or alter drag semantics. Pure aggregation tests cover priority, clearing and cross-instance project isolation.

`bun run check`: 50 tests passed; production/PWA build passed. `node packages/app/performance/ux/groups.mjs` drove the production adapter fixture: a folded instance retained its marker, keyboard-accessible reason and collapsed preference, then cleared the marker when attention was handled. No page errors. The fixture substitutes native status accessors; real permission delivery still requires a live service.

## UX-03 — desktop window restoration implemented

The thin shell saves a versioned, separate normal rectangle and maximized flag in its application user-data directory. Move/resize writes are debounced for 250ms; close flushes immediately through an atomic rename. Restoration validates numeric bounds/minimum dimensions, picks the best-overlapping current display, and clamps geometry into its DIP work area. Removed monitors, changed work-area sizes, missing files and corrupt JSON fall back to visible geometry. Desktop staging includes the helper.

`bun run check`: 52 tests passed, including geometry/monitor/corruption cases and a close-to-disk/read-back test proving maximized state does not overwrite normal bounds. Production/PWA build and desktop staging passed. Actual macOS/Windows maximization, monitor hotplug and scaling remain unverified; this Linux helper test is not an Electron platform test.

## UX-04 — open-session filtering implemented

The group popover now filters cached session title, project and instance labels with the native command palette's case-insensitive substring rule. Its matcher lives in a UI-heavy dialog module, so the adapter uses the same simple rule over a memoized local index rather than importing the entire command dialog. Results retain saved group order and show instance/project context. Filtering temporarily reveals matches without writing collapse state, removes drag targets, and never fetches transcripts. Keyboard navigation uses an active descendant while input focus stays in the query. IME composition does not select; Escape clears a query before closing; close restores trigger focus. Empty queries preserve current-session positioning.

`bun run check`: 52 tests passed; production/PWA and production fixture builds passed. The extended groups browser keeper passed instance/project/Chinese filtering, no-results feedback, IME, arrow/Enter selection, two-stage Escape, focus restoration and collapse preferences, plus 390/320px and 640×450 (200% viewport equivalent) widths. No page errors or horizontal popover overflow. [Pre-index-optimization measurements](measurements/ux-04-ui.json) use the same 20/100/500 fixture; 500-session opening median 136.1ms, slowest 153.7ms. These are the comparison baseline for UX-06, not claimed gains over UX-00.

## UX-05 — history search continuity implemented

Search now distinguishes no loaded matches from an exhausted session history. A user may load one page or explicitly search up to five earlier pages, stopping on a new match. Stop, query changes, close and session ownership changes prevent further pages; the page already in flight may finish. Errors remain scoped to the requesting session. Loading unpins native auto-follow, while native virtualization/return-to-latest remains responsible for reading geometry. Active search hits are keyed by part/occurrence so prepending old matches does not silently move selection. The search controller also resets on the full session identity, including instance, rather than only the session ID.

`bun run check`: 53 tests passed. Production/PWA and adapter fixture builds passed. The history browser keeper passed stable hit selection after prepend (2/4 → 4/6), partial/exhausted scopes, five-page limit, stop-after-page, failure/retry, late failures after switching instances with the same session ID, and Escape/focus restoration. It also exposed and fixed focus loss when the final load button disappears. Fixture data replaces service pages; it does not represent native virtualized transcript rendering during streaming. [Before](measurements/ux-05-before-tabs.json)/[after](measurements/ux-05-after-tabs.json) production reducer samples retained identical bundle hashes and checksums; they cannot establish transcript performance.

Full-service rail jumps during streaming, actual reading anchors, Review/terminal/layout continuity and native return-to-latest behavior remain pending the live-service environment. No unbounded full-history load or backend change was introduced.

## UX-06 — group indexing and scale validation implemented

Group membership is memoized independently of titles/status. A shared one-pass visible-tab index supplies instance/project first rows, group offsets and visible positions; weakly keyed array caches are invalidated on membership changes. The native shortcut mount now uses this same index. Cached normalized label fields serve the existing filter, avoiding another text index. No virtualization or new dependency was introduced.

`bun run check`: 54 tests passed; production/PWA and fixture builds passed. The full grouping/filter/keyboard/IME/responsive keeper passed unchanged. Same-container, browser and data, ten samples each: [before](measurements/ux-06-before-ui.json), [after](measurements/ux-06-after-ui.json). Using the usual average of the two middle samples, 500-session opening median changed 124.4 → 77.3ms (slowest 150.2 → 107.0ms); fixture selection 83.2 → 33.5ms. At 100 sessions opening was 38.2 → 32.7ms; 20 sessions stayed about 31ms. Filter observations remained around the frame/scheduling floor (500 sessions 26.5 → 23.4ms). These are local fixture interactions, not service or transcript latency. At 500 sessions long-task observations decreased from 20 to 10; stress-scale jank still exists, so this is not a claim that every interaction meets 100ms.

A [60-cycle retention probe](measurements/ux-06-retention.json) alternated instance/project filtering and selection across 500 sessions, waiting for popup disposal and forcing GC at 20/40/60 cycles. DOM/listener counts were 5220/262, 5239/267, then 5220/262; heap was 3.90/4.00/4.05MB. There was no monotonic DOM/listener accumulation in this run; modest heap growth needs a longer real-session study before claiming leak freedom. Low-end devices, real streaming titles and live session switching remain unverified. The common 100-session fixture is comfortably below the provisional median target, so virtual-list complexity is deferred pending stronger real-world evidence.

## UX-07 — plugin import preview and recovery implemented

Parsing and adapter resolution now produce a read-only preview before any configuration write. The preview accurately describes replacement, built-in defaults, enable/disable/options/unchanged entries and ignored adapters; it never displays option values or installs code. Back cancels without writing. Applying preserves the existing serialized disable/enable lifecycle; failed initialization remains saved and visible, with explicit instructions to disable/correct/retry and no promise of atomic side-effect rollback. A rejected prior queue entry no longer prevents subsequent attempts. Friendly parse/configuration/initialization feedback has expandable diagnostics that hide configured string values, URL credentials/query/fragment data and common authorization fields. There is no configuration export feature. Plugin switches now have real accessible labels.

`bun run check`: 56 tests passed (286 assertions); production/PWA build passed. The production plugin-manager browser keeper passed invalid JSONC, unsupported configuration shape, no-write preview/cancel, ignored adapters, replacement, sensitive-value hiding, re-enable/retry and a 390px viewport without page errors. The existing failed-setup lifecycle test now also verifies repeated retries produce one command, one panel and one slot, preserving cleanup/error isolation. No real third-party account or credential was used.

UX-07 focus follow-up: preview entry now focuses its review heading instead of the Apply button, keeping the summary at the start of the scrollable dialog. The production import keeper passed again, including cancellation and mobile application.

## UX-08 — independent version provenance implemented

The native About page now mounts a port-owned version adapter while retaining the original credits, copyright and license. Web and desktop share metadata embedded into the renderer at build time: independent root package version, Git commit/local changes, upstream GUI version and source commit. A clean HEAD must have the exact matching four-component client release tag to be called released; source archives, ordinary commits and dirty builds remain explicitly unreleased. No version number was bumped and no Release was created.

The instance selector defaults to the session that opened settings (or an unambiguous single service). Its version comes from current native health results, with unavailable versions shown as unknown and old values hidden. The page links to client release/build history, version-specific GUI sync notes and service tag history. The upstream v2.0.29 Release API returned HTTP 404 despite the Git tag existing, so dead v2 Release URLs are deliberately avoided. External links use the existing anchor/desktop safe-open path. No update download or backend operation is added.

This also completes UX-01's compact connection footer: it uses the instance alias or host, with the full URL on demand in its tooltip. The plugin SDK's optional `connection.name` is additive for existing plugins.

`bun run check`: 57 tests / 291 assertions passed. Production/PWA and adapter fixture builds passed. Build-info tests verify clean exact tags, mismatched tags, untagged source, dirty builds and independent GUI versions. The real version adapter/browser keeper passed unreleased provenance, GUI baseline, switching services, unknown values after disconnect, external-link attributes, compact footer and 390px layout without page errors. Desktop staging reuses the same built renderer and includes window persistence; actual packaged macOS/Windows execution remains pending.

## Final verification and commit ledger

Final source checks: 57 passing tests / 291 assertions; import audit 3,212 pristine files + 48 declared overlays, no boundary errors; all app/SDK/extension/example type checks passed. Production/PWA build passed with existing CSS, mixed-import and chunk-size warnings. Five browser keeper scripts passed: production connection and plugin manager, plus real grouping/filter, history-search and version adapters with fixture providers. Additional production smoke checks covered light 1280×900 and dark 390×844 modes (actual computed backgrounds differed), preview-heading focus and no horizontal overflow. A touch-enabled 390px Chromium context selected a filtered session successfully. Desktop staging passed. No browser page errors were observed.

The upstream tag list was checked again at completion: v2.0.29 is still the latest v2 tag. Work stays on the local `work` branch. No push, tag, Release, backend operation or running-app restart was performed. The root client version remains `2.0.28+0`; builds identify these source changes as unreleased, independently of the imported GUI v2.0.29.

| Step | Commit |
| --- | --- |
| Upstream v2.0.29 synchronization | `0d0e375` |
| UX-00 baseline/reproduction | `ca4c930` |
| UX-01 connection recovery | `445b2de` |
| UX-02 group status | `9c6fd21` |
| UX-03 desktop geometry | `791ae66` |
| UX-04 open-session filter | `a0ba12c` |
| UX-05 historical search | `17c71c3` |
| UX-06 group indexes/performance | `47a1734` |
| UX-07 import preview/recovery | `2b3088d` |
| UX-07 review-heading focus | `33eb0a0` |
| UX-08 version sources and compact connection footer | `ed32eef` |

Remaining acceptance work is explicit: real service connect/send/stream/permissions/Review/terminal flows, actual virtualized long-history reading and return-to-latest/layout continuity, packaged macOS/Windows window restore/monitor/scaling/link behavior, and low-end/long-duration performance. The checked implementation tasks above do not certify these unavailable environments.

## Review correction R1 — paired address survives credential recovery

The production connection keeper reproduced the reported failure on `dd91474`: redeeming a pairing link succeeded, the health check returned HTTP 401, and Edit credentials opened an empty address field. The connection screen now retains the endpoint of the current failed authentication probe in the address field, behind the existing request-ownership guard. It does not copy the pairing token into the password field.

The keeper now covers pairing links in both the dedicated link form and the password form's address field. Both restore the actual server address, focus the password, accept a corrected password, successfully register the connection and redeem the pairing code only once. The added assertion failed before the fix and passed afterward. `bun run check` passed (57 tests / 291 assertions), the production/PWA build passed, and the connection and plugin-manager browser keepers passed without page errors. Responses and credentials are synthetic; no live service operation was performed.

## Review correction R2 — preserve the first match supplied by pagination

The history browser keeper reproduced the second report before the controller change: a query with no loaded matches gained ten hits on the first page, but prepending an earlier hit changed `1/10` to `1/11`. The controller now stores the resolved part/occurrence identity when reactive message updates supply a match, including the first hit after an initially empty result. Later prepends retain that identity rather than repeatedly falling back to the first row. This is a declared upstream overlay in the native timeline search controller.

The extended keeper fails before the fix and passes afterward: zero loaded results → `1/10` → `2/11`. Existing `2/4` → `4/6` selection, search scopes, five-page limit, cancellation, failure/retry, cross-instance isolation and focus restoration also pass. `bun run check` passed (57 tests / 291 assertions); production/PWA and adapter fixture builds passed. All five browser keepers (connection, plugins, groups, history and version) passed on the final builds without page errors.

A production-bundled controller/adapter benchmark was recorded before the source change and repeated afterward with the same browser, 1280×900 viewport, mock messages, one warm-up and ten measured samples: [before](measurements/review-r2-before-search.json), [after](measurements/review-r2-after-search.json). Initial zero-results → first page of matches measured median 25.95 → 24.40ms and slowest 29.90 → 29.30ms, including two animation frames. These small differences are within browser scheduling variation; no speedup is claimed. The reproducible `history-benchmark.mjs` and fixture instructions retain this workload. This is local search/adapter evidence, not live-service or virtualized transcript performance.
