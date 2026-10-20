# OpenCode v2.1.1 sync

The frontend follows upstream **v2.1.1**, commit `ba546ec1598a70db2570e9c6258028d955ba8f58`, verified against freshly fetched upstream tags on 2026-10-21 (Asia/Shanghai). The previous baseline was v2.0.32 at `843a6c514e606b436a7fe713422ace0a93ad3d61`. Root/Electron SemVer is `2.1.1+0`, corresponding to a future `2.1.1.0` release tag; this sync does not create a release.

## Import review

The plan selected 3,272 files: 49 changed, eight added and two removed, with no collisions or missing roots. Exact-commit inventory recording passed with **3,224 pristine files and 48 declared overlays**. Import roots, exclusions, overlays and frontend dependency patches remain unchanged.

- Import the shared workspace submenu, free-versus-paid model grouping, legacy transcript import decoding, provider icons and utility fixes.
- Import current session contracts, archive/unarchive events and filtering, canonical session cursors, and the generated protocol/client surface. Provider-specific message data now uses `native`; legacy credential and transcript conversion belongs to the imported schema compatibility modules. Removed `session-provider-context.ts` and `session-compaction-event.ts` are no longer referenced.
- The compaction message renderer reads the new `native.messages` field. The current client reducer and generated types are imported together with this change.
- Merge five affected tooling overlays: app contributor guidance, app/client/plugin-browser manifests and app TypeScript configuration. Preserve frontend-only scripts, build configuration and package boundaries.
- Adopt upstream TypeScript 7.0.2 through `@typescript/native`, the TypeScript 6 compatibility package and Playwright 1.60.0. Update port-owned typecheck commands to `tsc`; add CSS module declarations for the CodeArts extension and plugin examples. Bun remains pinned to 1.3.14.
- Preserve project-scoped session creation, compact group headings and fixed avatar/chevron placement, grouping/order persistence, floating history/search navigation, browser plugins, native CodeArts panels and existing-service attachment. Their implementation and native overlay mounts are unchanged.
- Update source provenance, README, root/public NOTICE and inventory. The upstream MIT license and copyright notice are unchanged. The new local fetch regression test is adapted from the upstream MIT test with a compatible HTTP fixture teardown.

## Validation

All commands used the PATH prefix `$HOME/.local/share/opencode-bun-1.3.14/bin`; `bun --version` reported exactly `1.3.14`.

| Command | Result |
| --- | --- |
| `git fetch --all --tags` in both repositories, with bounded HTTP connection/low-speed settings | Passed; no existing tags force-updated |
| `git show origin/main:docs/upstream.json` | Authoritative baseline read from fetched main |
| `bun run upstream:plan --source ../opencode --ref v2.1.1` | Passed; import counts above |
| `bun install --linker=hoisted` | Passed; updated lockfile; repeated installation leaves lockfile byte-identical |
| `bun run upstream:record --source ../opencode --ref ba546ec1598a70db2570e9c6258028d955ba8f58` | Passed; source identities verified before inventory replacement |
| `bun run check` | Passed import audit, all typechecks, **92 tests / 521 assertions** |
| `bun run build` | Passed production/PWA build |
| `bun test work/upstream-tests/packages/schema work/upstream-tests/packages/protocol work/upstream-tests/packages/client` | **56 tests / 216 assertions passed** |
| `bun test --conditions=browser scripts/upstream/test/no-timeout-fetch.test.ts` | Two request/cancellation tests passed, also included in the main check |
| `node scripts/desktop-stage.cjs 2.1.1.0` | Passed; staged metadata verified as `2.1.1+0` / `2.1.1.0` |
| `git diff --check` | Passed |

The additional tests were extracted from Git objects at v2.1.1 into ignored `work/upstream-tests/`, changing only relative source imports to point at this port. They cover legacy credential/transcript migration, event manifests, terminal diagnostics, cursor identity/round trips and client compaction/usage. They use upstream's normal Bun test conditions. An initial browser-condition invocation failed Solid proxy assertions; the normal-condition run passed without source changes.

The original upstream fetch test passed both assertions but hung in `Bun.serve.stop(true)` during teardown on Bun 1.3.14. The retained port test uses a disposable Node HTTP fixture with explicit connection shutdown, preserving both request and abort assertions; it passes within the main suite. Initial TypeScript checks found CSS declaration gaps in two port-owned packages, fixed by their local `styles.d.ts` files.

Frozen-lockfile installation rejects the already documented patched Ghostty Git dependency re-resolution on Bun 1.3.14, including on the previous baseline. The existing CI workflow deliberately uses `bun install --linker=hoisted`; that command succeeds and repeated runs do not change this lockfile. No CI policy change was required. Existing CSS optimization, Sentry dynamic-import, Vite config-loader and chunk-size warnings remain non-fatal.

## Production browser checks and benchmarks

Built the real adapter fixture before any session-related imports and rebuilt it afterward:

```sh
bun x vite build --config packages/app/performance/ux/vite.config.ts
bun x vite preview --config packages/app/performance/ux/vite.config.ts
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  node packages/app/performance/ux/history-benchmark.mjs work/v2.1.1-history-before.json
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  node packages/app/performance/ux/benchmark.mjs work/v2.1.1-groups-before.json
# After import/rebuild, repeat with history-after.json and groups-after.json output names.
```

Chrome 155.0.8059.85, 1280×900, one warm-up and ten measured samples per workload; two animation frames are included. Full samples and environment fields are in [benchmark evidence](upstream-v2.1.1-benchmarks.json).

| Median duration | Before | After |
| --- | ---: | ---: |
| History first-match selection | 26.25 ms | 26.45 ms |
| Group popup, 20 sessions | 32.25 ms | 32.70 ms |
| Group popup, 100 sessions | 32.35 ms | 32.60 ms |
| Group popup, 500 sessions | 32.40 ms | 31.70 ms |

History slowest sample was 27.00 → 27.20 ms. Filter/select medians stayed between 33.30 and 33.75 ms. All benchmark pages reported zero errors. These small differences do not establish a meaningful performance change. Fixtures measure local adapters with simulated data, not a live service, full virtualized transcripts or native desktop performance.

With production app preview on 4444 and fixture preview on 4445, all five existing keepers passed:

```sh
# Each invocation used the CHROMIUM_PATH above, UX_FIXTURE_URL=http://127.0.0.1:4445,
# and UX_SCREENSHOT pointing inside this isolated worktree's ignored work/ folder.
node packages/app/performance/ux/connection.mjs
node packages/app/performance/ux/plugins.mjs
node packages/app/performance/ux/groups.mjs
node packages/app/performance/ux/history.mjs
node packages/app/performance/ux/version.mjs
```

Connection validation/recovery, plugin preview/import/cancel/mobile flows, folded group status and project-specific creation, instance/worktree isolation, filtering/IME/keyboard behavior, paginated history selection/cancellation/retry and version-information behavior all passed with zero page errors. The version keeper now reads the declared provenance version instead of asserting an obsolete literal.

## Unverified interactions

No desktop application was launched. Native macOS/Windows packaging and interaction, a live backend's v2.1 session events, legacy-service interoperability, real provider sessions and full transcript performance remain unverified. Browser checks used mock responses or fixture providers and no real credentials. No existing backend or running application was started, stopped, upgraded or restarted. The primary checkout's existing `bun.lock` change was preserved.
