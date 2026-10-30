import { defineConfig } from "vite"
import { gui } from "@opencode/plugin/gui/vite"
import { fileURLToPath } from "node:url"
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [gui({ entry: "plugin.tsx", outFile: "../../../../work/service-gui/gui-experimental.cjs" })],
})
