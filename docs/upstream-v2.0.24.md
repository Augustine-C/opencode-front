# OpenCode v2.0.23 and v2.0.24 sync

The frontend port now targets **v2.0.24**, incorporating both releases since its v2.0.22 baseline. Analysis is based on the fetched upstream Git tags and their commits; GitHub's release API did not provide a release entry for v2.0.23 during this review.

| Version | Tagged commit | Tag commit date (UTC) | Comparison |
| --- | --- | --- | --- |
| v2.0.22 baseline | `527f0b931d1f9b3ebd34e106c51b31ce5db5b075` | — | — |
| v2.0.23 | `0fd7e2829449b052abf0078666669302923d77af` | 2026-10-05 | [v2.0.22 → v2.0.23](https://github.com/anomalyco/opencode/compare/v2.0.22...v2.0.23) |
| v2.0.24 | `e7a34f09bfd9134dfade5a8ddb843f7030bc9a69` | 2026-10-06 | [v2.0.23 → v2.0.24](https://github.com/anomalyco/opencode/compare/v2.0.23...v2.0.24) |

## v2.0.23

The main frontend changes are session execution visibility, inbox behavior, and a substantial GUI extension SDK refactor.

- The header shows running subagents and shell jobs. The running menu closes before navigating to a subagent; Working remains visible during reasoning-only output.
- The app aligns queue, steer, inbox and revert behavior with the TUI.
- Review controls move into their owning panels. Side-panel tabs survive session movement, and agent previews wait while their session is off screen.
- Message metadata shows the model variant. Markdown images support Windows paths, and the selected browser address bar no longer appears excessively bold.
- GUI extensions gain typed composition and lifetime primitives. The SDK tightens its public surface; host APIs, IPC, registry contributions, mounted sessions and session screens become explicit boundaries. Extension enabled-state renames and startup state are handled more consistently. Details, browser cleanup, updater checks and panel state receive fixes.
- The app, shared UI and schema packages enable unused-local checks and remove obsolete contracts.

Upstream backend/CLI/TUI changes include native Cohere and Venice providers, Google Interactions and Anthropic Messages on Bedrock Mantle, system-message preservation and ordering fixes, compaction-agent model selection, transient MCP reconnect retries, persistent-PTY handoff fixes, service startup/restart handling, Windows subprocess/install fixes and Homebrew Core upgrades. TUI changes include read ranges, stable transcript rows when history is prepended, searchable plugin select dialogs and plugin keymaps during setup. These require the relevant upstream runtime and are not backend features implemented by this port.

## v2.0.24

The second release builds on that session and extension work.

- Queued messages and pending steers become clearer, as do running-work indicators in session headers. Working remains visible when reads join a read group.
- A staged revert commits before the user changes the selection.
- Each `/btw` answer stays in its own tab until closed; recording no longer waits for the store to load.
- Sessions regain a missing-location prompt. Phone titlebars avoid the iOS status-bar blur.
- Side-panel tabs receive clipping/alignment fixes, timeline errors and grouped updates receive spacing fixes, and markdown bold weight softens to 670.
- The SDK renames `Point` to `Registry`. Client service health probing and startup-attempt bookkeeping are shared internally.

Upstream runtime changes include native Vercel AI Gateway support, AI SDK v6 providers by default, GitLab Duo reasoning variants and a provider bump, Codex OAuth naming, a temporary pause of ChatGPT `/models` synchronization, excluding non-text models from default selection, Azure chat routing, shell use for explore, preservation of subagent text boundaries, MCP OAuth callback error reporting, portable Bash/PowerShell scanning fixes and Windows instruction-root matching. TUI changes prioritize sessions awaiting input and improve subagent filters and Mermaid layout. Desktop update manifests retain each file's SHA-512. These runtime and managed-desktop implementations remain outside this frontend port.

## What was synced

The existing executable import policy selected **3,210 files**: 796 changed, 173 added and 161 removed relative to the previous inventory. The audit records **3,167 pristine imports and 43 declared overlays**. Many additions/removals are extension module and translation moves rather than independent new features.

All selected app, UI, session UI, client, schema, protocol, util, GUI extension and partial browser-plugin sources were imported from the tagged Git objects. Source tests and backend implementations remain outside the established import scope. Root catalog values and the selected dependency patches did not change between these tags; dependency installation with the existing lockfile succeeded.

Ten overlay conflicts were resolved to retain browser plugin providers/slots, native plugin panels and fullscreen behavior, grouped project-tab drag ordering, port-owned icon paths and existing-service connection/project discovery. The removed upstream Highlights provider was removed from the port's wrapper as well.

The port-owned plugin bridge was migrated to:

- `MenuItem` contributions, `ctx.layout` and `ctx.sessions`.
- Panel callback props carrying session/screen context, with render/focus/close reading the current session getter.
- `Layout.open(..., { tab: "select" })`, preserving file preview tabs.
- The relocated `runtime/extension/attachment` hook.
- JSX icon elements in the two custom `IconButton` mounts; upstream now accepts rendered content rather than an icon name.

Existing browser plugin API v1 and `plugin-panel:` persisted keys are retained. Existing panel compatibility tests were updated for the new SDK contract. README, source provenance, redistributed notices and the inventory identify v2.0.24.

## Validation and limits

`bun run check` passes upstream-boundary auditing, application/plugin/tooling type checks, and **40 tests with 199 assertions**. `bun run build` passes and generates the production frontend and PWA service worker. Build warnings include large chunks, ineffective dynamic imports and unsupported CSS highlight pseudo-elements during CSS processing.

Before session edits, the production session-tab reducer benchmark was bundled and frozen. Seven samples of 20,000 preview/open/close cycles measured a baseline median of **13.490 ms** and a candidate median of **12.456 ms**, with checksum **720000** in every sample. This measures reducer work, not rendered UI, transcript performance or service latency; the timing difference is not a speed guarantee.

Headless Chromium verified the production connection screen, the rendered settings icon, plugin-manager opening and Example panel enable/disable in an isolated browser profile. At 390 × 844, the plugin dialog had no horizontal overflow (document client/scroll width both 390px). No page JavaScript errors were observed. Temporary screenshots are outside the repository.

No backend was started, stopped, upgraded or restarted. New provider/runtime behavior requires an appropriately updated external backend. Live session execution and Electron behavior require separate integration verification.
