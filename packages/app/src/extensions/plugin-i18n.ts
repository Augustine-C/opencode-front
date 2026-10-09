import type en from "@/runtime/i18n/en"
import type { DesktopNativeLocale } from "@/runtime/i18n/desktop-native"

type Key = Extract<keyof typeof en, `plugins.${string}`>
type Translation = Pick<typeof en, Key>

export const pluginTranslations: Partial<Record<Exclude<DesktopNativeLocale, "en">, Translation>> = {
  zh: {
    "plugins.connectionStatus": "连接状态",
    "plugins.panel.maximize": "最大化面板",
    "plugins.panel.restore": "还原面板",
    "plugins.title": "前端插件",
    "plugins.installed": "已安装的插件",
    "plugins.configuration": "配置",
    "plugins.import.button": "导入配置",
    "plugins.description": "使用已安装的浏览器插件自定义此界面。",
    "plugins.import": "导入前端或 TUI 插件配置（JSON 或 JSONC）",
    "plugins.trust": "已安装的插件作为受信任的应用代码运行，并可访问已连接的服务。请仅导入你信任的适配器。",
    "plugins.unsupported": "以下插件未安装对应的浏览器适配器：",
    "plugins.connected": "已连接",
    "plugins.offline": "离线",
    "plugins.noServer": "未选择服务",
    "plugins.state.enabled": "已启用",
    "plugins.state.disabled": "已禁用",
    "plugins.state.loading": "正在加载",
    "plugins.state.error": "失败",
    "plugins.visibility": "已启用的插件会显示在其支持的页面中。",
  },
}
