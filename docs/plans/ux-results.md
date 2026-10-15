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
- [ ] Production connection recovery: invalid address, wrong credentials, network failure, cancel/retry and success with simulated HTTP boundaries.
- [ ] Folded group attention/running/unread indicators and keyboard descriptions.
- [ ] Navigator filter, same-name ownership, IME, Escape, keyboard selection and preserved collapse preferences.
- [ ] Historical search scope, pagination failure/cancellation and ownership isolation.
- [ ] Plugin configuration preview, cancel, invalid configuration and retry.
- [ ] Version provenance and current-service changes.
- [ ] Live service: connect, send, stream, switch, permissions, Review and terminal. Requires an already running authorized service.
- [ ] Native macOS/Windows: normal/maximized restore, monitor removal, scaling, external links. Requires those platforms.
- [ ] Full-session long-history reading during streaming, return-to-latest and side-panel/layout continuity. Adapter fixtures alone cannot verify these.
