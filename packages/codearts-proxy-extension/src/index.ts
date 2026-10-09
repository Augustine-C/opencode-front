import { Extension, Store } from "@opencode/gui-extensions/sdk"
import { defaults, legacyPreferences, Preferences } from "./preferences"
import en from "./i18n/en"

export default Extension.define({
  id: "codearts-proxy",
  stores: {
    preferences: Store.global(Preferences, defaults, {
      key: "opencode-front.plugins.v1",
      pick: legacyPreferences,
    }),
  },
  i18n: { en },
  renderer: () => import("./renderer"),
})
