import selectorParser from "postcss-selector-parser"
import postcss from "postcss"
import valueParser from "postcss-value-parser"
import type { Context } from "@opencode/frontend-plugin"
import type { IndependentPluginManifest } from "@opencode/frontend-plugin/independent"
import type { StoredPluginModule } from "./repository"

const wrapperAtRules = new Set([
  "container",
  "layer",
  "media",
  "scope",
  "supports",
])
const mimeTypes: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  json: "application/json",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  otf: "font/otf",
  png: "image/png",
  svg: "image/svg+xml",
  ttf: "font/ttf",
  txt: "text/plain",
  webp: "image/webp",
  woff: "font/woff",
  woff2: "font/woff2",
}

function mimeType(path: string) {
  const extension = path.split(".").at(-1)?.toLowerCase() ?? ""
  return mimeTypes[extension] ?? "application/octet-stream"
}

function resolvePackageAsset(stylePath: string, reference: string) {
  const value = reference.trim()
  if (value.startsWith("data:") || value.startsWith("#")) return
  if (
    /^(?:https?:)?\/\//i.test(value) ||
    value.startsWith("/") ||
    value.includes("?")
  ) {
    throw new Error(
      `Plugin CSS can only reference local package assets: ${value}`,
    )
  }
  const hash = value.indexOf("#")
  const path = hash < 0 ? value : value.slice(0, hash)
  const suffix = hash < 0 ? "" : value.slice(hash)
  if (
    !path ||
    path.includes("\\") ||
    path.includes(":") ||
    path.includes("%")
  ) {
    throw new Error(`Invalid package asset reference in CSS: ${value}`)
  }
  const parts = stylePath.split("/").slice(0, -1)
  for (const part of path.split("/")) {
    if (!part || part === ".") continue
    if (part === "..") {
      if (!parts.length)
        throw new Error(`CSS asset escapes the plugin package: ${value}`)
      parts.pop()
    } else {
      parts.push(part)
    }
  }
  return { path: parts.join("/"), suffix }
}

function pluginScope(pluginID: string) {
  const attribute = selectorParser.attribute({
    attribute: "data-plugin-id",
    operator: "=",
    quoteMark: '"',
    value: pluginID,
    raws: {},
  })
  attribute.setValue(pluginID, { quoteMark: '"' })
  return attribute
}

export function scopePluginCss(
  source: string,
  pluginID: string,
  stylePath: string,
  resolveAsset: (path: string) => string,
) {
  const root = postcss.parse(source, { from: stylePath })
  root.walkAtRules((rule) => {
    const name = rule.name.toLowerCase()
    if (name === "import") throw new Error("Plugin styles cannot use @import")
    if (!wrapperAtRules.has(name))
      throw new Error(`Unsupported global CSS at-rule: @${name}`)
  })
  root.walkDecls((declaration) => {
    const parsed = valueParser(declaration.value)
    parsed.walk((node) => {
      if (node.type !== "function" || node.value.toLowerCase() !== "url") return
      const reference = valueParser
        .stringify(node.nodes)
        .trim()
        .replace(/^(["'])(.*)\1$/, "$2")
      const asset = resolvePackageAsset(stylePath, reference)
      if (!asset) return
      node.nodes = valueParser(
        `"${resolveAsset(asset.path)}${asset.suffix}"`,
      ).nodes
    })
    declaration.value = parsed.toString()
  })
  root.walkRules((rule) => {
    rule.selector = selectorParser((selectors) => {
      selectors.each((selector) => {
        const onlyRoot =
          selector.nodes.length === 1 &&
          selector.nodes[0].type === "pseudo" &&
          selector.nodes[0].value === ":root"
        if (onlyRoot) {
          selector.nodes[0].replaceWith(pluginScope(pluginID))
          return
        }
        selector.prepend(selectorParser.combinator({ value: " " }))
        selector.prepend(pluginScope(pluginID))
      })
    }).processSync(rule.selector)
  })
  return root.toString()
}

export function createPluginResources(module: StoredPluginModule) {
  const manifest = module.manifest as IndependentPluginManifest
  const files = new Map(module.files.map(({ path, bytes }) => [path, bytes]))
  const assetPaths = new Set(manifest.assets ?? [])
  const urls = new Map<string, string>()
  const links: HTMLLinkElement[] = []
  const styleAbort = new AbortController()
  let disposed = false
  const createURL = (bytes: Uint8Array, type: string) => {
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer
    return URL.createObjectURL(new Blob([buffer], { type }))
  }
  const assetURL = (path: string) => {
    if (disposed)
      throw new Error(`Plugin ${manifest.id} resources have been released`)
    if (!assetPaths.has(path))
      throw new Error(`Plugin ${manifest.id} did not declare asset ${path}`)
    const bytes = files.get(path)
    if (!bytes)
      throw new Error(`Plugin ${manifest.id} package is missing asset ${path}`)
    const key = `asset:${path}`
    const cached = urls.get(key)
    if (cached) return cached
    const created = createURL(bytes, mimeType(path))
    urls.set(key, created)
    return created
  }
  const assets: Context["assets"] = { url: assetURL }
  const dispose = () => {
    if (disposed) return
    disposed = true
    styleAbort.abort(
      new DOMException(
        `Plugin ${manifest.id} resources were released`,
        "AbortError",
      ),
    )
    for (const link of links) link.remove()
    for (const url of urls.values()) URL.revokeObjectURL(url)
    urls.clear()
  }

  return {
    assets,
    async attachStyles(signal?: AbortSignal) {
      if (disposed)
        throw new Error(`Plugin ${manifest.id} resources have been released`)
      if (signal?.aborted)
        throw new DOMException("Plugin activation was cancelled", "AbortError")
      const abort = () => styleAbort.abort(signal?.reason)
      signal?.addEventListener("abort", abort, { once: true })
      const pending = (manifest.styles ?? []).map(async (path) => {
        const bytes = files.get(path)
        if (!bytes)
          throw new Error(
            `Plugin ${manifest.id} package is missing stylesheet ${path}`,
          )
        let source: string
        try {
          source = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
        } catch {
          throw new Error(
            `Plugin ${manifest.id} stylesheet must be UTF-8: ${path}`,
          )
        }
        const css = scopePluginCss(source, manifest.id, path, assetURL)
        const href = createURL(new TextEncoder().encode(css), "text/css")
        urls.set(`style:${path}`, href)
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = href
        link.dataset.pluginId = manifest.id
        links.push(link)
        const loaded = new Promise<void>((resolve, reject) => {
          const removeListeners = () => {
            link.removeEventListener("load", onLoad)
            link.removeEventListener("error", onError)
            styleAbort.signal.removeEventListener("abort", onAbort)
          }
          const onLoad = () => {
            removeListeners()
            resolve()
          }
          const onError = () => {
            removeListeners()
            reject(new Error(`Plugin stylesheet failed to load: ${path}`))
          }
          const onAbort = () => {
            removeListeners()
            reject(
              styleAbort.signal.reason ??
                new DOMException(
                  "Plugin activation was cancelled",
                  "AbortError",
                ),
            )
          }
          link.addEventListener("load", onLoad, { once: true })
          link.addEventListener("error", onError, { once: true })
          styleAbort.signal.addEventListener("abort", onAbort, { once: true })
          if (styleAbort.signal.aborted) onAbort()
        })
        document.head.append(link)
        await loaded
      })
      try {
        await Promise.all(pending)
      } finally {
        signal?.removeEventListener("abort", abort)
      }
    },
    dispose,
  }
}
