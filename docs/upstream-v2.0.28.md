# OpenCode v2.0.28 sync

OpenCode Front follows upstream Git tag **v2.0.28**, commit [`026b106`](https://github.com/anomalyco/opencode/tree/026b106bc5d41b679ffc413264229c340871e4d3), dated 2026-10-13 UTC. The previous imported baseline was v2.0.27, commit `1f4d07a4a519185955ae8ab2ea3607805509e386`. The root package version is `2.0.28+0`; this source sync does not publish a desktop release.

The v2 version was checked against upstream Git tags. The GitHub Releases feed also contains the separate v1 release line, so it is not used to select this port's baseline.

## Frontend and shared-contract changes

- Added per-project permission auto-accept settings, overriding the client-wide default. Existing defaults and the port's project grouping preferences remain intact. The session command applies to its current project.
- Derive unread activity from server idle/viewed watermarks and migrate the previous client-local viewed state. Grouped session indicators continue to use the native avatar-state adapter.
- Show a submitted prompt in the frame where the composer clears, preserve prompt visibility across a staged revert, and place Working status above undelivered steers. Simplify model/agent details in mobile timelines.
- Ignore collapsed side-panel tabs for Close Tab, include subagent sessions in session cost, and load images and audio in Review previews.
- Expand video previews into an in-window theatre view while preserving playback. Restore dialog focus through the dialog stack, including the composer caret and replaced dialogs.
- Refresh provider/model compatibility schemas and generated client/protocol contracts. No native GUI extension SDK files changed in this update.

The frontend connects to an existing service. Server-side changes, AI transports, CLI/TUI updates, bundled Figma server plugins, and upstream managed desktop updates are outside this port's import scope. Server-backed unread state and newly available provider options depend on the connected service's support; no live service upgrade or connectivity test is performed by this sync.

## Port adaptations

Project grouping, collapsible headings, floating search, the Codex-style message-history rail and response previews, the browser plugin SDK/manager, and the native CodeArts Proxy extension are retained. Seven changed overlay files were merged against the previous upstream blobs without conflicts: the three adapted package manifests, English dictionary, general settings, settings model, and settings search catalog. The session screen and search-controller mount points were unchanged upstream.

The selected inventory contains **3,256 files**, comprising 3,211 pristine imports and 45 declared overlays. Relative to v2.0.27, 60 selected files changed and one schema file was added; none were removed. There were no target collisions or missing import roots. Frontend dependency versions and patches were unchanged; the unused `@openauthjs/openauth` catalog entry was removed to match upstream. Provenance, redistributed notices, and the dependency lockfile were refreshed.

## Validation

- `bun run check`: import audit, application/plugin/extension/example type checks, and all 46 port tests passed (231 assertions).
- `bun run build`: production/PWA build passed. Existing generated-CSS, mixed static/dynamic Sentry import, and chunk-size warnings remain.
- Ran the upstream v2.0.28 model-schema, timeline-projection, and app controller-projection suites against the imported port sources from an isolated scratch directory: 44 tests passed (117 assertions). No excluded upstream test files were added to the import footprint.
- Production Chromium smoke check passed for the connection screen and frontend plugin manager, with no page errors and no service credentials entered.
- The adapter browser fixture passed grouped-heading mouse/keyboard actions, floating search and history loading, prompt/response hover-to-click previews, mouse/touch dragging, navigation keys, session switching, and 1280/390/320px layouts. Header control rectangles remained identical when history toggled with the fixture side pane open or closed. This is an isolated fixture using the real adapters with mock session data, not a connected full-session test.
- The production session-tab reducer benchmark used seven samples of 20,000 operations: median 13.80ms before and 13.44ms after, with checksum 720,000 in every sample. Both production bundles have the same SHA-256 hash; the timing difference is measurement noise. This checks the unchanged tab reducers, not transcript rendering, search latency, or service performance.
- Desktop staging mapped `2.0.28.0` to SemVer `2.0.28+0` and preserved redistributed attribution. Unchanged upstream overlay mount points remained byte-for-byte identical to the previous port. `git diff --check` passed.

Live backend connectivity and macOS/Windows packaged application execution were not tested. No backend or running application was started, stopped, upgraded, or restarted.
