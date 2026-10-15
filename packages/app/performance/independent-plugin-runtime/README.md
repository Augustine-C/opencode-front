# Independent plugin runtime probe

This fixture checks a standalone plugin ZIP built after the production host. It previews the ZIP without executing it, installs it in IndexedDB, loads it through the shared Solid runtime, and restores it offline after reload. It verifies commands, panels, storage, CSS scoping, image resources, disable cleanup, and uninstall. A focused Blob ESM probe also checks the shared Solid context, store, DOM helper, and owned resources under CSP without `unsafe-eval`.

Build the host first, then build the independent package. The package template does not write to the host output; compare its file tree before and after the package build:

~~~sh
bun run build
find packages/app/dist -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum
bun run --cwd examples/independent-plugin-template typecheck
bun run --cwd examples/independent-plugin-template build
find packages/app/dist -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum
~~~

The reproducible Chromium pass runs that sequence, builds and serves the fixture, and checks the host digest automatically:

~~~sh
node packages/app/performance/independent-plugin-runtime/acceptance.mjs
~~~

Build the probe, then run its static preview in one terminal:

~~~sh
bun x vite build --config packages/app/performance/independent-plugin-runtime/vite.config.ts
bun x vite preview --config packages/app/performance/independent-plugin-runtime/vite.config.ts
~~~

In another terminal, run the Chromium acceptance and the Electron probe:

~~~sh
node packages/app/performance/independent-plugin-runtime/web-probe.mjs
node packages/app/performance/independent-plugin-runtime/e2e-probe.mjs examples/independent-plugin-template/dist/example.hello-1.0.0.zip
DISPLAY=:99 node packages/app/performance/independent-plugin-runtime/electron/probe.mjs examples/independent-plugin-template/dist/example.hello-1.0.0.zip
~~~

Set `CHROMIUM_PATH` to select a Chromium binary. The Electron probe uses the same `oc` scheme registration and file handler as `scripts/desktop-main.cjs`, a sandboxed renderer, context isolation, and the installed Electron version. On Linux, start a display server before running it; Xvfb or a dummy X server is suitable. Set `ELECTRON_BIN` or `IP_ELECTRON_DEBUG_PORT` to override the binary or DevTools port.

The fixture validates the real package parser, IndexedDB repository, shared runtime loader, and resource manager; it does not exercise the product settings UI. It is not a security sandbox. Automated Linux/browser results do not verify physical macOS/Windows Electron behavior, which still needs a packaged desktop acceptance pass.
