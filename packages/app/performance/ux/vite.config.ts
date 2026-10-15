import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"
import desktopPlugin from "../../vite.js"
const root = fileURLToPath(new URL(".", import.meta.url))
const source = fileURLToPath(new URL("../../src/", import.meta.url))
const overrides = [
  "runtime/server/runtime",
  "runtime/server/registry",
  "shell/tabs/tabs",
  "settings/model",
  "runtime/i18n/language",
  "shell/layout/project-avatar-state",
]
export default defineConfig({
  root,
  plugins: [
    {
      name: "fixture-context",
      enforce: "pre",
      resolveId(id) {
        if (overrides.some((entry) => id === `@/${entry}` || id === `${source}${entry}`)) return `${root}context.tsx`
      },
    },
    desktopPlugin,
  ],
  build: { outDir: "../../../../work/ux-fixture", emptyOutDir: true },
  preview: { host: "127.0.0.1", port: 4445, strictPort: true },
})
