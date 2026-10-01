import { ErrorBoundary, For, onCleanup, Show, type ParentProps } from "solid-js"
import type { SlotMap, SlotPath } from "@opencode/frontend-plugin"
import { resolveSlots, emptySlotted, type Claim } from "@opencode/frontend-plugin/structure"
import type { Render } from "@opencode/frontend-plugin/host"
import { usePlugins } from "./context"

export function PluginSlot<P extends SlotPath>(props: ParentProps<{ path: P; input: SlotMap[P]; owner?: string }>) {
  const plugins = usePlugins()
  onCleanup(plugins.mount(props.path))
  const claims = () => {
    const resolution = props.owner
      ? resolveSlots({
          paths: new Set(plugins.state.paths),
          claims: plugins.host.state.claims.filter((claim) => claim.plugin === props.owner),
        })
      : plugins.resolution()
    return resolution.slotted.get(props.path) ?? emptySlotted<Render>()
  }
  const render = (claim: Claim<Render>) => (
    <ErrorBoundary
      fallback={(error) => {
        plugins.host.report(claim.plugin, error)
        return null
      }}
    >
      {claim.render(props.input as never)}
    </ErrorBoundary>
  )
  return (
    <>
      <For each={claims().before}>{render}</For>
      <Show
        keyed
        when={claims().replace}
        fallback={
          <>
            <For each={claims().prepend}>{render}</For>
            {props.children}
            <For each={claims().append}>{render}</For>
          </>
        }
      >
        {render}
      </Show>
      <For each={claims().after}>{render}</For>
    </>
  )
}
