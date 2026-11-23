# OpenCode v2.4.1 port

The frontend imports upstream commit `6f0514052a3c859894ad01bb14cc14dda1e44b96`. Both projects pin Bun 1.4.4 and each GitHub Actions Bun setup reads the root manifest. Client version `2.4.1+0` stages as release `2.4.1.0`.

The upstream sidebar retains its custom tab sections, drag behavior, and pinned rows where the consolidated navigation prototype is available. The port retains optional project grouping, its layered project rail, and the compact native-frame toolbar. The upstream settings migration maps the retired Projects organization to Customize in stable builds. The layered rail remains available in the port and owns its project-targeted new-session action. Existing service attachment and the official CodeArts plugin host remain in place.

The partial import includes the upstream browser preview-path and workspace helpers. The Electron bundle handles raw GUI assets and stages the upstream `ffi-rs` binding outside the app asar so native file-preview verification can load it. ChatGPT/Codex account sign-in was left in place.

## Local validation

All commands ran on Apple Silicon with the isolated Bun 1.4.4 on PATH.

- Exact-commit `bun run upstream:plan --source ../opencode --ref 6f0514052a3c859894ad01bb14cc14dda1e44b96` and `upstream:record` completed. The final plan selects 4,110 files with no differences, collisions, or missing roots. The audit reports 4,029 pristine files and 81 overlays.
- `bun run check` passed all type checks, 80 tests with 307 assertions, and native host fixture checks for IPC, storage, isolation, cancellation, lifecycle, and embeds.
- `bun run build` passed the production/PWA and native bundle builds. Vite reported CSS and bundling warnings. `bun install --frozen-lockfile --linker=hoisted` left the lockfile byte-for-byte consistent.
- `node scripts/desktop-stage.cjs 2.4.1.0` produced the expected SemVer and four-part release version. Node loaded the staged macOS FFI binding. The signed package contains the unpacked binding and passed `codesign --verify --deep --strict`.
- Two runs of `RELEASE_TAG=2.4.1.0 python3 scripts/archive-codearts.py` produced identical valid ZIPs with SHA-256 `b323e4f062a19e233f0987fb983084b537b7a1880de1b0d589e64236d782e9a2`.
- Nine browser keepers passed against production builds. They covered project groups, layered sidebar, history, release metadata, native-frame geometry, saved layout, About clipboard, connection recovery, and the official GUI/main host. The desktop keeper exercises the Customize settings action and one project-targeted new-session control. Logs and screenshots are in the isolated worktree under `work/v2.4.1` and `work/layout-implementation`.

## Production fixture comparison

Built the same fixture before import and after integration with `bun --bun node_modules/vite/bin/vite.js build --config packages/app/performance/ux/vite.config.ts`. Ran the existing `history-benchmark.mjs` and `benchmark.mjs` browser scripts against each build.

| Interaction | Baseline median | v2.4.1 median |
| --- | ---: | ---: |
| First history match after a page prepend | 26.0 ms | 26.3 ms |
| Open group navigator with 20 sessions | 32.4 ms | 32.2 ms |
| Open group navigator with 100 sessions | 32.9 ms | 33.0 ms |
| Open group navigator with 500 sessions | 32.2 ms | 31.2 ms |

The 500-session candidate maximum was 49.3 ms versus 33.8 ms in the baseline. Raw samples are in `work/v2.4.1`. The upstream Strobe timeline benchmark could not initialize because its e2e mock-server module is outside the port. These fixture measurements cover the custom adapters. Full transcripts, real provider sign-in, and interactive native browser previews still need live verification.
