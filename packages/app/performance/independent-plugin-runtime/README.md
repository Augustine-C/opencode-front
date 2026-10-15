# Independent plugin runtime probe

This fixture checks that one self-contained ESM module loaded from a Blob URL can share Solid with its host, access host context, render/update DOM, load CSS and an image from owned Blob URLs, and clean them up under a CSP without unsafe-eval.

Build the web fixture, run a static preview, and check it in Chromium:

~~~sh
bun x vite build --config packages/app/performance/independent-plugin-runtime/vite.config.ts
bun x vite preview --config packages/app/performance/independent-plugin-runtime/vite.config.ts
~~~

In another terminal:

~~~sh
node packages/app/performance/independent-plugin-runtime/web-probe.mjs
DISPLAY=:99 node packages/app/performance/independent-plugin-runtime/electron/probe.mjs
~~~

The Electron probe uses the same oc scheme registration and file handler as scripts/desktop-main.cjs, a sandboxed renderer, context isolation, and the project's installed Electron version. On Linux, start a display server before running it; Xvfb or a dummy X server is suitable. Set ELECTRON_BIN and IP_ELECTRON_DEBUG_PORT to override the binary and DevTools port.

The probe is a focused compatibility fixture, not a complete production plugin package or security sandbox. It does not verify physical macOS/Windows Electron behavior.
