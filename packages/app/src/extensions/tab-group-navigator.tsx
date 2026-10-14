import { Popover } from "@kobalte/core/popover"
import { createMemo, For, onCleanup, Show, type Accessor } from "solid-js"
import { createStore } from "solid-js/store"
import { Icon } from "@opencode/ui/icon"
import { ProjectAvatar } from "@opencode/ui/project-avatar"
import { useLanguage } from "@/runtime/i18n/language"
import { tabKey, type Tab } from "@/shell/tabs/tabs"
import type { useProjectTabGroups } from "./project-tabs"

export function TabGroupNavigator(props: {
  groups: ReturnType<typeof useProjectTabGroups>
  tabs: Accessor<readonly Tab[]>
  current: Tab | undefined
  onNavigate: (tab: Tab) => void
}) {
  const language = useLanguage()
  const [state, setState] = createStore({ open: false })
  const setOpen = (open: boolean) => {
    if (!open) props.groups.cancelDrag()
    setState("open", open)
  }
  onCleanup(() => props.groups.cancelDrag())
  const current = createMemo(() => props.current ?? props.tabs()[0])
  const project = createMemo(() => {
    const tab = current()
    return tab ? props.groups.project(tab) : undefined
  })
  const instance = () => {
    const tab = current()
    return tab ? props.groups.instanceLabel(props.groups.instanceKey(tab)) : ""
  }
  let trigger: HTMLButtonElement | undefined
  let content: HTMLDivElement | undefined
  const focusRow = (row: HTMLButtonElement | undefined) => {
    row?.focus({ preventScroll: true })
    row?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
  }
  return (
    <Popover open={state.open} onOpenChange={setOpen} placement="bottom-start" gutter={8}>
      <Popover.Trigger
        ref={trigger}
        data-slot="tab-group-navigator-trigger"
        class="[app-region:no-drag]"
        aria-label={language.t("session.tab.group.browse")}
        title={[instance(), project()?.label].filter(Boolean).join(" · ")}
      >
        <ProjectAvatar
          fallback={project()?.label ?? ""}
          src={project()?.src}
          variant={project()?.variant}
          aria-hidden="true"
        />
        <span data-slot="tab-group-navigator-context">
          <span data-slot="tab-group-navigator-instance">{instance()}</span>
          <span data-slot="tab-group-navigator-project">{project()?.label}</span>
        </span>
        <Icon name="chevron-down" size="small" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          data-slot="tab-group-navigator"
          aria-label={language.t("session.tab.group.browse")}
          ref={(element) => {
            content = element
            const theme = trigger?.closest("[data-theme]")?.getAttribute("data-theme")
            if (theme) element.setAttribute("data-theme", theme)
          }}
          onOpenAutoFocus={(event) => {
            const selected = content?.querySelector<HTMLButtonElement>('[aria-current="page"]')
            const tab = current()
            const headings = [...(content?.querySelectorAll<HTMLElement>("[data-tab-group-key]") ?? [])]
            const heading = tab
              ? (
                  headings.find((element) => element.dataset.tabGroupKey === props.groups.key(tab)) ??
                  headings.find((element) => element.dataset.tabGroupKey === props.groups.instanceKey(tab))
                )?.querySelector<HTMLButtonElement>("button")
              : undefined
            const target = selected ?? heading ?? content?.querySelector<HTMLButtonElement>("button:not(:disabled)")
            if (!target) return
            event.preventDefault()
            focusRow(target)
          }}
          onKeyDown={(event) => {
            if (
              !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) ||
              event.altKey ||
              event.metaKey ||
              event.ctrlKey
            )
              return
            const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")]
            const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : Math.min(buttons.length - 1, Math.max(0, at + (event.key === "ArrowUp" ? -1 : 1)))
            event.preventDefault()
            focusRow(buttons[next])
          }}
        >
          <Popover.Title class="sr-only">{language.t("session.tab.group.browse")}</Popover.Title>
          <div
            data-slot="tab-group-navigator-list"
            data-titlebar-tab-list
            data-grouped="true"
            data-orientation="vertical"
          >
            <For each={props.tabs()}>
              {(tab) => (
                <>
                  {props.groups.heading(tab, props.tabs)}
                  <Show when={!props.groups.collapsed(tab)}>
                    <button
                      type="button"
                      data-slot="tab-group-conversation"
                      aria-current={props.current && tabKey(props.current) === tabKey(tab) ? "page" : undefined}
                      title={props.groups.project(tab)?.conversation}
                      onClick={() => {
                        props.onNavigate(tab)
                        setOpen(false)
                      }}
                    >
                      {props.groups.project(tab)?.conversation}
                    </button>
                  </Show>
                </>
              )}
            </For>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
