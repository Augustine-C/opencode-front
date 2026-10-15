import { createEffect, createMemo, For, on, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import { useGlobal } from "@/runtime/server/runtime"
import { ServerConnection, serverName } from "@/runtime/server/registry"
import { ExternalLink } from "@/runtime/platform/external-link"
import { useSettingsSurface } from "@/settings/surface"
import { frontBuild } from "./build-info"
import "./version-info.css"

const repository = "https://github.com/Augustine-C/opencode-front"

export function FrontVersionInfo() {
  const language = useLanguage()
  const global = useGlobal()
  const surface = useSettingsSurface()
  const source = () => {
    const route = surface.route()
    return route.type === "session" ? route.server : undefined
  }
  const [state, setState] = createStore<{ selected?: string }>({})
  createEffect(on(source, () => setState("selected", undefined)))
  const selected = () =>
    state.selected ??
    source() ??
    (global.servers.list().length === 1 ? ServerConnection.key(global.servers.list()[0]) : "")
  const connection = createMemo(() => global.servers.list().find((conn) => ServerConnection.key(conn) === selected()))
  const health = () => (connection() ? global.servers.health[ServerConnection.key(connection()!)] : undefined)
  const serviceVersion = () => (health()?.healthy ? health()?.version : undefined)
  const serviceTag = () => {
    const version = serviceVersion()?.replace(/^v/, "")
    return version && /^\d+\.\d+\.\d+(?:-[\da-z.-]+)?$/i.test(version) ? `v${version}` : undefined
  }
  const buildLabel = () =>
    frontBuild.release
      ? language.t("settings.about.front.released", { version: frontBuild.release })
      : language.t(frontBuild.dirty ? "settings.about.front.unreleasedDirty" : "settings.about.front.unreleased", {
          version: frontBuild.version,
          commit: frontBuild.commit.slice(0, 12),
        })
  return (
    <section data-component="front-version-info" aria-label={language.t("settings.about.front.title")}>
      <dl>
        <dt>{language.t("settings.about.front.build")}</dt>
        <dd>{buildLabel()}</dd>
        <dt>{language.t("settings.about.front.gui")}</dt>
        <dd>
          {language.t("settings.about.front.guiVersion", {
            version: frontBuild.upstreamVersion,
            commit: frontBuild.upstreamCommit.slice(0, 12),
          })}
        </dd>
        <dt>
          <label for="front-version-instance">{language.t("settings.about.front.instance")}</label>
        </dt>
        <dd>
          <select
            id="front-version-instance"
            value={selected()}
            onChange={(event) => setState("selected", event.currentTarget.value)}
          >
            <option value="">{language.t("settings.about.front.noInstance")}</option>
            <For each={global.servers.list()}>
              {(conn) => (
                <option value={ServerConnection.key(conn)} title={conn.http.url}>
                  {serverName(conn)}
                </option>
              )}
            </For>
          </select>
        </dd>
        <dt>{language.t("settings.about.front.service")}</dt>
        <dd>
          {serviceVersion() ??
            language.t(connection() ? "settings.about.front.serviceUnknown" : "settings.about.front.noInstance")}
        </dd>
      </dl>
      <div class="front-version-links">
        <ExternalLink
          href={
            frontBuild.release
              ? `${repository}/releases/tag/${encodeURIComponent(frontBuild.release)}`
              : `${repository}/commits/${frontBuild.commit === "unknown" ? "main" : frontBuild.commit}`
          }
        >
          {language.t(frontBuild.release ? "settings.about.front.releaseNotes" : "settings.about.front.buildChanges")}
        </ExternalLink>
        <ExternalLink
          href={`${repository}/blob/${frontBuild.commit === "unknown" ? "main" : frontBuild.commit}/docs/upstream-v${frontBuild.upstreamVersion}.md`}
        >
          {language.t("settings.about.front.guiNotes")}
        </ExternalLink>
        <Show when={serviceTag()}>
          {(tag) => (
            <ExternalLink href={`https://github.com/anomalyco/opencode/commits/${encodeURIComponent(tag())}`}>
              {language.t("settings.about.front.serviceHistory")}
            </ExternalLink>
          )}
        </Show>
      </div>
      <p>{language.t("settings.about.front.manualUpdates")}</p>
    </section>
  )
}
