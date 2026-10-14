# Instance and project tab groups

The grouping preference now lays out each OpenCode connection as one contiguous block, then groups its sessions and drafts by project. Matching project names and paths on different connections never merge. Worktree and directory resolution still uses the existing project model, and session order inside each project remains controlled by the native tab strip.

Instance and project headings each support collapse, drag ordering, a native order menu, and Alt+arrow ordering while their toggle is focused. Projects can move only inside their own instance. The menu provides the same operation on touch screens with 44px controls. Menu sorting restores focus after the menu's focus trap closes; keyboard sorting restores focus after the new layout renders. Selecting a session expands both owning groups without preventing the user from folding the active group themselves.

## Preferences and upgrade boundary

The existing `settings.v3` appearance store owns `tabInstanceOrder` (instance keys) and `tabProjectOrder` (project keys per instance). Defaults and tolerant persistence codecs recover settings written before these fields existed. Keys use the connection identity, not its editable display name. Instance keys serialize `[server]`; project keys keep their existing `[server, canonicalRoot]` format, preserving old project collapse preferences. Both levels reuse `collapsedTabGroups` with these distinct keys.

Ordering retains temporarily unavailable/closed group keys rather than discarding their preferences. Saved order wins, followed by known connection/project order and then newly discovered groups. Sorting changes display preferences without moving a session to another connection or project. Native project-scoped tab dragging, keyboard cycling, and numbered shortcuts use the resulting display order.

All group logic and presentation remain in port-owned extension modules. The only changed upstream overlays are the settings model and English dictionary; the native tab-strip mount is unchanged. The import policy declares the new shared heading adapter. The OpenCode v2.0.28 source sync was committed separately as `8de8ad2` before this work.

## Validation

- Import audit, type checks, and all 49 project tests passed (241 assertions). Three added model cases protect instance containment, independent preferences, and ordering with closed/stale/duplicate group keys.
- Production/PWA build passed with the existing upstream CSS, Sentry import and chunk-size warnings.
- Chromium fixture mounts the real native `TitlebarTabStrip`, group adapters and `SettingsProvider`, using the production stylesheet with mock connection/project data and draft tabs. It passed instance/project header dragging, rejection of cross-instance project drops, native project-scoped tab dragging, menu/keyboard ordering and focus, collapse/selection reveal, group enable/disable, keyboard cycling, reload persistence, and old settings without ordering fields. Desktop horizontal/vertical layouts and 390px mobile drawer controls passed with no page errors.
- The production connection screen and frontend plugin manager passed a separate Chromium smoke check. No service credentials were entered and no live backend was used.
- The unchanged production tab-reducer bundle was byte-for-byte identical to the baseline. Seven samples of 20,000 operations measured medians of 13.47ms before and 14.15ms after, with checksum 720,000 throughout. An earlier candidate sample overlapped browser work and was discarded. This benchmark covers tab reducers, not transcript rendering or group projection performance.
- `git diff --check` passed. No running application or backend was started, stopped, upgraded, or restarted.
