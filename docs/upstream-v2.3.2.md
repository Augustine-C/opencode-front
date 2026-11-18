# OpenCode v2.3.2 port

The port imports upstream commit `c0ad18b402eb2827fc1ee71c171b1177b3fc02d1`. Bun 1.4.4 is the verified upstream pin and is used by local checks and every GitHub Actions job. The package version `2.3.2+0` stages as release `2.3.2.0`.

The shell retains upstream sidebar peek sizing and focus handoff using the active port sidebar width. The tab strip renders upstream leading rows and preserves their keyboard navigation while keeping the optional project navigator and layered rail. The standard native frame retains the compact toolbar and has a Settings action in Projects and Customize mode. The layered view has one new-session action, which uses the selected project. Extensions settings keeps upstream package update state and the port's service ownership checks for desktop GUI plugins. Existing service attachment, ChatGPT/Codex sign-in and the official CodeArts host remain in place.

The import includes the upstream Kobalte patch. Two Components Lab support files are excluded by the story-only import policy. The native test double implements the bounds and image-size methods called by the imported embed capture path.

## Local validation

All local commands ran on Apple Silicon with the isolated Bun 1.4.4 binary on PATH.

- `bun run upstream:plan --source ../opencode --ref c0ad18b402eb2827fc1ee71c171b1177b3fc02d1` and `upstream:record` used the exact selected commit. The final plan has 3,908 files and no changes, collisions or missing roots. The audit reports 3,827 pristine and 81 adapted files.
- `bun run check` passed type checks, 80 tests with 307 assertions and native host IPC, persistence, cancellation, lifecycle and embed ownership checks.
- `bun run build` passed production/PWA and native bundle builds with upstream CSS and bundle warnings. `node scripts/desktop-stage.cjs 2.3.2.0` verified both staged version fields. An install with `bun install --frozen-lockfile --linker=hoisted` left the isolated lockfile byte-for-byte consistent.
- `RELEASE_TAG=2.3.2.0 python3 scripts/archive-codearts.py` produced the same valid plugin source ZIP twice. Its SHA-256 is `b323e4f062a19e233f0987fb983084b537b7a1880de1b0d589e64236d782e9a2`.
- Nine production browser keepers covered groups, layered sidebar, history, version information, native-frame layout, saved project layout, About clipboard, connection recovery, and the official GUI/main host. The desktop layout keeper also checks peek width, the Projects settings action and one new-session control. Local browser logs and screenshots are under the worktree's ignored `work/v2.3.2` and `work/layout-implementation` directories.

## Production fixture comparison

Built the fixture with `bun --bun node_modules/vite/bin/vite.js build --config packages/app/performance/ux/vite.config.ts` before import and after integration. Ran `node packages/app/performance/ux/history-benchmark.mjs` and `node packages/app/performance/ux/benchmark.mjs` against each production fixture in Chrome 155.0.8059.86 at 1280 × 900. Each result uses one warm-up and ten samples, including two animation frames.

| Interaction | Baseline median | v2.3.2 median |
| --- | ---: | ---: |
| First history match after a page prepend | 26.05 ms | 25.95 ms |
| Open group navigator with 20 sessions | 32.20 ms | 32.30 ms |
| Open group navigator with 100 sessions | 32.40 ms | 32.30 ms |
| Open group navigator with 500 sessions | 32.60 ms | 32.60 ms |

Differences are within browser frame and scheduling variation. Raw fixture measurements are under `work/v2.3.2`. The upstream strobe command could not initialize because the port excludes its e2e mock-server dependency and has no `origin/dev` ref. Full-transcript performance, real provider login, real package updates and native window compositing remain unverified by these local fixtures.
