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
- [ ] Historical search scope, pagination failure/cancellation and ownership isolation.
- [ ] Plugin configuration preview, cancel, invalid configuration and retry.
- [ ] Version provenance and current-service changes.
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
