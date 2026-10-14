import { type JSX, Show } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { ProjectAvatar, type ProjectAvatarStyle } from "@opencode/ui/project-avatar"
import { useLanguage } from "@/runtime/i18n/language"

export function TabGroupHeading(props: {
  kind: "instance" | "project"
  groupKey: string
  label: string
  title: string
  src?: string
  variant?: ProjectAvatarStyle
  active: boolean
  collapsed: boolean
  ready: boolean
  dropTarget?: "before" | "after"
  toggle: () => void
  drag: {
    start: JSX.EventHandler<HTMLButtonElement, DragEvent>
    over: JSX.EventHandler<HTMLDivElement, DragEvent>
    leave: JSX.EventHandler<HTMLDivElement, DragEvent>
    drop: JSX.EventHandler<HTMLDivElement, DragEvent>
    end: () => void
  }
}) {
  const language = useLanguage()
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
        aria-label={props.title}
        title={`${props.title}\n${language.t(props.collapsed ? "session.tab.group.expand" : "session.tab.group.collapse")}`}
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
          <ProjectAvatar fallback={props.label} src={props.src} variant={props.variant} aria-hidden="true" />
        </Show>
        <span data-slot="tab-project-group-title">{props.label}</span>
        <span data-slot="tab-project-group-chevron" aria-hidden="true">
          <Icon name="chevron-down" size="small" />
        </span>
      </button>
    </div>
  )
}
