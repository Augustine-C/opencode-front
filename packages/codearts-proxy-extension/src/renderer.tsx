import { lazy, onCleanup, Suspense } from "solid-js"
import {
  Command,
  createKeyed,
  MenuItem,
  onIdle,
  Panel,
  SettingsPage,
  Style,
  type PanelTab,
  type Setup,
} from "@opencode/gui-extensions/sdk"
import type definition from "./index"
import { createOverview } from "./model"
import css from "./style.css?inline"

const setup: Setup<typeof definition> = (ctx) => {
  const Page = lazy(() => import("./page"))
  const Settings = lazy(() => import("./settings"))
  onCleanup(
    onIdle(() => {
      void Page.preload()
      void Settings.preload()
    }),
  )
  ctx.add(Style, css)
  ctx.add(SettingsPage, {
    id: ctx.id,
    icon: "server",
    get title() {
      return ctx.t("settings.title")
    },
    get entries() {
      return [{ id: ctx.id, title: ctx.t("settings.title"), keywords: "codearts proxy gateway usage quota" }]
    },
    render: () => (
      <Suspense>
        <Settings />
      </Suspense>
    ),
  })
  ctx.add(Command, {
    id: "settings",
    get title() {
      return ctx.t("settings.open")
    },
    group: ctx.t("command.category.settings"),
    run: () => ctx.layout.settings(ctx.id),
  })
  // Enabling creates one owner for contributions and polling; disabling withdraws them together.
  createKeyed(
    () => ctx.stores.preferences.value.enabled,
    () => {
      const model = createOverview(ctx)
      const tab: PanelTab = {
        id: "overview",
        get title() {
          return ctx.t("name")
        },
      }
      const open = () => {
        const session = ctx.sessions.current()
        if (session) ctx.layout.open(`${ctx.id}:overview`, session, ctx.layout.narrow() ? undefined : { tab: "select" })
      }
      ctx.add(Panel, {
        id: "overview",
        region: "side",
        transient: true,
        legacy: { "plugin-panel:codearts-proxy/overview": "overview" },
        get mobile() {
          return { title: ctx.t("name"), order: 50, kind: "menu" as const }
        },
        list: () => [tab],
        render: () => (
          <Suspense>
            <Page model={model} />
          </Suspense>
        ),
      })
      ctx.add(MenuItem, {
        id: "overview",
        menu: "session.panel",
        icon: "server",
        order: 50,
        get title() {
          return ctx.t("name")
        },
        run: open,
      })
      ctx.add(Command, () => ({
        id: "open",
        title: ctx.t("open"),
        group: ctx.t("command.category.view"),
        enabled: !!ctx.sessions.current(),
        run: open,
      }))
      ctx.add(Command, {
        id: "refresh",
        get title() {
          return ctx.t("refresh")
        },
        run: model.refresh,
      })
      onCleanup(() => {
        for (const session of ctx.sessions.list()) ctx.layout.close(`${ctx.id}:overview`, session)
      })
    },
  )
}

export default setup
