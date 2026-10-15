import { expect, test } from "bun:test"
import {
  scopePluginCss,
  createPluginResources,
} from "../src/plugins/independent/resources"
import type { StoredPluginModule } from "../src/plugins/independent/repository"

test("independent plugin CSS is scoped and package asset URLs are rewritten", () => {
  const css = scopePluginCss(
    `:root { --accent: red } .card:hover { background: url("../assets/icon.svg#mark") } @media (min-width: 40rem) { button { color: var(--accent) } }`,
    "example.cards",
    "styles/main.css",
    (path) => `blob:asset/${path}`,
  )
  expect(css).toContain('[data-plugin-id="example.cards"] { --accent: red }')
  expect(css).toContain('[data-plugin-id="example.cards"] .card:hover')
  expect(css).toContain('url("blob:asset/assets/icon.svg#mark")')
  expect(css).toContain(
    '@media (min-width: 40rem) { [data-plugin-id="example.cards"] button',
  )
})

test("plugin CSS scopes numeric-leading IDs as quoted attribute values", () => {
  const css = scopePluginCss(
    ".card { color: red }",
    "123.example",
    "main.css",
    (path) => path,
  )
  expect(css).toContain('[data-plugin-id="123.example"] .card')
})

test("independent plugin CSS rejects imports, global at-rules, and remote asset URLs", () => {
  const compile = (css: string) =>
    scopePluginCss(css, "example.cards", "styles/main.css", (path) => path)
  expect(() => compile('@import "https://example.test/theme.css";')).toThrow(
    "cannot use @import",
  )
  expect(() =>
    compile("@keyframes spin { from { opacity: 0 } to { opacity: 1 } }"),
  ).toThrow("Unsupported global CSS at-rule")
  expect(() =>
    compile('.card { background: url("https://example.test/image.png") }'),
  ).toThrow("only reference local package assets")
  expect(() =>
    compile('.card { background: url("../../outside.png") }'),
  ).toThrow("escapes the plugin package")
})

test("plugin asset URLs are declared, reused, and revoked with their plugin owner", async () => {
  const bytes = new TextEncoder().encode("<svg>fixture</svg>")
  const module = {
    digest: "digest",
    manifest: {
      formatVersion: 1,
      id: "example.assets",
      name: "Assets",
      version: "1.0.0",
      apiVersion: 1,
      runtimeVersion: "solid-v1",
      entry: "main.js",
      assets: ["assets/icon.svg"],
      capabilities: ["assets.read"],
    },
    files: [{ path: "assets/icon.svg", bytes }],
    compressedBytes: 0,
    uncompressedBytes: bytes.length,
    installedAt: 0,
  } as StoredPluginModule
  const resources = createPluginResources(module)
  const url = resources.assets.url("assets/icon.svg")
  expect(resources.assets.url("assets/icon.svg")).toBe(url)
  expect(await (await fetch(url)).text()).toBe("<svg>fixture</svg>")
  expect(() => resources.assets.url("assets/undeclared.svg")).toThrow(
    "did not declare asset",
  )
  resources.dispose()
  expect(() => resources.assets.url("assets/icon.svg")).toThrow(
    "resources have been released",
  )
  await expect(fetch(url)).rejects.toThrow()
})
