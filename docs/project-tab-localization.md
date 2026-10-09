# Project tab grouping localization

The port adds three strings that are absent from upstream locale dictionaries:

- `settings.appearance.row.tabGroups.title`
- `settings.appearance.row.tabGroups.description`
- `session.tab.group.unassigned`

English remains the unchanged semantic source in `runtime/i18n/en.ts`. The 62 non-English locales are covered by the typed `extensions/project-tab-i18n.ts` dictionary. `runtime/i18n/language.tsx` merges these translations after loading upstream app and UI dictionaries, before caching them. Initial language selection, later language changes, settings search, the switch's accessible label, and group headings therefore use the same existing translation API. Upstream locale files remain pristine; the language integration is a declared overlay.

## Terminology review

The existing OpenCode dictionaries provide the project, session, tab, layout, grouping, and unassigned terminology. Translations retain each locale's existing project/session vocabulary; the descriptions refer to both supported tab layouts rather than only the current orientation.

External terminology was cross-checked against maintained UI corpora:

- [Firefox localization](https://github.com/mozilla-l10n/firefox-l10n): `browser/browser/tabbrowser.ftl`, including new-tab labels and tab-group actions. Files were inspected for 57 matching locales, with `zh-CN`, `zh-TW`, `pt-BR`, `nb-NO`, `es-ES`, `hi-IN`, `ne-NP`, `hy-AM`, and `sv-SE` mapped to the port's locale identifiers.
- [VS Code localization](https://github.com/microsoft/vscode-loc): `translations/main.i18n.json` for Simplified/Traditional Chinese, German, Spanish, French, Japanese, Korean, Italian, Russian, Turkish, Polish, Brazilian Portuguese, and Czech. Editor-tab/group and session wording provides an independent developer-product reference where available.

Where the products differ, OpenCode's existing vocabulary takes precedence: for example, Simplified Chinese uses 标签页/项目/会话, Traditional Chinese uses 分頁/專案/工作階段, and Brazilian Portuguese uses guia rather than Firefox's aba. Punjabi follows the port's Shahmukhi script rather than Firefox's Gurmukhi locale.

This is a terminology cross-check, not a native-speaker sign-off. Amharic, Dhivehi, Dzongkha, Faroese, and Turkmen lacked matching files in the inspected Firefox corpus; their phrases follow the existing OpenCode dictionaries. Native review should focus on those locales, Shahmukhi Punjabi, and the descriptions' grammar.

## Frontend plugins

Per the requested scope, `extensions/plugin-i18n.ts` covers all 45 `plugins.*` strings in Simplified Chinese: management entry, names, configuration import, trust/compatibility notices, lifecycle/connection status, panel controls, and the example panel. JSON, JSONC, TUI, `label`, and `value` remain technical identifiers. Terminology follows the existing Chinese OpenCode dictionary, cross-checked against the Simplified Chinese VS Code and Firefox corpora above. Other locales retain the English fallback for plugin-specific copy.

Built-in plugin names now read the current language through getters. Commands and the example panel's menu registration refresh their translated labels within the existing setup owner; cleanup replaces previous registrations, and untracked host writes prevent registration state from becoming a translation-effect dependency. Language changes preserve plugin setup, enabled state, timers, and example-panel notes. User-provided panel titles retain their supplied text.

## Validation for 2.0.26.1

- `bun run check`: upstream boundaries, all type checks, 42 existing tests.
- `bun run build`: production/PWA assets; desktop staging uses `2.0.26+1` / release tag `2.0.26.1`.
- An isolated production browser fixture mounted the real `SettingsGeneral`, language provider, plugin manager, built-in plugins, and plugin host. Only unrelated native extension settings sections were omitted. All 63 languages passed title, description, accessible switch-label, and unassigned-group checks. Simplified Chinese plugin management, names, commands, menu labels, and example text passed; switching back to English preserved the example note and produced no page errors.
- The actual application production preview also passed the Simplified Chinese connection-screen plugin entry and plugin-manager checks, including built-in names, status text, import button, and accessible toggle labels, with no page errors.
- Live backend session rendering was not exercised; no backend or running app was restarted.
