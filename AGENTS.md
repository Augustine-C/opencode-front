# Repository Guidelines

## Project Structure & Module Organization

This Bun workspace ports the OpenCode frontend and connects to an existing service.

- `packages/app/src`: SolidJS application; `extensions/` contains port-owned adapters and `plugins/` hosts browser plugins.
- `packages/frontend-plugin/src`: plugin SDK, configuration, and lifecycle runtime.
- `packages/ui`, `session-ui`: shared components, rendering, and assets. `client`, `schema`, `protocol`, and `util` retain upstream contracts/utilities.
- Tests live in `packages/app/test`, `packages/frontend-plugin/test`, and `scripts/upstream/test`.
- `scripts/desktop*`: thin Electron shell. `upstream/` records import policy and inventory; `docs/` documents architecture and validation.

Read applicable package-level `AGENTS.md` files before editing.

## Build, Test, and Development Commands

Use Bun 1.3.14 or later, from the repository root:

- `bun install`: install workspace dependencies.
- `bun run dev -- --host 127.0.0.1 --port 4444`: serve the web frontend.
- `bun run check`: audit upstream boundaries, type-check, and run tests.
- `bun run test`: run focused Bun tests with browser conditions.
- `bun run build`: create production/PWA assets in `packages/app/dist`.
- `bun run desktop`: load the built frontend in Electron.
- `bun run upstream:plan --source /path/to/opencode --ref <tag>`: report candidate import changes without modifying either checkout.

## Coding Style & Naming Conventions

Use TypeScript/TSX, two-space indentation, double quotes, and no semicolons. Match Prettier formatting with `--no-semi --print-width 120`; no root formatter/linter script exists. Use kebab-case filenames, PascalCase components/types, and camelCase functions. Prefer Solid `createStore` for related state. Route visible UI text through i18n; add English keys only for feature work.

Keep custom logic/styles in extension modules and native mount points small. Declare upstream modifications in `upstream/import-rules.json`; avoid reformatting pristine files. See `docs/upstream-maintenance.md`.

## Testing Guidelines

Name Bun tests `*.test.ts` and assert behavior, especially plugin cleanup, session isolation, grouping, and import boundaries. No numeric coverage threshold is configured. For code changes, run `bun run check` and `bun run build`. Before session/timeline edits, record and compare a production benchmark. Report unverified browser interactions explicitly.

## Commit & Pull Request Guidelines

Use focused Conventional Commits, such as `feat(plugins): ...`, `fix(tabs): ...`, or `refactor: ...`. PRs should explain the problem, resulting behavior, validation, related issues when applicable, and screenshots for UI changes. Identify upstream-overlay changes and preserve MIT attribution.

## Configuration & Agent Boundaries

Connect to an already running backend; never start, stop, upgrade, or restart it. Do not restart a running app. Never commit credentials or `.env.local`; enter service credentials through the connection screen.
