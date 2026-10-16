import { parseConfig } from "@opencode/frontend-plugin/config"
import { For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Dialog, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Button } from "@opencode/ui/button"
import { Switch } from "@opencode/ui/switch"
import { useLanguage } from "@/runtime/i18n/language"
import { SettingsList } from "@/settings/list"
import { SettingsRow } from "@/settings/row"
import type { IndependentPluginRepository } from "./independent/repository"
import { PluginConfigurationForm } from "./configuration-form"
import { pluginDiagnostic } from "./diagnostics"
import { usePlugins, type PluginsApi } from "./context"

type PackagePreview = Awaited<
  ReturnType<IndependentPluginRepository["preview"]>
>

function PluginSettingsBody(props: { plugins: PluginsApi }) {
  const plugins = props.plugins
  const language = useLanguage()
  const [state, setState] = createStore<{
    error: "" | "parse" | "configuration" | "apply" | "package"
    detail: string
    importing: boolean
    preview?: {
      value: unknown
      result: ReturnType<PluginsApi["previewConfig"]>
    }
    packagePreview?: { file: File; result: PackagePreview; enable: boolean }
    configuring?: string
    removing?: string
    developmentReloadID?: string
    removeData: boolean
  }>({ error: "", detail: "", importing: false, removeData: false })
  let importButton: HTMLButtonElement | undefined
  let packageButton: HTMLButtonElement | undefined
  let previewHeading: HTMLHeadingElement | undefined
  let packageHeading: HTMLHeadingElement | undefined
  let fileInput!: HTMLInputElement
  let packageInput!: HTMLInputElement
  let developmentInput!: HTMLInputElement
  const diagnostics = (error: unknown) =>
    pluginDiagnostic(error, [
      ...plugins.state.config,
      ...(state.preview?.result.plugins ?? []),
    ])
  const independentIDs = () =>
    new Set(plugins.independent.installations.map((entry) => entry.id))
  const configuredPlugins = () =>
    plugins.host
      .definitions()
      .filter((plugin) => !independentIDs().has(plugin.id))
  const configurationButtons = new Map<string, HTMLButtonElement>()
  const closeConfiguration = () => {
    const id = state.configuring
    setState("configuring", undefined)
    queueMicrotask(() => id && configurationButtons.get(id)?.focus())
  }
  const configuring = () =>
    plugins.host.definitions().find((entry) => entry.id === state.configuring && entry.configuration)
  const configureButton = (id: string) => (
    <Show when={plugins.host.definitions().find((entry) => entry.id === id)?.configuration?.fields.length}>
      <Button
        ref={(button: HTMLButtonElement) => configurationButtons.set(id, button)}
        size="small"
        variant="outline"
        disabled={state.importing || !!state.preview || !!state.packagePreview}
        onClick={() => setState("configuring", id)}
      >
        {language.t("plugins.options.configure")}
      </Button>
    </Show>
  )
  const fail = (error: unknown, type: typeof state.error = "apply") =>
    setState({ error: type, detail: String(error) })

  const applyConfig = async () => {
    const preview = state.preview
    if (!preview || state.importing) return
    setState({ importing: true, error: "", detail: "" })
    try {
      await plugins.importConfig(preview.value)
      const available = new Set(
        plugins.host.definitions().map((plugin) => plugin.id),
      )
      const failed = plugins.host.state.statuses.filter(
        (status) => available.has(status.id) && status.state === "error",
      )
      if (failed.length) {
        setState({
          error: "apply",
          detail: failed
            .map((status) => `${status.id}: ${status.error ?? ""}`)
            .join("\n"),
        })
        return
      }
      setState("preview", undefined)
      importButton?.focus()
    } catch (error) {
      fail(error)
    } finally {
      setState("importing", false)
    }
  }

  const inspectPackage = async (file: File) => {
    setState({
      importing: true,
      error: "",
      detail: "",
      packagePreview: undefined,
    })
    try {
      const repository = plugins.repository()
      if (!repository)
        throw new Error(
          plugins.independent.storageError || "Plugin storage is unavailable",
        )
      const result = await repository.preview(file)
      if (result.conflict) throw new Error(result.conflict)
      setState("packagePreview", {
        file,
        result,
        enable: result.action === "install",
      })
      requestAnimationFrame(() => packageHeading?.focus())
    } catch (error) {
      fail(error, "package")
    } finally {
      setState("importing", false)
    }
  }

  const installPackage = async () => {
    const preview = state.packagePreview
    if (!preview || state.importing || preview.result.action === "same") return
    setState({ importing: true, error: "", detail: "" })
    try {
      await plugins.installIndependent(preview.file)
      if (preview.result.action === "install" && preview.enable)
        await plugins.toggle(preview.result.manifest.id, true)
      setState("packagePreview", undefined)
      packageButton?.focus()
    } catch (error) {
      fail(error, "package")
    } finally {
      setState("importing", false)
    }
  }

  const switchVersion = async (
    id: string,
    direction: "candidate" | "previous",
  ) => {
    setState({ importing: true, error: "", detail: "" })
    try {
      if (direction === "candidate") await plugins.activateIndependent(id)
      else await plugins.restoreIndependent(id)
    } catch (error) {
      fail(error, "package")
    } finally {
      setState("importing", false)
    }
  }

  const discardUpdate = async (id: string) => {
    setState({ importing: true, error: "", detail: "" })
    try {
      await plugins.discardIndependentUpdate(id)
      await plugins.refreshIndependent()
    } catch (error) {
      fail(error, "package")
    } finally {
      setState("importing", false)
    }
  }

  const reloadDevelopmentPackage = async (id: string, file: File) => {
    if (state.importing) return
    setState({ importing: true, error: "", detail: "" })
    try {
      await plugins.reloadIndependentDevelopment(id, file)
    } catch (error) {
      fail(error, "package")
    } finally {
      setState({ importing: false, developmentReloadID: undefined })
    }
  }

  const removePlugin = async () => {
    const id = state.removing
    if (!id || state.importing) return
    setState({ importing: true, error: "", detail: "" })
    try {
      await plugins.removeIndependent(id, state.removeData)
      setState({ removing: undefined, removeData: false })
    } catch (error) {
      fail(error, "package")
    } finally {
      setState("importing", false)
    }
  }

  const Management = () => (
    <div
      class="settings-tab-body settings-tab-body--sectioned"
      data-component="plugin-manager"
    >
      <Show when={plugins.independent.skippedForRecovery}>
        <div role="alert" class="settings-section flex flex-col gap-3">
          <p>{language.t("plugins.recovery.skipped")}</p>
          <Button
            variant="outline"
            disabled={state.importing}
            onClick={() => void plugins.resumeIndependent()}
          >
            {language.t("plugins.recovery.resume")}
          </Button>
        </div>
      </Show>

      <div class="settings-section">
        <h3 class="settings-section-title">
          {language.t("plugins.installed")}
        </h3>
        <SettingsList>
          <For each={configuredPlugins()}>
            {(plugin) => {
              const status = () =>
                plugins.host.state.statuses.find(
                  (entry) => entry.id === plugin.id,
                )
              return (
                <SettingsRow
                  title={plugin.name}
                  description={
                    <div class="flex flex-col gap-1">
                      <span>
                        {language.t(
                          `plugins.state.${status()?.state ?? "disabled"}`,
                        )}
                        <span class="mx-1" aria-hidden="true">
                          ·
                        </span>
                        <code>{plugin.id}</code>
                      </span>
                      <Show when={status()?.state === "configuration-required"}>
                        <p role="alert">{language.t("plugins.options.needsConfiguration")}</p>
                      </Show>
                      <Show when={status()?.error}>
                        <div
                          class="text-v2-text-text-base break-words"
                          role="alert"
                        >
                          <p>{language.t("plugins.error.initialization")}</p>
                          <details>
                            <summary>
                              {language.t("plugins.error.details")}
                            </summary>
                            <pre class="whitespace-pre-wrap">
                              {diagnostics(status()?.error)}
                            </pre>
                          </details>
                        </div>
                      </Show>
                    </div>
                  }
                >
                  <div class="flex flex-wrap items-center justify-end gap-2">
                    {configureButton(plugin.id)}
                    <Switch
                      hideLabel
                      checked={
                        plugins.state.config.find(
                          (entry) => entry.id === plugin.id,
                        )?.enabled ?? false
                      }
                      disabled={
                        state.importing ||
                        !!state.preview ||
                        !!state.packagePreview
                      }
                      onChange={async (enabled) => {
                        setState("error", "")
                        try {
                          await plugins.toggle(plugin.id, enabled)
                        } catch (error) {
                          fail(error)
                        }
                      }}
                    >
                      {plugin.name}
                    </Switch>
                  </div>
                </SettingsRow>
              )
            }}
          </For>
          <For each={plugins.independent.installations}>
            {(installation) => {
              const status = () =>
                plugins.host.state.statuses.find(
                  (entry) => entry.id === installation.id,
                )
              return (
                <SettingsRow
                  title={installation.name ?? installation.id}
                  description={
                    <div class="flex flex-col gap-1">
                      <span>
                        <code>{installation.id}</code>
                      </span>
                      <Show when={installation.version}>
                        <span>
                          {language.t("plugins.package.version", {
                            version: installation.version ?? "",
                          })}
                        </span>
                      </Show>
                      <Show when={installation.candidateVersion}>
                        <span role="status">
                          {language.t("plugins.package.updateAvailable", {
                            version: installation.candidateVersion ?? "",
                          })}
                        </span>
                      </Show>
                      <Show when={installation.previousVersion}>
                        <span>
                          {language.t("plugins.package.previous", {
                            version: installation.previousVersion ?? "",
                          })}
                        </span>
                      </Show>
                      <Show
                        when={
                          installation.previousStorageVersion !== undefined &&
                          installation.storageVersion !==
                            installation.previousStorageVersion
                        }
                      >
                        <p role="note">
                          {language.t(
                            "plugins.package.storageMigrationWarning",
                            {
                              from: String(
                                installation.previousStorageVersion ?? "",
                              ),
                              to: String(installation.storageVersion ?? ""),
                            },
                          )}
                        </p>
                      </Show>
                      <Show when={installation.failedVersion}>
                        <div role="status" class="break-words">
                          <p>
                            {language.t("plugins.package.failedActivation", {
                              version: installation.failedVersion ?? "",
                            })}
                          </p>
                          <Show when={installation.lastFailure}>
                            <details>
                              <summary>
                                {language.t("plugins.package.failedDetails")}
                              </summary>
                              <pre class="whitespace-pre-wrap">
                                {diagnostics(installation.lastFailure)}
                              </pre>
                            </details>
                          </Show>
                        </div>
                      </Show>
                      <Show when={!installation.healthy}>
                        <div role="alert" class="break-words">
                          <p>{language.t("plugins.package.damaged")}</p>
                          <pre class="whitespace-pre-wrap">
                            {diagnostics(installation.problem)}
                          </pre>
                        </div>
                      </Show>
                      <Show when={status()?.state === "configuration-required"}>
                        <p role="alert">{language.t("plugins.options.needsConfiguration")}</p>
                      </Show>
                      <Show when={status()?.error}>
                        <div
                          class="text-v2-text-text-base break-words"
                          role="alert"
                        >
                          <p>{language.t("plugins.error.initialization")}</p>
                          <details>
                            <summary>
                              {language.t("plugins.error.details")}
                            </summary>
                            <pre class="whitespace-pre-wrap">
                              {diagnostics(status()?.error)}
                            </pre>
                          </details>
                        </div>
                      </Show>
                      <Show when={state.removing === installation.id}>
                        <div
                          class="flex flex-col gap-3 pt-2"
                          role="group"
                          aria-label={language.t(
                            "plugins.package.removeConfirm",
                            { name: installation.name ?? installation.id },
                          )}
                        >
                          <label class="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={state.removeData}
                              onChange={(event) =>
                                setState(
                                  "removeData",
                                  event.currentTarget.checked,
                                )
                              }
                            />
                            <span>
                              {language.t("plugins.package.removeData")}
                            </span>
                          </label>
                          <div class="flex gap-2">
                            <Button
                              variant="danger"
                              disabled={state.importing}
                              onClick={() => void removePlugin()}
                            >
                              {language.t(
                                "plugins.package.removeConfirmButton",
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              disabled={state.importing}
                              onClick={() =>
                                setState({
                                  removing: undefined,
                                  removeData: false,
                                })
                              }
                            >
                              {language.t("plugins.preview.back")}
                            </Button>
                          </div>
                        </div>
                      </Show>
                    </div>
                  }
                >
                  <div class="flex flex-wrap items-center justify-end gap-2">
                    {configureButton(installation.id)}
                    <Switch
                      hideLabel
                      checked={installation.enabled}
                      disabled={
                        !installation.healthy ||
                        state.importing ||
                        !!state.preview ||
                        !!state.packagePreview
                      }
                      onChange={async (enabled) => {
                        setState("error", "")
                        try {
                          await plugins.toggle(installation.id, enabled)
                        } catch (error) {
                          fail(error)
                        }
                      }}
                    >
                      {installation.name ?? installation.id}
                    </Switch>
                    <Show when={import.meta.env.DEV && installation.enabled}>
                      <Button
                        size="small"
                        variant="outline"
                        disabled={
                          state.importing || status()?.state === "loading"
                        }
                        onClick={() => {
                          setState("developmentReloadID", installation.id)
                          developmentInput.click()
                        }}
                      >
                        {language.t("plugins.package.developmentReload")}
                      </Button>
                    </Show>
                    <Show when={installation.candidateDigest}>
                      <Button
                        size="small"
                        variant="outline"
                        disabled={
                          state.importing ||
                          !installation.healthy ||
                          status()?.state === "loading"
                        }
                        onClick={() =>
                          void switchVersion(installation.id, "candidate")
                        }
                      >
                        {language.t("plugins.package.activateUpdate")}
                      </Button>
                      <Button
                        size="small"
                        variant="ghost-muted"
                        disabled={state.importing}
                        onClick={() => void discardUpdate(installation.id)}
                      >
                        {language.t("plugins.package.discardUpdate")}
                      </Button>
                    </Show>
                    <Show when={installation.previousDigest}>
                      <Button
                        size="small"
                        variant="outline"
                        disabled={
                          state.importing ||
                          !installation.healthy ||
                          status()?.state === "loading"
                        }
                        onClick={() =>
                          void switchVersion(installation.id, "previous")
                        }
                      >
                        {language.t("plugins.package.restore")}
                      </Button>
                    </Show>
                    <Button
                      size="small"
                      variant="ghost-muted"
                      disabled={state.importing}
                      onClick={() =>
                        setState({
                          removing: installation.id,
                          removeData: false,
                        })
                      }
                    >
                      {language.t("plugins.package.remove")}
                    </Button>
                  </div>
                </SettingsRow>
              )
            }}
          </For>
        </SettingsList>
        <Show when={import.meta.env.DEV}>
          <input
            ref={developmentInput}
            type="file"
            hidden
            accept=".zip,application/zip"
            aria-label={language.t("plugins.package.developmentReload")}
            disabled={state.importing}
            onChange={(event) => {
              const input = event.currentTarget
              const file = input.files?.[0]
              const id = state.developmentReloadID
              input.value = ""
              if (file && id) void reloadDevelopmentPackage(id, file)
              else setState("developmentReloadID", undefined)
            }}
          />
          <p class="text-12-regular text-v2-text-text-muted leading-5">
            {language.t("plugins.package.developmentReloadHint")}
          </p>
        </Show>
        <p class="text-12-regular text-v2-text-text-muted leading-5">
          {language.t("plugins.visibility")}
        </p>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">
          {language.t("plugins.configuration")}
        </h3>
        <SettingsList>
          <SettingsRow
            title={language.t("plugins.import.button")}
            description={language.t("plugins.import")}
          >
            <Button
              ref={importButton}
              variant="outline"
              size="normal"
              disabled={state.importing || !!state.packagePreview}
              onClick={() => fileInput.click()}
            >
              {language.t("plugins.import.button")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept=".json,.jsonc,application/json"
              aria-label={language.t("plugins.import")}
              disabled={state.importing}
              onChange={async (event) => {
                const input = event.currentTarget
                const file = input.files?.[0]
                if (!file) return
                setState({
                  importing: true,
                  error: "",
                  detail: "",
                  preview: undefined,
                })
                try {
                  let value: unknown
                  try {
                    value = parseConfig(await file.text())
                  } catch (error) {
                    fail(error, "parse")
                    return
                  }
                  const result = plugins.previewConfig(value)
                  setState("preview", { value, result })
                  requestAnimationFrame(() => previewHeading?.focus())
                } catch (error) {
                  fail(error, "configuration")
                } finally {
                  input.value = ""
                  setState("importing", false)
                }
              }}
            />
          </SettingsRow>
          <SettingsRow
            title={language.t("plugins.package.installButton")}
            description={language.t("plugins.package.installDescription")}
          >
            <Button
              ref={packageButton}
              variant="outline"
              size="normal"
              disabled={
                state.importing ||
                !!state.preview ||
                !!plugins.independent.storageError
              }
              onClick={() => packageInput.click()}
            >
              {language.t("plugins.package.installButton")}
            </Button>
            <input
              ref={packageInput}
              type="file"
              hidden
              accept=".zip,application/zip"
              aria-label={language.t("plugins.package.installButton")}
              disabled={state.importing}
              onChange={(event) => {
                const input = event.currentTarget
                const file = input.files?.[0]
                if (file) void inspectPackage(file)
                input.value = ""
              }}
            />
          </SettingsRow>
        </SettingsList>
        <p class="text-12-regular text-v2-text-text-muted leading-5">
          {language.t("plugins.trust")}
        </p>
        <Show when={plugins.independent.storageError}>
          <p
            role="alert"
            class="text-12-regular text-v2-text-text-base break-words"
          >
            {language.t("plugins.package.storageError", {
              detail: diagnostics(plugins.independent.storageError),
            })}
          </p>
        </Show>
        <Show when={state.preview}>
          {(preview) => (
            <section
              aria-label={language.t("plugins.preview.title")}
              class="flex flex-col gap-3"
            >
              <h3
                ref={previewHeading}
                tabIndex={-1}
                class="settings-section-title outline-none"
              >
                {language.t("plugins.preview.title")}
              </h3>
              <p>{language.t("plugins.preview.replacement")}</p>
              <p>{language.t("plugins.preview.code")}</p>
              <SettingsList>
                <For each={preview().result.changes}>
                  {(change) => (
                    <SettingsRow
                      title={change.name}
                      description={language.t(
                        `plugins.preview.${change.action}`,
                      )}
                      children={null}
                    />
                  )}
                </For>
              </SettingsList>
              <Show when={preview().result.unsupported.length}>
                <div role="status">
                  <p>{language.t("plugins.preview.ignored")}</p>
                  <For each={preview().result.unsupported}>
                    {(source) => (
                      <p>
                        <code>{diagnostics(source)}</code>
                      </p>
                    )}
                  </For>
                </div>
              </Show>
              <p>{language.t("plugins.preview.recovery")}</p>
              <div class="flex gap-2">
                <Button
                  variant="contrast"
                  disabled={state.importing}
                  onClick={() => void applyConfig()}
                >
                  {language.t("plugins.preview.apply")}
                </Button>
                <Button
                  variant="outline"
                  disabled={state.importing}
                  onClick={() => {
                    setState({ preview: undefined, error: "", detail: "" })
                    importButton?.focus()
                  }}
                >
                  {language.t("plugins.preview.back")}
                </Button>
              </div>
            </section>
          )}
        </Show>
        <Show when={state.packagePreview}>
          {(preview) => (
            <section
              aria-label={language.t("plugins.package.previewTitle")}
              class="flex flex-col gap-3"
            >
              <h3
                ref={packageHeading}
                tabIndex={-1}
                class="settings-section-title outline-none"
              >
                {language.t("plugins.package.previewTitle")}
              </h3>
              <p>{language.t("plugins.package.previewSafety")}</p>
              <SettingsList>
                <SettingsRow
                  title={language.t("plugins.package.name")}
                  description={preview().result.manifest.name}
                  children={null}
                />
                <Show when={preview().result.manifest.description}>
                  <SettingsRow
                    title={language.t("plugins.package.description")}
                    description={preview().result.manifest.description!}
                    children={null}
                  />
                </Show>
                <SettingsRow
                  title={language.t("plugins.package.id")}
                  description={<code>{preview().result.manifest.id}</code>}
                  children={null}
                />
                <SettingsRow
                  title={language.t("plugins.package.versionLabel")}
                  description={preview().result.manifest.version}
                  children={null}
                />
                <SettingsRow
                  title={language.t("plugins.package.api")}
                  description={String(preview().result.manifest.apiVersion)}
                  children={null}
                />
                <SettingsRow
                  title={language.t("plugins.package.compatibility")}
                  description={`${preview().result.manifest.runtimeVersion} · ${language.t("plugins.package.format", { version: preview().result.manifest.formatVersion })}`}
                  children={null}
                />
                <SettingsRow
                  title={language.t("plugins.package.capabilities")}
                  description={
                    preview().result.manifest.capabilities.join(", ") ||
                    language.t("plugins.package.none")
                  }
                  children={null}
                />
                <SettingsRow
                  title={language.t("plugins.package.size")}
                  description={`${preview().result.compressedBytes} / ${preview().result.uncompressedBytes} bytes`}
                  children={null}
                />
                <SettingsRow
                  title={language.t("plugins.package.source")}
                  description={
                    preview().result.manifest.homepage ??
                    language.t("plugins.package.localSource")
                  }
                  children={null}
                />
                <Show when={preview().result.manifest.author}>
                  <SettingsRow
                    title={language.t("plugins.package.author")}
                    description={preview().result.manifest.author!}
                    children={null}
                  />
                </Show>
                <Show when={preview().result.manifest.license}>
                  <SettingsRow
                    title={language.t("plugins.package.license")}
                    description={preview().result.manifest.license!}
                    children={null}
                  />
                </Show>
                <Show when={preview().result.currentVersion}>
                  <SettingsRow
                    title={language.t("plugins.package.currentVersion")}
                    description={preview().result.currentVersion!}
                    children={null}
                  />
                </Show>
              </SettingsList>
              <Show when={preview().result.action === "install"}>
                <label class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={preview().enable}
                    onChange={(event) =>
                      setState(
                        "packagePreview",
                        "enable",
                        event.currentTarget.checked,
                      )
                    }
                  />
                  <span>
                    {language.t("plugins.package.enableAfterInstall")}
                  </span>
                </label>
              </Show>
              <Show when={preview().result.action === "same"}>
                <p role="status">
                  {language.t("plugins.package.alreadyInstalled")}
                </p>
              </Show>
              <Show when={preview().result.action === "update"}>
                <p>{language.t("plugins.package.updateStaged")}</p>
              </Show>
              <div class="flex gap-2">
                <Button
                  variant="contrast"
                  disabled={
                    state.importing || preview().result.action === "same"
                  }
                  onClick={() => void installPackage()}
                >
                  {language.t(
                    preview().result.action === "update"
                      ? "plugins.package.stageUpdate"
                      : "plugins.package.confirmInstall",
                  )}
                </Button>
                <Button
                  variant="outline"
                  disabled={state.importing}
                  onClick={() => {
                    setState({
                      packagePreview: undefined,
                      error: "",
                      detail: "",
                    })
                    packageButton?.focus()
                  }}
                >
                  {language.t("plugins.preview.back")}
                </Button>
              </div>
            </section>
          )}
        </Show>
        <Show when={plugins.state.unsupported.length}>
          <div role="status" class="text-12-regular text-v2-text-text-muted">
            <p>{language.t("plugins.unsupported")}</p>
            <For each={plugins.state.unsupported}>
              {(source) => (
                <p class="break-words">
                  <code>{diagnostics(source)}</code>
                </p>
              )}
            </For>
          </div>
        </Show>
        <Show when={state.error}>
          <div
            role="alert"
            class="text-12-regular text-v2-text-text-base break-words"
          >
            <p>{language.t(`plugins.error.${state.error}`)}</p>
            <details>
              <summary>{language.t("plugins.error.details")}</summary>
              <pre class="whitespace-pre-wrap">{diagnostics(state.detail)}</pre>
            </details>
          </div>
        </Show>
      </div>

      <div class="settings-section flex flex-col gap-2">
        <p class="text-12-regular text-v2-text-text-muted">
          {language.t("plugins.recovery.description")}
        </p>
        <Button
          variant="ghost-muted"
          disabled={state.importing}
          onClick={() => plugins.skipIndependentOnce()}
        >
          {language.t("plugins.recovery.skipNextStart")}
        </Button>
      </div>
    </div>
  )
  return (
    <Show when={configuring()} keyed fallback={<Management />}>
      {(definition) => (
        <div class="settings-tab-body settings-tab-body--sectioned" data-component="plugin-manager">
          <PluginConfigurationForm definition={definition} plugins={plugins} onClose={closeConfiguration} />
        </div>
      )}
    </Show>
  )
}

export function PluginSettings() {
  const plugins = usePlugins()
  const language = useLanguage()
  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{language.t("plugins.title")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">
              {language.t("plugins.description")}
            </span>
          </div>
        </div>
      </div>
      <PluginSettingsBody plugins={plugins} />
    </>
  )
}

// Before connecting a service, the settings shell is unavailable.
export function PluginManager(props: { plugins: PluginsApi }) {
  const language = useLanguage()
  return (
    <Dialog size="large">
      <DialogHeader>
        <DialogTitle>{language.t("plugins.title")}</DialogTitle>
      </DialogHeader>
      <div class="px-5 pb-5">
        <p class="text-12-regular text-v2-text-text-muted mb-4">
          {language.t("plugins.description")}
        </p>
        <PluginSettingsBody plugins={props.plugins} />
      </div>
    </Dialog>
  )
}
