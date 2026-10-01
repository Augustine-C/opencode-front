import { expect, test } from "bun:test"
import { parseSettingsView, settingsViewRedirect, settingsViewUrl } from "../src/settings/route"

test("frontend plugin settings restore as a client page for one or multiple servers", () => {
  const view = { type: "root", tab: "frontend-plugins" } as const
  const url = settingsViewUrl(view)
  expect(url).toBe("/settings?tab=frontend-plugins")
  for (const multipleServers of [false, true]) {
    expect(parseSettingsView(url.slice(url.indexOf("?")), multipleServers)).toMatchObject(view)
  }
  expect(settingsViewRedirect({ view, loaded: true, servers: [] })).toBeUndefined()
})

test("frontend plugin settings are never scoped to a backend server or project", () => {
  expect(parseSettingsView("?tab=frontend-plugins&server=remote", true)).toMatchObject({ type: "root", tab: "general" })
  expect(parseSettingsView("?tab=frontend-plugins&server=remote&project=%2Fcode", true)).toMatchObject({
    type: "root",
    tab: "general",
  })
})
