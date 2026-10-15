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
