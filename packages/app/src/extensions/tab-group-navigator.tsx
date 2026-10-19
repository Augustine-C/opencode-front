import { Popover } from "@kobalte/core/popover"
import { createMemo, createUniqueId, For, onCleanup, Show, type Accessor } from "solid-js"
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
  const [state, setState] = createStore({ open: false, query: "", active: "", composing: false })
  const setOpen = (open: boolean) => {
    if (!open) props.groups.cancelDrag()
    setState({ open, query: "", active: "", composing: false })
  }
  onCleanup(() => props.groups.cancelDrag())
  const listID = createUniqueId()
  let search: HTMLInputElement | undefined
  const query = createMemo(() => state.query.trim().toLowerCase())
  // Match the native command palette's case-insensitive substring rule, retaining saved group order.
  const index = createMemo(() =>
    props.tabs().map((tab) => ({
      tab,
      text: props.groups.project(tab)?.search ?? [],
    })),
  )
  const results = createMemo(() =>
    query()
      ? index()
          .filter((entry) => entry.text.some((text) => text.includes(query())))
          .map((entry) => entry.tab)
      : props.tabs(),
  )
  const activeIndex = createMemo(() =>
    Math.max(
      0,
      results().findIndex((tab) => tabKey(tab) === state.active),
    ),
  )
  const resultID = (tab: Tab) => `${listID}-${encodeURIComponent(tabKey(tab))}`
  const setQuery = (value: string) => {
    props.groups.cancelDrag()
    setState({ query: value, active: "" })
  }
  const choose = (tab: Tab | undefined) => {
    if (!tab) return
    props.onNavigate(tab)
    setOpen(false)
  }
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
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            trigger?.focus()
          }}
          onEscapeKeyDown={(event) => {
            if (state.composing || event.isComposing) return event.preventDefault()
            if (!state.query) return
            event.preventDefault()
            setQuery("")
            search?.focus()
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
            if (event.target === search || event.isComposing || state.composing) return
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
          <input
            ref={search}
            type="search"
            role={query() ? "combobox" : "searchbox"}
            aria-label={language.t("session.tab.group.filter")}
            placeholder={language.t("session.tab.group.filter")}
            aria-controls={query() ? listID : undefined}
            aria-expanded={query() ? true : undefined}
            aria-autocomplete={query() ? "list" : undefined}
            aria-activedescendant={query() && results()[activeIndex()] ? resultID(results()[activeIndex()]) : undefined}
            value={state.query}
            onCompositionStart={() => setState("composing", true)}
            onCompositionEnd={() => setState("composing", false)}
            onInput={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.isComposing || state.composing || event.keyCode === 229) return
              if (event.altKey || event.metaKey || event.ctrlKey) return
              if (!query()) {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  focusRow(
                    content?.querySelector<HTMLButtonElement>(
                      '[data-slot="tab-group-navigator-list"] button:not(:disabled)',
                    ) ?? undefined,
                  )
                }
                return
              }
              if (event.key === "Enter") {
                event.preventDefault()
                event.stopPropagation()
                choose(results()[activeIndex()])
                return
              }
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
              event.preventDefault()
              event.stopPropagation()
              const next = Math.max(
                0,
                Math.min(results().length - 1, activeIndex() + (event.key === "ArrowDown" ? 1 : -1)),
              )
              const tab = results()[next]
              if (!tab) return
              setState("active", tabKey(tab))
              document.getElementById(resultID(tab))?.scrollIntoView({ block: "nearest" })
            }}
          />
          <div
            id={listID}
            role={query() ? "listbox" : undefined}
            aria-label={query() ? language.t("session.tab.group.filter") : undefined}
            data-slot="tab-group-navigator-list"
            data-titlebar-tab-list
            data-grouped="true"
            data-orientation="vertical"
          >
            <Show when={results().length} fallback={<p role="status">{language.t("session.tab.group.noResults")}</p>}>
              <For each={results()}>
                {(tab) => (
                  <>
                    <Show when={!query()}>{props.groups.heading(tab, props.tabs, () => setOpen(false))}</Show>
                    <Show when={query() || !props.groups.collapsed(tab)}>
                      <button
                        id={resultID(tab)}
                        type="button"
                        role={query() ? "option" : undefined}
                        aria-selected={query() ? tabKey(results()[activeIndex()]) === tabKey(tab) : undefined}
                        data-slot="tab-group-conversation"
                        aria-current={props.current && tabKey(props.current) === tabKey(tab) ? "page" : undefined}
                        title={props.groups.tooltip(tab)}
                        onClick={() => choose(tab)}
                      >
                        <span>{props.groups.project(tab)?.conversation}</span>
                        <Show when={query()}>
                          <small>
                            {language.t("session.tab.group.context", {
                              instance: props.groups.instanceLabel(props.groups.instanceKey(tab)),
                              project: props.groups.project(tab)?.label ?? "",
                            })}
                          </small>
                        </Show>
                      </button>
                    </Show>
                  </>
                )}
              </For>
            </Show>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
