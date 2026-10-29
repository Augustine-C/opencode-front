import type { PluginRpcs } from "../shared/ipc-rpc/plugins"
import type { DesktopEvent } from "../shared/ipc-rpc/events"
import type { RpcGroup } from "effect/rpc"
import type { Schema } from "effect"
import { invokeNative } from "./renderer-api"

type Rpcs = RpcGroup.Rpcs<typeof PluginRpcs>
type Request<Tag extends Rpcs["_tag"]> = Extract<Rpcs, { _tag: Tag }>
type Payload<Tag extends Rpcs["_tag"]> = Schema.Schema.Type<Request<Tag>["payloadSchema"]>
type Reply<Tag extends Rpcs["_tag"]> = Schema.Schema.Type<Request<Tag>["successSchema"]>

export function invoke<Tag extends Rpcs["_tag"]>(method: Tag, input?: Payload<Tag>): Promise<Reply<Tag>> {
  if (!window.electron) return Promise.reject(new Error("Desktop bridge unavailable"))
  return invokeNative(method, input) as Promise<Reply<Tag>>
}
export function send<Tag extends Rpcs["_tag"]>(method: Tag, input?: Payload<Tag>) {
  void invoke(method, input).catch((cause) => console.error("[plugin] desktop message failed", cause))
}
export function cancellable<Tag extends Rpcs["_tag"]>(
  method: Tag,
  input: Payload<Tag>,
  signal?: AbortSignal,
): Promise<Reply<Tag>> {
  const native = window.electron
  if (!native) return Promise.reject(new Error("Desktop bridge unavailable"))
  const request = crypto.randomUUID()
  const abort = () => native.cancel(request)
  if (signal?.aborted) return Promise.reject(signal.reason)
  signal?.addEventListener("abort", abort, { once: true })
  return (invokeNative(method, input, request) as Promise<Reply<Tag>>).finally(() =>
    signal?.removeEventListener("abort", abort),
  )
}
export function listen<Tag extends DesktopEvent["_tag"]>(
  tag: Tag,
  listener: (event: Extract<DesktopEvent, { _tag: Tag }>) => void,
) {
  return (
    window.electron?.on((event) => {
      if (event._tag === tag) listener(event as unknown as Extract<DesktopEvent, { _tag: Tag }>)
    }) ?? (() => {})
  )
}
