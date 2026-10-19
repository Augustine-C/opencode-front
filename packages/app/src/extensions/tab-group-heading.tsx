import { type JSX, Show } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { ProjectAvatar, type ProjectAvatarStyle } from "@opencode/ui/project-avatar"
import type { TabGroupStatus } from "./project-tab-model"
import { SessionProgressIndicatorV2 } from "@opencode/session-ui/v2/session-progress-indicator-v2"
import { useLanguage } from "@/runtime/i18n/language"

export function TabGroupHeading(props: {
  kind: "instance" | "project"
  groupKey: string
  label: string
  title: string
  src?: string
  variant?: ProjectAvatarStyle
  status?: TabGroupStatus
  active: boolean
  collapsed: boolean
  ready: boolean
  dropTarget?: "before" | "after"
  toggle: () => void
  createSession?: () => void
  drag: {
    start: JSX.EventHandler<HTMLButtonElement, DragEvent>
    over: JSX.EventHandler<HTMLDivElement, DragEvent>
    leave: JSX.EventHandler<HTMLDivElement, DragEvent>
    drop: JSX.EventHandler<HTMLDivElement, DragEvent>
    end: () => void
  }
}) {
  const language = useLanguage()
  const statusLabel = () => (props.status ? language.t(`session.tab.group.status.${props.status}`) : "")
  const title = () =>
    props.status
      ? language.t("session.tab.group.statusLabel", { group: props.title, status: statusLabel() })
      : props.title
  return (
    <div
      data-slot={props.kind === "instance" ? "tab-instance-group" : "tab-project-group"}
      data-tab-group-key={props.groupKey}
      data-active={props.active}
      data-collapsed={props.collapsed}
      data-drop-target={props.dropTarget}
      role="heading"
      aria-level={props.kind === "instance" ? 2 : 3}
      onDragOver={props.drag.over}
      onDragLeave={props.drag.leave}
      onDrop={props.drag.drop}
    >
      <button
        type="button"
        data-slot={props.kind === "instance" ? "tab-instance-group-toggle" : "tab-project-group-toggle"}
        aria-expanded={!props.collapsed}
        aria-label={title()}
        title={`${title()}\n${language.t(props.collapsed ? "session.tab.group.expand" : "session.tab.group.collapse")}`}
        disabled={!props.ready}
        draggable={props.ready}
        onDragStart={props.drag.start}
        onDragEnd={props.drag.end}
        onClick={props.toggle}
      >
        <Show
          when={props.kind === "project"}
          fallback={
            <span data-slot="tab-instance-icon" aria-hidden="true">
              <Icon name="globe" size="small" />
            </span>
          }
        >
          <span data-slot="tab-project-group-icon" aria-hidden="true">
            <ProjectAvatar fallback={props.label} src={props.src} variant={props.variant} />
            <span data-slot="tab-project-group-chevron">
              <Icon name="chevron-down" size="small" />
            </span>
          </span>
        </Show>
        <span data-slot="tab-project-group-title">{props.label}</span>
        <Show when={props.status}>
          <span
            data-slot="tab-group-status"
            data-status={props.status}
            role="img"
            aria-label={statusLabel()}
            title={statusLabel()}
          >
            <Show
              when={props.status === "running"}
              fallback={
                <Icon
                  name={
                    props.status === "attention" || props.status === "offline" ? "circle-exclamation" : "bullet-list"
                  }
                  size="small"
                />
              }
            >
              <SessionProgressIndicatorV2 />
            </Show>
          </span>
        </Show>
        <Show when={props.kind === "instance"}>
          <span data-slot="tab-project-group-chevron" aria-hidden="true">
            <Icon name="chevron-down" size="small" />
          </span>
        </Show>
      </button>
      <Show when={props.kind === "project" && props.createSession}>
        <button
          type="button"
          data-slot="tab-project-group-create"
          class="[app-region:no-drag]"
          aria-label={language.t("session.tab.group.newSession", { project: props.label })}
          title={language.t("session.tab.group.newSession", { project: props.label })}
          disabled={!props.ready}
          onClick={() => props.createSession?.()}
        >
          <Icon name="plus" size="small" />
        </button>
      </Show>
    </div>
  )
}
