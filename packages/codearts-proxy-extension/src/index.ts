import { Plugin } from "@opencode/plugin/gui"
import { BuiltinStore } from "@opencode/plugin/gui/builtin"
import { defaults, legacyPreferences, Preferences } from "./preferences"
import en from "./i18n/en"

export default Plugin.define({
  stores: {
    preferences: BuiltinStore.global(Preferences, defaults, {
      key: "opencode-front.plugins.v1",
      pick: legacyPreferences,
    }),
  },
  i18n: { en },
})
