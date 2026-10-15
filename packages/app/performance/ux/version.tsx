import { For, onCleanup, onMount } from "solid-js"
import { Dynamic } from "solid-js/web"
import { FrontVersionInfo } from "../../src/extensions/version-info"
import { connectionStatus } from "../../src/plugins/builtin/connection-status"
import { createPluginHost } from "@opencode/frontend-plugin/host"
import { state, setState, useLanguage } from "./context"
export default function VersionFixture() {
  const host = createPluginHost({
    context: {
      app: { version: "fixture", platform: "web" },
      client: () => undefined,
      sessionID: () => undefined,
      connection: () => ({
        key: state.current.server,
        name: `Instance ${state.current.server.slice(-1)}`,
        url: "https://remote.example.test/a/long/reverse/proxy",
        healthy: !state.offline,
      }),
      data: { listen: () => () => {} },
    },
  })
  host.register(connectionStatus(useLanguage()))
  onMount(() => void host.enable("connection-status"))
  onCleanup(() => void host.dispose())
  return (
    <div style={{ "max-width": "560px", padding: "16px" }}>
      <FrontVersionInfo />
      <div id="version-footer">
        <For each={host.state.claims.filter((claim) => claim.placement.target === "home.footer.status")}>
          {(claim) => <Dynamic component={claim.render} />}
        </For>
      </div>
      <button id="version-offline" onClick={() => setState("offline", !state.offline)}>
        Toggle connection
      </button>
    </div>
  )
}
