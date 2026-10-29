import { build } from "esbuild"
await build({
  entryPoints: ["packages/desktop/src/front/main.ts"],
  outfile: "dist/native/desktop-plugins.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  conditions: ["node"],
  external: ["electron", "lightningcss", "@lydell/node-pty", "lighthouse", "electron-updater"],
  define: { "import.meta.env.OPENCODE_CHANNEL": '"local"', "import.meta.url": "__filename" },
})
