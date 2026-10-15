# IP-00 runtime feasibility decision

## Result

The single-entry ESM + Blob URL approach is feasible on Chromium and Electron 44.4.5 in the current Linux environment. A production-built fixture loaded through a CSP allowing blob scripts/styles (without unsafe-eval) passed in Chromium and in a sandboxed Electron renderer at oc://renderer/.

The Electron probe uses the same custom-scheme registration and file handler as the desktop shell. Its renderer has nodeIntegration false, contextIsolation true, and sandbox true. The test verified dynamic Blob ESM import, shared Solid context/store/effects and web insertion, scoped CSS and SVG image Blob URLs, and cleanup of DOM, stylesheet, and object URLs. Both runs reported no page errors. The focused renderer-protocol tests also cover origin, path traversal, symlink escape and app-shell fallback.

Reproduce from the repository root with the commands in the probe README. The temporary binary download was verified against Electron's published package checksum; no binary is committed.

## Frozen v1 contract

- A plugin ZIP contains a strict manifest.json, one main.js ESM entry, optional CSS, and static assets. The host never unpacks files to the user filesystem.
- The entry exports a factory. The host imports the Blob module and calls the factory with an explicit solid-v1 runtime facade and asset resolver; the factory returns the existing plugin Definition. The packaged module has no external imports, remote dependencies, or JavaScript chunks.
- The facade exposes the host's exact solid-js, solid-js/web, and solid-js/store module namespaces. Plugin build tooling maps those imports to the facade. The host and plugins therefore use the same Solid owners, contexts, stores, JSX/web helpers and cleanup semantics.
- CSS and images are package-owned Blob URLs. CSS is parsed, root-scoped and rewritten to those URLs; links, object URLs, and plugin mount roots belong to the active instance and are revoked during cleanup.
- formatVersion, apiVersion, and runtimeVersion remain independent compatibility checks. solid-v1 records the verified host facade contract, not a promise for arbitrary SolidJS versions.
- Blob URL module loading requires the host origin's script policy to permit blob. The current web build has no CSP header; the probe verifies a strict test policy with explicit blob allowances. The desktop oc scheme is secure and standard and passed with Electron's current scheme handler.

The plugin trust boundary remains same-page trusted code. A facade, manifest, CSS root, error boundary, or capability declaration does not sandbox a module. Third-party code can still use browser DOM, storage and network capabilities available to the renderer.

## Limits and follow-up

Electron 44.4.5 was exercised on Linux with a dummy X display. Packaged macOS and Windows Electron behavior still requires platform CI/device validation; this fixture does not claim that coverage. The test uses a built compatibility host fixture with the exact installed Solid modules and desktop protocol handler rather than the full production UI. IP-05 will verify the actual installer/host flow and keep the host build hash unchanged.

IP-00 decision: proceed with this contract for IP-01. If platform testing later shows Blob modules are blocked by an existing host policy, stop and revisit the loading path before widening the feature.
