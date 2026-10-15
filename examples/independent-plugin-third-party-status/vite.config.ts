import * as solid from "solid-js";
import * as solidWeb from "solid-js/web";
import * as solidStore from "solid-js/store";
import { PLUGIN_RUNTIME_SYMBOL } from "./src/contract.ts";
import solidPlugin from "vite-plugin-solid";
import { defineConfig, type Plugin } from "vite";

const virtualModules = new Map([
  ["solid-js", { id: "\0plugin-runtime:solid", key: "solid", module: solid }],
  [
    "solid-js/web",
    { id: "\0plugin-runtime:web", key: "web", module: solidWeb },
  ],
  [
    "solid-js/store",
    { id: "\0plugin-runtime:store", key: "store", module: solidStore },
  ],
]);

function sharedRuntime(): Plugin {
  return {
    name: "opencode-front-shared-solid-runtime",
    enforce: "pre",
    resolveId(source) {
      return virtualModules.get(source)?.id;
    },
    load(id) {
      const entry = [...virtualModules.values()].find(
        (module) => module.id === id,
      );
      if (!entry) return;
      const names = Object.keys(entry.module).filter(
        (name) => name !== "default" && /^[A-Za-z_$][\w$]*$/.test(name),
      );
      return [
        `const runtime = globalThis[Symbol.for(${JSON.stringify(PLUGIN_RUNTIME_SYMBOL)})]?.${entry.key}`,
        `if (!runtime) throw new Error("OpenCode Front plugin runtime is unavailable")`,
        ...names.map(
          (name) => `export const ${name} = runtime[${JSON.stringify(name)}]`,
        ),
        "export default runtime",
      ].join(";\n");
    },
  };
}

export default defineConfig({
  plugins: [solidPlugin(), sharedRuntime()],
  publicDir: "public",
  build: {
    outDir: ".build",
    emptyOutDir: true,
    lib: {
      entry: "src/main.tsx",
      formats: ["es"],
      fileName: () => "main.js",
      cssFileName: "main",
    },
    assetsInlineLimit: 0,
  },
});
