import { Show } from "solid-js"
import type { SessionInfo } from "@opencode/client/promise"
import type { ServerConnection } from "@/runtime/server/registry"
import { useLanguage } from "@/runtime/i18n/language"
import { useSessionTabAvatarState } from "@/shell/layout/project-avatar-state"
import { SessionProgressIndicatorV2 } from "@opencode/session-ui/v2/session-progress-indicator-v2"

function GroupedSessionStatus(props: { session: SessionInfo; server: ServerConnection.Key }) {
  const language = useLanguage()
  const state = useSessionTabAvatarState(
    () => props.server,
    () => props.session.id,
    () => true,
  )
  return (
    <Show when={state.loading() || state.unread()}>
      <span
        data-slot="tab-session-status"
        class="flex size-4 shrink-0 items-center justify-center"
        role="img"
        aria-label={
          state.loading() ? language.t("session.timeline.working") : language.t("session.tab.unreadOrAttention")
        }
      >
        <Show when={state.loading()} fallback={<span data-slot="tab-session-unread" aria-hidden="true" />}>
          <SessionProgressIndicatorV2 />
        </Show>
      </span>
    </Show>
  )
}

export function GroupedTabIndicator(props: {
  session?: SessionInfo
  preparing: boolean
  server: ServerConnection.Key
}) {
  const language = useLanguage()
  return (
    <Show
      when={props.session}
      keyed
      fallback={
        <Show when={props.preparing}>
          <span
            data-slot="tab-session-status"
            class="flex size-4 shrink-0 items-center justify-center"
            role="img"
            aria-label={language.t("session.timeline.working")}
          >
            <SessionProgressIndicatorV2 />
          </span>
        </Show>
      }
    >
      {(session) => <GroupedSessionStatus session={session} server={props.server} />}
    </Show>
  )
}
