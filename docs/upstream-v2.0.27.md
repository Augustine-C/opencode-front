# OpenCode v2.0.27 sync and OpenCode Front 2.0.27.0

OpenCode Front now follows upstream tag **v2.0.27**, commit [`1f4d07a`](https://github.com/anomalyco/opencode/tree/1f4d07a4a519185955ae8ab2ea3607805509e386), dated 2026-10-12 UTC. The previous imported baseline was v2.0.26, commit `9b4ec5714d481559990db0a816d5dec19541a814`. The project release tag is **`2.0.27.0`**: the first three components track upstream and the fourth is the OpenCode Front revision.

The upstream repository exposes v2.0.27 as a Git tag but has no GitHub Release entry for it. The change summary below is based on the tag's imported source tree and commit history.

## Frontend and shared-contract changes

- Refined the session column layout and text wrapping, polished the transition around a closed side region, and kept the browser panel visible until its content is ready.
- Improved command-palette selection so the first result stays selected until the user chooses another result. Kept the browser site button clickable after the page takes focus.
- Made timeline file-link detection and resolution deterministic, added a shared file-link resolver, preserved full expanded tool-error text, and reused complete patch diffs instead of computing them again.
- Preserved formatting inside Markdown link labels and made the third-party notices dialog scrollable.
- Updated the browser and file panel renderer, mobile presentation, and GUI extension host contracts. Refreshed generated client, protocol, and schema sources to match the upstream APIs.
- Updated the retained Effect packages from `4.0.0-rc.112` to `4.0.1`.

Upstream backend, CLI, TUI, and managed desktop changes are outside this frontend-only port. This release contains the compatible frontend client contracts and does not bundle or manage an OpenCode service.

## OpenCode Front features retained

Project-grouped session tabs, the frontend plugin SDK and manager, the native CodeArts Proxy extension, and the two separately distributed example plugin modules remain available. The examples are source-only and are not bundled in the desktop application.

## Sync details

The selected import inventory contains 3,255 files: 3,211 pristine upstream files and 44 declared adaptations. Relative to v2.0.26, 154 selected files changed and one file was added; none were removed. The project-tab settings and session-panel mount points were merged with upstream changes while preserving their local adapters. Existing-service connection behavior, Electron packaging, and the macOS ad hoc-signing fix remain in the port.

## Release version and downloads

- Git tag and GitHub Release: `2.0.27.0`.
- Root/Electron SemVer: `2.0.27+0`.
- Imported upstream packages: `2.0.27`.
- Windows file version: `2.0.27.0`; macOS bundle version: `2.0.27`.
- Desktop archives: macOS Apple Silicon (arm64) and Windows x64. No Intel macOS package is produced.
- The example plugin source module is a separate ZIP asset.

The macOS application is ad hoc signed and not notarized. After verifying the download and moving `OpenCode-Front.app` to Applications, clear its quarantine attribute before opening:

```sh
xattr -dr com.apple.quarantine "/Applications/OpenCode-Front.app"
```

The release workflow appends exact asset sizes and SHA-256 checksums below from the files it uploads.
