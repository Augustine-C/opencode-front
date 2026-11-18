# Immutable release recovery

The historical `2.2.6.0` tag triggered push workflows at eight distinct commits.
The automation's v2.2.6 preflight never imported sources or created a PR, while
external commits advanced main to v2.3.0. Rebuilding v2.2.6 would downgrade the
current source baseline. This forward recovery preserves the old incident and
publishes v2.3.0 as a new build revision through an owned, validated PR.

Source provenance stays at `a6b15d33daf6ab7d35569f6d711fdb630b9f04e7` (v2.3.0).
Package version `2.3.0+1` maps to fresh annotated tag `2.3.0.1`; Bun remains 1.4.4.
No imported production frontend, plugin host, authentication or backend code changes.

The release workflow verifies the remote annotated tag, its commit, package version
and paginated tag-push history before platform installs and publication. It rejects
reused or moved tags. Asset publication no longer uses `--clobber`: existing assets
must match local SHA-256 and byte size before any missing asset is uploaded, and
every uploaded asset is verified again. Plugin sources use a deterministic archive
of tracked files so publication retries produce identical source-archive bytes.

## Local validation on yifans-m4-mini

All project commands used the isolated cached official Bun 1.4.4, without replacing
a global runtime. Logs are retained under the worktree's ignored `work/recovery/`.

- Exact-commit `upstream:plan`: 3,880 selected files, no changes, collisions or missing roots.
- `bun run check`: import audit (3,799 pristine, 81 overlays), all type checks,
  80 tests / 307 assertions, and native main-host lifecycle/IPC/SQLite/cancellation/
  embed integration checks pass. Four release guard tests reject tag reuse,
  lightweight/moved/wrong-version tags and mismatched or incomplete existing assets.
- `bun run build`: production/PWA and native desktop bundles pass with existing
  CSS and bundle warnings. No session/timeline production edits or performance claim.
- Frozen hoisted reinstall succeeds without lockfile changes. Desktop staging
  confirms `version=2.3.0+1`, `releaseVersion=2.3.0.1`.
- Official CodeArts archive generation twice produces identical SHA-256:
  `b323e4f062a19e233f0987fb983084b537b7a1880de1b0d589e64236d782e9a2`.
- Production browser keepers pass for official GUI/main calls, plugin settings and
  storage isolation, connection validation/retry/timeout/late reply, pairing password
  correction, CodeArts preference migration/persistence, project groups and layered
  sidebar, layout settings, native-frame layout, history search, version information
  and About clipboard/tooltip. Each reports no page errors.

Three fixture maintenance changes were needed to run current baseline keepers:
use the configurable Chrome path on macOS, provide the registry HTTP accessor and
versioned health records, and follow the current upstream connection form and
750ms health cache. The connection keeper verifies timeout recovery and late reply
isolation in place of the older removed Cancel/Edit-credentials UI expectations.
Production behavior is unchanged.

Browser fixtures use disposable HTTP/SSE data and a native bridge double; they do
not establish real-provider sessions, native window compositing or live-service
performance. Actual macOS archive signature and renderer launch verification runs
in release CI. No user's backend or desktop application is started or restarted.

Completion requires exact-head PR CI, reviews, a guarded squash merge with matching
tree, a new annotated immutable tag, successful macOS arm64/Windows x64/publication,
and verification of the published stable release's three nonempty SHA-256 assets.
Only then may the prior blocked attempt be marked superseded in automation state.
