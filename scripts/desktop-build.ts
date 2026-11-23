import { build } from "esbuild"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

await build({
  entryPoints: ["packages/desktop/src/front/main.ts"],
  outfile: "dist/native/desktop-plugins.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  conditions: ["node"],
  external: ["electron", "lightningcss", "@lydell/node-pty", "lighthouse", "electron-updater", "ffi-rs"],
  define: { "import.meta.env.OPENCODE_CHANNEL": '"local"', "import.meta.url": "__filename" },
  plugins: [
    {
      name: "raw-gui-assets",
      setup(build) {
        build.onResolve({ filter: /^\..+\?raw$/ }, ({ path, resolveDir }) => ({
          path: resolve(resolveDir, path.slice(0, -"?raw".length)),
          namespace: "raw-gui-assets",
        }))
        build.onLoad({ filter: /.*/, namespace: "raw-gui-assets" }, async ({ path }) => ({
          contents: await readFile(path),
          loader: "text",
        }))
      },
    },
  ],
})
