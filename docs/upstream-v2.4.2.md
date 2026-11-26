# OpenCode v2.4.2 port

The frontend imports OpenCode commit `fc31a485317970bcf6be7b431a9830aaef875731`. The upstream and port both pin Bun 1.4.4. All three GitHub Actions Bun setups read the root manifest. Package version `2.4.2+0` stages as release `2.4.2.0`.

The import keeps the upstream archived-session search, Inbox updates, question-submit preference, and timeline layout and history changes. The titlebar overlays combine upstream horizontal tab sections, session trackers, and Linux side-tab menu placement with the port's optional project grouping, layered sidebar, and compact native toolbar. Existing service attachment, ChatGPT/Codex account sign-in, and the official CodeArts GUI host continue through their existing entry points.

## Local validation

- The exact-commit import plan selected 4,118 files. The recorded inventory verifies 4,037 pristine files and 81 overlays. The final plan showed zero differences, collisions, or missing roots.
- `bun run check` passed type checks, 80 tests with 307 assertions, and native host integration covering IPC, storage, cancellation, embeds, and service isolation. The five upstream automatic tab grouping tests passed against the ported module.
- `bun run build` passed production/PWA and native bundle builds with CSS and bundler warnings. The frozen hoisted reinstall left the lockfile byte-for-byte consistent.
- Desktop staging verified both version formats and loaded the macOS FFI binding. The signed arm64 package contains the unpacked binding and passed `codesign --verify --deep --strict`. Two runs of the release workflow's CodeArts archive command produced the same SHA-256 and passed ZIP integrity verification.
- Nine production browser keepers passed. They exercised the project groups, layered sidebar, history navigation, About clipboard, version and upstream metadata, saved project layout, compact native-frame controls, service connection and recovery, and the official GUI host.

## Production fixture comparison

Both versions used Bun 1.4.4, the production Vite fixture and the same Chromium build. The fixture scripts used mock service data.

| Interaction | v2.4.1 median | v2.4.2 median |
| --- | ---: | ---: |
| First history match after a page prepend | 26.4 ms | 26.2 ms |
| Open group navigator with 20 sessions | 32.3 ms | 32.4 ms |
| Open group navigator with 100 sessions | 32.5 ms | 32.5 ms |
| Open group navigator with 500 sessions | 32.5 ms | 31.5 ms |

Logs and raw results are under `work/v2.4.2` in the isolated worktree. The upstream Strobe suite could not start because its e2e mock-server module is outside the frontend import. The local fixture runs leave full-transcript performance, real-provider sign-in, and live native browser interactions unverified.
