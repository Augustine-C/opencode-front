# OpenCode v2.0.32 sync

The frontend follows upstream Git tag **v2.0.32**, commit `843a6c514e606b436a7fe713422ace0a93ad3d61`, checked against remote V2 tags on 2026-10-17. The previous baseline was v2.0.31. This sync ships as OpenCode Front [2.0.32.0](releases/2.0.32.0.md), with root/Electron SemVer `2.0.32+0`.

## Imported changes

The import plan contains 16 changed files and one addition, with no collisions or missing roots. The inventory now records **3,266 files**: 3,218 pristine imports and 48 declared overlays. Three package-manifest overlays retain their frontend-only configuration while adopting the upstream version.

- Import the experimental `POST /api/experimental/voice/session` protocol, OpenAPI document, Effect client and generated promise client/types. The API supports server-brokered WebRTC SDP and WebSocket ephemeral credentials. This source sync does not add a voice UI or activate a backend feature.
- Update retained package versions and upstream protocol/schema test scripts. The dependency catalog and dependency versions are unchanged; Bun 1.4.3 removes one redundant nested Ghostty lockfile entry during installation.
- Update README, source provenance and attribution. The public application NOTICE was still pinned to v2.0.29 and now matches the root NOTICE and v2.0.32 source.

No session, timeline, GUI component or port-owned plugin implementation changed. Upstream server/core/CLI/TUI fixes remain outside the frontend import boundary. Existing service processes are not upgraded or restarted.

## Validation

- `bun install --linker=hoisted` passed on Bun 1.4.3.
- `npx --yes bun@1.3.14 run check` passed the import boundary audit, all type checks and **90 tests / 519 assertions**, using the CI-pinned Bun version. An initial run on the environment's Bun 1.4.3 failed to resolve Solid's `jsxDEV` export in the existing panel test; the pinned version passed without source changes.
- `bun run build` passed and generated production/PWA assets; existing CSS, dynamic-import and chunk-size warnings remain.
- Production Chromium connection and plugin keepers passed, including invalid addresses, rejected credentials and correction, network failures, timeout/cancel, pairing recovery, JSONC preview/cancel/import, sensitive-value hiding and mobile plugin configuration. Both reported zero page errors. They used disposable browser contexts and simulated responses.
- A request/response smoke check of the generated promise voice client passed both WebRTC and WebSocket transports with simulated fetch, verifying the POST route and request body. Real voice-provider sessions and compatibility with older services were not exercised.
- `node scripts/desktop-stage.cjs 2.0.32.0` and `git diff --check` passed. Native macOS/Windows packaging and macOS archive validation run in the release workflow; local native interaction is unverified.

No running user application or backend was started, stopped, upgraded or restarted. Only a static production preview was started for browser checks. No session/timeline benchmark was needed because those sources are unchanged.
