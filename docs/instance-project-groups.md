# Instance and project tab groups

Grouping orders each OpenCode connection as one contiguous block, then groups its sessions and drafts by project. Matching project names and paths on different connections never merge. Worktree/directory resolution and native project-scoped session dragging remain unchanged.

## Quiet sidebar and horizontal navigation

Sidebar headings show an instance name or a project avatar/name. They omit counts, order menus, and permanently visible collapse arrows. Hover or keyboard focus reveals the arrow; the native hover title explains whether a click expands or collapses the group. Click, Enter or Space toggles it. Selecting a conversation reveals both owning groups, while users can still fold the active group themselves.

Group ordering is mouse-drag only: drag an instance heading over another instance, or a project heading over a sibling in the same instance. The upper/lower half of a heading selects insertion before/after it, with a matching insertion line. Cross-instance project drops are rejected. The previous Move earlier/later menu and Alt+arrow ordering were removed.

Horizontal layout reserves one compact 160px context entry for the current instance/project; it reduces to 112px or an icon-only 64px entry when the tab area is narrow. It opens a scrollable grouped conversation browser, where headings support the same collapse and drag behavior. Conversation buttons use cached native titles and select the original tab. Escape or outside click dismisses the browser; arrow keys and Home/End move focus within it. Opening the browser focuses and reveals the current conversation, or its enclosing heading if folded, without changing saved fold preferences. Scroll padding keeps focused rows below sticky headings. Empty tab lists have no context entry.

The horizontal row renders conversation tabs with small group spacing instead of wide instance/project headings. Sidebar fold preferences affect the browser tree, but do not hide horizontal conversation tabs. Browse, cycle and numbered-shortcut actions reveal the selected tab in the horizontal viewport, including tabs outside the initial visible area. Horizontal tab hover titles include project/instance context and the full conversation title. The context button opts out of Electron's titlebar drag region.

## Preferences and upgrade boundary

The existing `settings.v3` appearance store owns `tabInstanceOrder` and per-instance `tabProjectOrder`. Existing defaults and tolerant persistence codecs recover older settings. Keys use connection identity rather than editable display names. Instance keys serialize `[server]`; project keys retain `[server, canonicalRoot]`. Both reuse `collapsedTabGroups` with distinct keys, preserving the previous collapse and order preferences.

Ordering retains temporarily closed group keys. Saved order wins, followed by known connection/project order and newly discovered groups. Sorting affects display preferences, not a session's connection or project. Keyboard cycling and numbered shortcuts retain global grouped order.

Logic, headings, browser UI and styles remain port-owned extension modules. The declared native tab-strip overlay mounts the horizontal browser, supplies light group boundaries and resolves tab elements for navigation. The English dictionary is also a declared overlay; the settings model was unchanged by this design refinement. No new dependencies were introduced.

## Validation

- Import audit, all type checks and 49 project tests passed (244 assertions). Existing group-model cases protect instance containment, independent order preferences, and closed/stale/duplicate group keys.
- Production/PWA build passed with the inherited upstream CSS, Sentry import and chunk-size warnings.
- The Chromium fixture mounts the real native session tab strip, group adapters and SettingsProvider with mocked connection/project data and cached session titles. It passed hover-only arrows/hints, removal of count/order controls, mouse group dragging, cross-instance drop rejection, collapse and selection reveal, reload persistence, native project-scoped session dragging and keyboard cycling.
- Horizontal checks passed grouped conversation browsing/selection, popup focus and Escape dismissal, folded groups retaining their horizontal tabs, and automatic viewport reveal when choosing a distant tab. Fifty-five conversations across many projects still use one 160px context entry. Follow-up checks cover explicit before/after dragging, reopening onto the current conversation below sticky headings, context tooltips, and 112px/64px entries at narrow widths. Empty tab lists omit it. Light/dark presentation and 1280/800/390px layouts passed with no page errors or document overflow.
- The full production connection screen and frontend plugin manager passed separate Chromium smoke checks. No service credentials were entered. A connected full session, physical devices and Electron titlebar interaction were not tested locally.
- The production tab-reducer bundle remains byte-for-byte identical: seven samples of 20,000 operations measured medians of 15.48ms before and 14.08ms after, with checksum 720,000 throughout. These timings cover the unchanged tab reducers, not rendering or navigation-browser performance.
- `git diff --check` passed. No running application or backend was restarted or otherwise managed.
