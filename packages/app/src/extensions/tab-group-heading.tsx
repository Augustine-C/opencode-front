import { type JSX, Show } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { Menu } from "@opencode/ui/menu"
import { ProjectAvatar, type ProjectAvatarStyle } from "@opencode/ui/project-avatar"
import { useLanguage } from "@/runtime/i18n/language"

export function TabGroupHeading(props: {
  kind: "instance" | "project"
  groupKey: string
  label: string
  title: string
  count: number
  src?: string
  variant?: ProjectAvatarStyle
  active: boolean
  collapsed: boolean
  ready: boolean
  dropTarget: boolean
  announcement: string
  canMove: (offset: -1 | 1) => boolean
  move: (offset: -1 | 1, scope?: HTMLElement) => void
  focus: (scope?: HTMLElement) => void
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
  let heading: HTMLDivElement | undefined
  let reordered = false
  let focusScope: HTMLElement | undefined
  const scope = (element: HTMLElement) => element.closest<HTMLElement>("[data-titlebar-tab-list]") ?? undefined
  const move = (offset: -1 | 1) => {
    reordered = true
    focusScope = heading ? scope(heading) : undefined
    props.move(offset)
  }
  return (
    <div
      ref={heading}
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
        title={props.title}
        disabled={!props.ready}
        draggable={props.ready}
        onDragStart={props.drag.start}
        onDragEnd={props.drag.end}
        onClick={props.toggle}
        onKeyDown={(event) => {
          if (!event.altKey || event.ctrlKey || event.metaKey) return
          const offset = ["ArrowUp", "ArrowLeft"].includes(event.key)
            ? -1
            : ["ArrowDown", "ArrowRight"].includes(event.key)
              ? 1
              : undefined
          if (!offset) return
          event.preventDefault()
          event.stopPropagation()
          if (props.canMove(offset)) props.move(offset, scope(event.currentTarget))
        }}
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
        <span data-slot="tab-project-group-count" aria-hidden="true">
          {props.count}
        </span>
        <span data-slot="tab-project-group-chevron" aria-hidden="true">
          <Icon name="chevron-down" size="small" />
        </span>
      </button>
      <Menu
        onOpenChange={(open) => {
          if (open) reordered = false
        }}
      >
        <Menu.Trigger
          data-slot="tab-group-order-trigger"
          disabled={!props.ready}
          aria-label={language.t(
            props.kind === "instance" ? "session.tab.group.instanceOptions" : "session.tab.group.projectOptions",
            { name: props.label },
          )}
        >
          <Icon name="outline-dots" size="small" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            onCloseAutoFocus={(event) => {
              if (!reordered) return
              event.preventDefault()
              props.focus(focusScope)
            }}
          >
            <Menu.Item disabled={!props.canMove(-1)} onSelect={() => move(-1)}>
              {language.t("session.tab.group.moveEarlier")}
            </Menu.Item>
            <Menu.Item disabled={!props.canMove(1)} onSelect={() => move(1)}>
              {language.t("session.tab.group.moveLater")}
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu>
      <span class="sr-only" role="status" aria-live="polite">
        {props.announcement}
      </span>
    </div>
  )
}
