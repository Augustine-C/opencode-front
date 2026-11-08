# OpenCode v2.2.6 sync

Upstream v2.2.6 at `dc2ffcf8bf26f9e669b6aa22b95f50e12be15e06`; port `2.2.6+0`, release `2.2.6.0`. Bun remains 1.4.4 in local validation and release setup.

Imported the selected v2.2.6 frontend, client/protocol/schema, GUI plugin host and Electron native host sources. Retained existing-service connection, official GUI plugin integration, CodeArts Proxy extension, project tab grouping, session navigation, localization, and frontend version information. Imported the upstream MCP client patch update and synchronized the frontend dependency catalog. Added a compatibility overlay replacing optional wrappers on dynamic Record fields with `Schema.optionalKey(Schema.UndefinedOr(...))`. Effect 4.1 rejects the old form, which otherwise prevented the packaged renderer from starting.

## Scope and validation

Validation: `upstream:check` reports 3,757 pristine files, 78 adapted files and 209 local files with no errors; typecheck passes for app, CodeArts extension, upstream boundary tooling and desktop. `bun run test` passes 60 tests / 216 assertions outside the app and 15 app tests / 80 assertions. `test:desktop-plugins` passes, including the native host fixture. `bun run build` and `node scripts/desktop-stage.cjs` pass with staged version 2.2.6+0 / release version 2.2.6.0.

The timeline strobe benchmark could not run: this checkout has no `origin/dev` ref, and the v2.2.6 benchmark fixture imports `packages/app/e2e/utils/mock-server`, which is absent from the imported workspace. The benchmark command fails before recording measurements. Production build emits upstream CSS `::highlight` and chunk-size warnings; the build completes successfully.
