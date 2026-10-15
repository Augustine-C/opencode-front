import { expect, test } from "bun:test"
import { createPluginHost } from "@opencode/frontend-plugin/host"
import type { Context } from "@opencode/frontend-plugin"
import { PLUGIN_RUNTIME_SYMBOL } from "@opencode/frontend-plugin/independent"
import {
  createIndependentPluginDefinition,
  exposeSharedPluginRuntime,
} from "../src/plugins/independent/loader"
import type { StoredPluginModule } from "../src/plugins/independent/repository"

const context: Omit<
  Context,
  "ui" | "options" | "signal" | "storage" | "assets"
> = {
  app: { version: "test", platform: "web" },
  client: () => undefined,
  sessionID: () => undefined,
  connection: () => undefined,
  data: { listen: () => () => {} },
}

test("independent entry imports through the shared Solid runtime and releases contributions and assets", async () => {
  const source = `
    const runtime = globalThis[Symbol.for("${PLUGIN_RUNTIME_SYMBOL}")].solid;
    export function setup(context) {
      const [value, setValue] = runtime.createSignal(1);
      runtime.createEffect(() => { globalThis.__independentSolidValue = value(); });
      setValue(2);
      const remove = context.ui.command({ id: "hello", title: "Hello", run() {} });
      globalThis.__independentAssetURL = context.assets.url("assets/icon.svg");
      return () => { remove(); globalThis.__independentModuleCleaned = true; };
    }
  `
  const bytes = new TextEncoder().encode(source)
  const asset = new TextEncoder().encode("asset data")
  const module = {
    digest: "verified-fixture-digest",
    manifest: {
      formatVersion: 1,
      id: "example.loader",
      name: "Loader fixture",
      version: "1.0.0",
      apiVersion: 1,
      runtimeVersion: "solid-v1",
      entry: "main.js",
      assets: ["assets/icon.svg"],
      capabilities: ["commands.register", "assets.read"],
    },
    files: [
      { path: "main.js", bytes },
      { path: "assets/icon.svg", bytes: asset },
    ],
    compressedBytes: 0,
    uncompressedBytes: bytes.length + asset.length,
    installedAt: 0,
  } as StoredPluginModule
  exposeSharedPluginRuntime()
  const host = createPluginHost({ context })
  const definition = createIndependentPluginDefinition({
    repository: { module: async () => module },
    id: module.manifest.id,
    name: module.manifest.name,
    digest: module.digest,
  })
  const global = globalThis as Record<string, unknown>
  delete global.__independentSolidValue
  delete global.__independentModuleCleaned
  delete global.__independentAssetURL
  host.register(definition)
  try {
    await host.enable(definition.id)
    expect(
      host.state.statuses.find((status) => status.id === definition.id)?.state,
    ).toBe("enabled")
    expect(host.state.commands.map((command) => command.id)).toEqual([
      "example.loader:hello",
    ])
    expect(global.__independentSolidValue).toBe(2)
    const assetURL = global.__independentAssetURL as string
    expect(await (await fetch(assetURL)).text()).toBe("asset data")
    await host.disable(definition.id)
    expect(global.__independentModuleCleaned).toBe(true)
    expect(host.state.commands).toEqual([])
    await expect(fetch(assetURL)).rejects.toThrow()
  } finally {
    await host.dispose()
    delete global.__independentSolidValue
    delete global.__independentModuleCleaned
    delete global.__independentAssetURL
    Reflect.deleteProperty(globalThis, Symbol.for(PLUGIN_RUNTIME_SYMBOL))
  }
})
