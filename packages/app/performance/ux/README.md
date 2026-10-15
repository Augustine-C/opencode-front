# GUI interaction fixture

Production bundles of the real project grouping adapter and navigator, with deterministic mock connection/session/settings providers. No server, private data, or production test switch is used. It measures local adapter rendering and fixture selection, not transcript rendering or network/session entry.

From the repository root:

```sh
bun x vite build --config packages/app/performance/ux/vite.config.ts
bun x vite preview --config packages/app/performance/ux/vite.config.ts
# Another terminal; CHROMIUM_PATH selects an installed Chromium executable.
node packages/app/performance/ux/benchmark.mjs work/ux-ui.json
```

The benchmark uses 20/100/500 cached session titles, four instances and five projects per instance, a 1280×900 viewport, one warm-up and ten measured open/select cycles. After filtering is implemented it also measures input-to-render. Each duration includes two animation frames. Raw samples, page errors, long tasks and coarse CDP DOM/heap counters are recorded. The current benchmark forces GC before its coarse snapshots; retained heap still includes warm-up, caches and JIT effects. `retention.mjs` separately checks 20/40/60 popup cycles after disposal. Neither report proves leak freedom. Browser scheduling and container load affect these samples. Compare repeated batches under the same conditions; do not infer native service or low-end-device performance.


## History first-match benchmark

With the same production fixture preview running, measure the real search controller and history adapter when an initially empty query result receives its first page of matches:

```sh
UX_FIXTURE_URL=http://127.0.0.1:4445 node packages/app/performance/ux/history-benchmark.mjs work/ux-history-search.json
```

This uses 20 initially loaded messages, prepends ten mock messages, and asserts the first of ten matches remains selected. It records one warm-up and ten measured samples at 1280×900, including two animation frames. This measures local search/adapter work, with a browser frame/scheduling floor; small timing differences do not demonstrate a speedup or live-service transcript performance. The history behavior keeper separately verifies selection remains stable after further prepends.

## Behavior keepers

With the production app preview at port 4444 and the fixture preview at 4445, run the keepers from the root:

```sh
node packages/app/performance/ux/connection.mjs
node packages/app/performance/ux/plugins.mjs
UX_FIXTURE_URL=http://127.0.0.1:4445 node packages/app/performance/ux/groups.mjs
UX_FIXTURE_URL=http://127.0.0.1:4445 node packages/app/performance/ux/history.mjs
UX_FIXTURE_URL=http://127.0.0.1:4445 node packages/app/performance/ux/version.mjs
```

The first two drive the production app with simulated HTTP/configuration data. The other three drive real adapters with fixture providers; `?history=1` and `?version=1` select those additional fixture surfaces. Set `UX_SCREENSHOT` to a writable destination when retaining a screenshot; it defaults to the original task workspace. No script starts a backend or supplies real credentials. Native platform execution and full virtualized transcripts remain separate acceptance work.
