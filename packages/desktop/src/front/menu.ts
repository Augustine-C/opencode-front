import { nativeT } from "../main/native/translations"
import { Menu, MenuItem } from "electron"
let provider = () =>
  [] as readonly {
    menu: string
    id: string
    label: string
    after?: string
    enabled(): boolean
    run(): void
  }[]
export function setMenubarProvider(next: typeof provider) {
  provider = next
  refreshMenu()
}
export function refreshMenu() {
  const menu = Menu.buildFromTemplate([
    ...(process.platform === "darwin" ? [{ id: "app", role: "appMenu" as const }] : []),
    { id: "file", label: nativeT("desktop.menu.file"), role: "fileMenu" },
    { id: "edit", label: nativeT("desktop.menu.edit"), role: "editMenu" },
    { id: "view", label: nativeT("desktop.menu.view"), role: "viewMenu" },
    { id: "go", label: nativeT("desktop.menu.go"), submenu: [] },
    { id: "window", label: nativeT("desktop.menu.window"), role: "windowMenu" },
    { id: "help", label: nativeT("desktop.menu.help"), role: "help", submenu: [] },
  ])
  for (const entry of provider()) {
    const target = menu.items.find((item) => item.id === entry.menu)?.submenu
    if (!target) continue
    const item = new MenuItem({ id: entry.id, label: entry.label, enabled: entry.enabled(), click: entry.run })
    const after = target.items.findIndex((item) => item.id === entry.after)
    target.insert(after < 0 ? target.items.length : after + 1, item)
  }
  Menu.setApplicationMenu(menu)
}
