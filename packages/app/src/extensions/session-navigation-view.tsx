import { For, Show, createMemo, onCleanup } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { useLanguage } from "@/runtime/i18n/language"
import type { TimelineSearchController } from "@/session/timeline/search-controller"
import type { MessageNavigation } from "./session-navigation"
import "./session-navigation.css"

type History = {
  more: boolean
  loading: boolean
  error: boolean
  load: () => void
}

export function SessionNavigationToolbar(props: {
  search: TimelineSearchController
  navigation: MessageNavigation
  history: History
  setRef?: (element: HTMLDivElement | undefined) => void
}) {
  const language = useLanguage()
  const c = props.search
  onCleanup(() => props.setRef?.(undefined))
  return (
    <div data-component="session-navigation-toolbar" ref={props.setRef}>
      <Show
        when={c.visible()}
        fallback={
          <button type="button" class="session-navigation-search-trigger" onClick={c.query.open}>
            <Icon name="magnifying-glass" size="small" />
            {language.t("session.navigation.search")}
          </button>
        }
      >
        <div class="session-navigation-search">
          <Icon name="magnifying-glass" size="small" />
          <input
            ref={c.element.setInput}
            type="search"
            value={c.query.value()}
            placeholder={c.query.placeholder()}
            aria-label={language.t("session.navigation.search")}
            onInput={(event) => c.query.setValue(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.isComposing) return
              if (event.key === "Escape") {
                event.preventDefault()
                event.stopPropagation()
                c.query.close()
                return
              }
              if (event.altKey || event.metaKey || event.ctrlKey) return
              if (!["Enter", "ArrowUp", "ArrowDown"].includes(event.key)) return
              event.preventDefault()
              event.stopPropagation()
              c.result.move(event.key === "ArrowUp" || event.shiftKey ? -1 : 1)
            }}
          />
          <span class="session-navigation-count" role="status" aria-live="polite">
            <Show when={c.query.value().trim()}>
              <Show when={c.result.count()} fallback={c.query.noResults()}>
                {c.result.activeIndex() + 1}/{c.result.count()}
              </Show>
            </Show>
          </span>
          <IconButton
            type="button"
            variant="ghost-muted"
            icon={
              <span class="session-navigation-up">
                <Icon name="chevron-down" />
              </span>
            }
            disabled={!c.result.count()}
            aria-label={language.t("session.navigation.previousMatch")}
            title={language.t("session.navigation.previousMatch")}
            onClick={() => c.result.move(-1)}
          />
          <IconButton
            type="button"
            variant="ghost-muted"
            icon={<Icon name="chevron-down" />}
            disabled={!c.result.count()}
            aria-label={language.t("session.navigation.nextMatch")}
            title={language.t("session.navigation.nextMatch")}
            onClick={() => c.result.move(1)}
          />
          <IconButton
            type="button"
            variant="ghost-muted"
            icon={<Icon name="xmark-small" />}
            aria-label={language.t("common.close")}
            title={language.t("common.close")}
            onClick={c.query.close}
          />
        </div>
      </Show>
      <div class="session-navigation-tools">
        <Show when={props.history.more}>
          <button
            type="button"
            class="session-navigation-load"
            disabled={props.history.loading}
            onClick={props.history.load}
          >
            {language.t(props.history.loading ? "session.navigation.loading" : "session.navigation.loadOlder")}
          </button>
        </Show>
        <IconButton
          type="button"
          variant="ghost-muted"
          icon={<Icon name="bullet-list" />}
          aria-label={language.t("session.navigation.history")}
          title={language.t("session.navigation.history")}
          aria-pressed={props.navigation.state.visible}
          onClick={props.navigation.toggle}
        />
      </div>
      <Show when={(c.visible() && props.history.more) || props.history.error}>
        <div class="session-navigation-hint" role={props.history.error ? "alert" : undefined}>
          {language.t(props.history.error ? "session.navigation.loadFailed" : "session.navigation.loadedOnly")}
        </div>
      </Show>
    </div>
  )
}

export function SessionHistoryNavigation(props: {
  navigation: MessageNavigation
  messages: readonly { id: string; text: string }[]
  onLatest: () => void
}) {
  const language = useLanguage()
  const c = props.navigation
  // Keep the rail bounded even when thousands of prompts have been loaded.
  const markers = createMemo(() => Array.from({ length: Math.min(60, props.messages.length) }, (_, index) => index))
  const valueText = () =>
    language.t("session.navigation.position", {
      current: c.activeIndex() + 1,
      total: props.messages.length,
    })
  let pointerID: number | undefined
  const release = (element: HTMLElement) => {
    if (pointerID !== undefined && element.hasPointerCapture(pointerID)) element.releasePointerCapture(pointerID)
    pointerID = undefined
    c.finish()
  }
  return (
    <Show when={c.state.visible && props.messages.length > 1}>
      <div data-component="session-history-navigation">
        <Show when={c.preview()}>
          {(message) => (
            <div class="session-history-preview" role="status">
              <span>{language.t("session.navigation.preview")}</span>
              <p dir="auto">{message().text || language.t("session.navigation.attachment")}</p>
            </div>
          )}
        </Show>
        <div
          class="session-history-rail"
          role="slider"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={language.t("session.navigation.history")}
          aria-valuemin={1}
          aria-valuemax={props.messages.length}
          aria-valuenow={c.activeIndex() + 1}
          aria-valuetext={valueText()}
          title={language.t("session.navigation.dragHint")}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return
            event.preventDefault()
            event.currentTarget.focus()
            pointerID = event.pointerId
            event.currentTarget.setPointerCapture(pointerID)
            c.start()
            const bounds = event.currentTarget.getBoundingClientRect()
            c.point((event.clientY - bounds.top) / bounds.height, true)
          }}
          onPointerMove={(event) => {
            if (pointerID !== undefined && event.pointerId !== pointerID) return
            const bounds = event.currentTarget.getBoundingClientRect()
            c.point((event.clientY - bounds.top) / bounds.height, c.state.dragging)
          }}
          onPointerUp={(event) => {
            if (event.pointerId !== pointerID) return
            const bounds = event.currentTarget.getBoundingClientRect()
            c.point((event.clientY - bounds.top) / bounds.height, true)
            release(event.currentTarget)
          }}
          onPointerCancel={(event) => release(event.currentTarget)}
          onLostPointerCapture={() => {
            pointerID = undefined
            c.finish()
          }}
          onPointerLeave={c.leave}
          onBlur={c.leave}
          onKeyDown={(event) => {
            const index = c.activeIndex()
            const target = {
              ArrowUp: index - 1,
              ArrowDown: index + 1,
              Home: 0,
              End: props.messages.length - 1,
              PageUp: index - 10,
              PageDown: index + 10,
            }[event.key]
            if (target === undefined) return
            event.preventDefault()
            event.stopPropagation()
            c.select(target)
          }}
        >
          <For each={markers()}>
            {(index) => (
              <span
                class="session-history-marker"
                style={{ top: `${(index / Math.max(1, markers().length - 1)) * 100}%` }}
              />
            )}
          </For>
          <span
            class="session-history-thumb"
            style={{ top: `${(c.activeIndex() / Math.max(1, props.messages.length - 1)) * 100}%` }}
          />
        </div>
        <button
          type="button"
          class="session-history-latest"
          aria-label={language.t("session.messages.jumpToLatest")}
          title={language.t("session.messages.jumpToLatest")}
          onClick={props.onLatest}
        >
          <Icon name="chevron-down" />
        </button>
      </div>
    </Show>
  )
}
