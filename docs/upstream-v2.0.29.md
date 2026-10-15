# OpenCode v2.0.29 sync

The frontend follows Git tag **v2.0.29**, commit `042d0832f5f3a73eaa039a58a7d565776f6d4290`, checked against upstream tags on 2026-10-15. The previous baseline was v2.0.28. This source sync was initially unreleased; it is included in OpenCode Front [2.0.29.0](releases/2.0.29.0.md).

The selected inventory has 3,260 files (3,215 pristine imports and 45 overlays), with no target collisions or missing roots. The update includes provider account management, pending steer visibility, question-composer refinements, session cost/token display, attachment placement, image zoom/pan, media caching, file restore feedback, unread tab markers, and side-panel focus handling. Shared protocol/schema/generated client contracts are copied from the same tag. Remote pairing renderer changes are retained; managed desktop/main entries remain dormant in this port.

Six changed overlays were reviewed: three package manifests, English source dictionary, side-region focus handling, and tab navigation. The app keeps its frontend-only scripts. The side region keeps plugin slot/toolbar mounts and the upstream focus fix. Ungrouped tabs use the upstream unread placement; grouped tabs retain the compact native-state indicator. Dependencies and frontend patch selection are unchanged. Workspace package versions and the lockfile follow the imported tag; the independent client release version remains unchanged.

Validation: `bun run check` passed (49 tests, 244 assertions), `bun run build` passed, and `git diff --check` passed. Production Chromium connection/plugin-manager smoke passed without page errors. Before the sync, a production adapter fixture recorded 10 repeated interactions at 20/100/500 sessions and a separate production reducer baseline. See the UX baseline report for data and limits.

No backend lifecycle operation or running-app restart was performed. Live service behavior and packaged macOS/Windows execution remain unverified. Existing CSS, dynamic import and chunk-size build warnings remain.
