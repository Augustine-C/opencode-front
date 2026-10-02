# Upstream import boundaries and extension adapters

The frontend is pinned by `docs/upstream.json`. The import policy is executable in `upstream/import-rules.json`; `upstream/inventory.json` records the source path, target path, Git blob identity, and source mode of each selected file. The inventory contains source identities, not hashes of locally adapted files. Changes to the policy and inventory require review alongside a port update.

## Import policy

The eight retained packages (`app`, `ui`, `session-ui`, `client`, `schema`, `protocol`, `util`, `gui-extensions`) use recursive imports with explicit exclusions for unit tests, component tests, E2E suites, stories, and test-browser fixtures. Runtime code and assets newly added within these roots are selected automatically. Playwright configuration files and icons remain included; exclusions match test files and directories rather than names that merely mention a test tool. The four existing client API/type fixture files are explicit exceptions to preserve the existing port’s import footprint.

`plugin-browser` imports only `package.json` and `src/rpc.ts`. Its implementation and the upstream backend/core/CLI/managed desktop shell are outside the import scope. `gui-extensions` supplies the native frontend features and SDK introduced in v2.0.22. Its main-process entries remain pristine imported sources, but this port loads only its renderer/SDK exports; the thin Electron shell does not activate those entries or manage services. Dependency patches use an explicit frontend-only list: review that list together with the root dependency catalog and lockfile whenever dependencies change. The upstream root license is included.

Each imported target falls into one of these categories:

| Category | Policy |
| --- | --- |
| Pristine upstream | Must match the recorded Git blob exactly. Accidental edits fail `upstream:check`. |
| Declared overlay | Listed individually under an overlay id with a reason and associated adapter files. Retain its small mount/configuration changes when reviewing upstream updates. |
| Port-owned file | Matches an explicit local namespace, such as the plugin SDK, plugin implementations, extension adapters, examples, tests, or project tooling. Never overwrite it with an upstream import. |

Imported files must exist. Unclassified local files, undeclared modifications, duplicate targets/overlays, missing adapters, and rule/inventory inconsistencies fail the audit. Materialized app icon assets are declared overlays: their upstream source objects are symlinks, while this port retains self-contained icon files. Other symlinks are hashed by their link text rather than by the linked file contents.

## Commands

```sh
# No upstream checkout, network, or backend is needed.
bun run upstream:check

# Read a candidate Git commit/tag from an existing checkout.
bun run upstream:plan --source /path/to/opencode --ref <commit-or-tag>
```

`upstream:check` is part of `bun run check`. It audits tracked and non-ignored untracked files, so new local files must belong to a declared namespace. It checks the pinned inventory without relying on the developer's upstream checkout.

`upstream:plan` reads Git objects at the supplied ref, ignoring the source checkout's uncommitted files. It reports selected additions, changes, removals, affected overlay ids, target collisions with local files, and missing import roots. Collisions or missing roots produce a failing exit code. It does not fetch, copy, merge, update dependencies, write provenance, or modify either checkout.

After reviewing and importing an update:

1. Update the import policy if package layouts, retained fixtures, dependency patches, or mount points changed.
2. Update the actual imported code, dependencies, adapted mount points, and compatibility tests together.
3. Update the source commit/version in `docs/upstream.json`, README, and NOTICE, preserving upstream license notices.
4. Record the new inventory, then run the full validation:

```sh
bun run upstream:record --source /path/to/opencode --ref <declared-commit>
bun run check
bun run build
```

`upstream:record` requires the exact commit already declared in `docs/upstream.json`. It verifies the candidate imports against the current working tree before replacing the inventory; it cannot bless an arbitrary changed pristine file by hashing the port. It only writes the inventory. The other source/provenance changes remain explicit review work. Test or infrastructure imports excluded by this policy need deliberate scope and dependency review before being restored.

## Thin extension layer

| Adapter | Owns | Native mount points |
| --- | --- | --- |
| `src/extensions/session-panel-state.ts` | Connects plugin state to session identities and active-tab accessors | Pane geometry and toolbar |
| `src/plugins/panel-model.ts` | Panel keys and state projection | Accessed through the session adapter |
| `src/extensions/plugin-panels.ts` | Native SDK panel/menu contributions, session lifetime, storage readiness, mobile selection | Upstream extension definition list |
| `src/extensions/plugin-panel-host.tsx` | Attaches the SDK bridge and scopes plugin rendering | Shell |
| `src/extensions/session-panels.tsx` | Selected plugin fullscreen toolbar | Native side region |
| `src/extensions/project-tabs.tsx` | Project group resolution, display ordering, group headings | Titlebar tab strip |
| `src/extensions/project-tab-model.ts` | Pure project matching and grouping | Group adapter and tests |
| `src/extensions/grouped-tab-status.tsx` | Grouped session progress/unread indicator | Session tab avatar fallback |
| `src/extensions/project-tabs.css` | Grouped vertical/horizontal styles | Imported by the group adapter; upstream tab CSS stays pristine |
| `src/extensions/project-inventory.ts` | Project discovery and persisted open/closed ordering | Server registry/runtime |

Rendering and data adapters are separate so session model/geometry code does not import the panel renderer. The existing plugin manager and named slot renderer stay in `src/plugins`; the standalone SDK stays in `packages/frontend-plugin`.

For future customization, put state projection, presentation, and feature-specific styles in these port-owned modules. Upstream components should pass accessors, invoke adapter operations, and mount small components. Keyboard navigation, drag sensors, file loading, transcript rendering, and review geometry remain with the upstream components that own them. Persisted settings and tab-state extensions still require explicit native integration; this extraction does not eliminate all merge conflicts or introduce an automatic three-way merge workflow.


## v2.0.22 panel migration

Review, Context, files, terminals, and related features moved from app session folders to `gui-extensions`. Follow the native `Panel`, `Menu`, `Layout`, and `Sessions` SDK contracts instead of restoring removed session helpers. Browser plugin API v1 and persisted `plugin-panel:` keys remain compatible through the port adapter. `Layout.open(..., { select: true })` appends/selects plugin tabs while preserving file previews; no plugin-specific session reducer is needed. Hold layout writes until storage and the session location are available. Sidebar slot boundaries now wrap the native side-pane sidebar rather than the removed session-summary implementation.
