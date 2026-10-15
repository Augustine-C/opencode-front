import { For, Show, createEffect, createMemo, on, onCleanup } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { Button } from "@opencode/ui/button"
import { useLanguage } from "@/runtime/i18n/language"
import type { TimelineSearchController } from "@/session/timeline/search-controller"
import type { MessageNavigation } from "./session-navigation"
import "./session-navigation.css"

type History = {
  more: boolean
  loading: boolean
  error: boolean
  continuing: boolean
  load: () => unknown
  searchMore: (matches: () => number) => unknown
  cancel: () => void
}

export function SessionNavigationActions(props: { search: TimelineSearchController; navigation: MessageNavigation }) {
  const language = useLanguage()
  return (
    <div data-component="session-navigation-actions">
      <IconButton
        type="button"
        variant="ghost-muted"
        size="large"
        icon={<Icon name="magnifying-glass" />}
        aria-label={language.t("session.navigation.search")}
        title={language.t("session.navigation.search")}
        aria-expanded={props.search.visible()}
        onClick={() => (props.search.visible() ? props.search.query.close() : props.search.query.open())}
      />
      <IconButton
        type="button"
        variant="ghost-muted"
        size="large"
        icon={<Icon name="bullet-list" />}
        aria-label={language.t("session.navigation.history")}
        title={language.t("session.navigation.history")}
        aria-pressed={props.navigation.state.visible}
        onClick={props.navigation.toggle}
      />
    </div>
  )
}

export function SessionSearchPopover(props: { search: TimelineSearchController; history: History; mobile?: boolean }) {
  const language = useLanguage()
  const c = props.search
  createEffect(on(c.query.value, () => props.history.cancel()))
  onCleanup(() => props.history.cancel())
  let element: HTMLDivElement | undefined
  const run = async (action: () => unknown) => {
    await action()
    // The final page removes its load button; keep keyboard users inside the search.
    if (c.visible() && document.activeElement === document.body)
      element?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true })
  }
  const close = () => {
    const trigger = element
      ?.closest('[data-slot="session-chat-panel"]')
      ?.querySelector<HTMLButtonElement>('[data-component="session-navigation-actions"] button[aria-expanded]')
    c.query.close()
    trigger?.focus()
  }
  createEffect(() => {
    if (!c.visible()) return
    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return
      if (element?.contains(event.target) || event.target.closest('[data-component="session-navigation-actions"]'))
        return
      c.query.close()
    }
    document.addEventListener("pointerdown", dismiss)
    onCleanup(() => document.removeEventListener("pointerdown", dismiss))
  })
  return (
    <Show when={c.visible()}>
      <div
        ref={element}
        data-component="session-search-popover"
        data-mobile={props.mobile}
        role="search"
        onKeyDown={(event) => {
          if (event.key !== "Escape" || event.isComposing) return
          event.preventDefault()
          event.stopPropagation()
          close()
        }}
        aria-label={language.t("session.navigation.search")}
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
                close()
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
            onClick={close}
          />
        </div>
        <Show
          when={
            (c.visible() && (props.history.more || (c.query.value().trim() && !c.result.count()))) ||
            props.history.error
          }
        >
          <div class="session-navigation-hint" role={props.history.error ? "alert" : "status"}>
            {language.t(
              props.history.error
                ? "session.navigation.loadFailed"
                : c.query.value().trim() && !c.result.count()
                  ? props.history.more
                    ? "session.navigation.noLoadedResults"
                    : "session.navigation.noHistoryResults"
                  : "session.navigation.loadedOnly",
            )}
          </div>
        </Show>
        <div class="session-navigation-tools">
          <Show when={props.history.more}>
            <Button
              type="button"
              variant="ghost-faint"
              size="small"
              class="session-navigation-load"
              disabled={props.history.loading || props.history.continuing}
              onClick={() => void run(props.history.load)}
            >
              {language.t(props.history.loading ? "session.navigation.loading" : "session.navigation.loadOlder")}
            </Button>
          </Show>
          <Show when={props.history.more && c.query.value().trim()}>
            <Button
              type="button"
              variant="ghost-faint"
              size="small"
              disabled={props.history.loading && !props.history.continuing}
              onClick={() =>
                props.history.continuing
                  ? props.history.cancel()
                  : void run(() => props.history.searchMore(c.result.count))
              }
            >
              {language.t(
                props.history.continuing ? "session.navigation.stopSearching" : "session.navigation.searchMore",
              )}
            </Button>
          </Show>
        </div>
        <Show when={props.history.continuing}>
          <p class="session-navigation-hint" role="status">
            {language.t("session.navigation.searchLimit")}
          </p>
        </Show>
      </div>
    </Show>
  )
}

export function SessionHistoryNavigation(props: {
  navigation: MessageNavigation
  messages: readonly { id: string; text: string }[]
  response?: string
}) {
  const language = useLanguage()
  const c = props.navigation
  // Keep the rail bounded even when thousands of prompts have been loaded.
  const markers = createMemo(() => Array.from({ length: Math.min(24, props.messages.length) }, (_, index) => index))
  const progress = (index: number) => index / Math.max(1, props.messages.length - 1)
  const markerAt = (index: number) => Math.round(progress(index) * (markers().length - 1))
  const valueText = () =>
    language.t("session.navigation.position", {
      current: c.activeIndex() + 1,
      total: props.messages.length,
    })
  let pointerID: number | undefined
  let leaveTimer: ReturnType<typeof setTimeout> | undefined
  const keepPreview = () => clearTimeout(leaveTimer)
  const leavePreview = () => {
    keepPreview()
    leaveTimer = setTimeout(c.leave, 140)
  }
  onCleanup(keepPreview)
  const release = (element: HTMLElement) => {
    if (pointerID !== undefined && element.hasPointerCapture(pointerID)) element.releasePointerCapture(pointerID)
    pointerID = undefined
    c.finish()
  }
  return (
    <Show when={c.state.visible && props.messages.length > 1}>
      <div
        data-component="session-history-navigation"
        data-dragging={c.state.dragging}
        data-previewing={!!c.preview()}
        style={{ height: `min(${markers().length * 10 + 8}px, 55%)` }}
        onPointerEnter={keepPreview}
        onPointerLeave={leavePreview}
        onFocusOut={(event) => {
          if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
          c.leave()
        }}
      >
        <Show when={c.preview()}>
          {(message) => (
            <button
              type="button"
              class="session-history-preview"
              aria-label={language.t("session.navigation.jumpToMessage")}
              onClick={() => c.select(c.previewIndex() ?? c.activeIndex())}
              style={{
                top: `${progress(c.previewIndex() ?? 0) * 100}%`,
              }}
            >
              <div class="session-history-preview-heading">
                <span dir="auto">{message().text || language.t("session.navigation.attachment")}</span>
                <Icon name="arrow-up-right" size="small" />
              </div>
              <Show when={props.response}>
                <p dir="auto">{props.response}</p>
              </Show>
            </button>
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
          onFocus={() => c.point(progress(c.activeIndex()), false)}
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
                data-major={index % 4 === 0}
                data-preview={c.previewIndex() !== undefined && index === markerAt(c.previewIndex()!)}
                style={{ top: `${(index / Math.max(1, markers().length - 1)) * 100}%` }}
              />
            )}
          </For>
          <span class="session-history-thumb" style={{ top: `${progress(c.activeIndex()) * 100}%` }} />
        </div>
      </div>
    </Show>
  )
}
