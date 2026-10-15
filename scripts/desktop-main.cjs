const { app, BrowserWindow, protocol, net, shell, screen } = require("electron")
const { readWindowState, trackWindowState } = require("./desktop-window-state.cjs")
const { createRendererHandler, registerRendererScheme } = require("./desktop-protocol.cjs")
const path = require("node:path")

registerRendererScheme(protocol)
const root = path.resolve(__dirname, "../packages/app/dist")
app.setName("OpenCode Front")
app.setPath("userData", path.join(app.getPath("appData"), "opencode-front"))
app.whenReady().then(() => {
  protocol.handle("oc", createRendererHandler(root, net))
  function open() {
    const file = path.join(app.getPath("userData"), "window-state.json")
    const primary = screen.getPrimaryDisplay()
    const saved = readWindowState(
      file,
      [primary, ...screen.getAllDisplays().filter((display) => display.id !== primary.id)].map(
        (display) => display.workArea,
      ),
    )
    const window = new BrowserWindow({
      ...saved.bounds,
      minWidth: 640,
      minHeight: 480,
      title: "OpenCode Front",
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    })
    if (saved.maximized) window.maximize()
    trackWindowState(window, file)
    const dev = process.env.OPENCODE_FRONT_DEV_URL
    const start = dev || "oc://renderer/"
    if (dev && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(dev))
      throw new Error("Desktop development URL must be local")
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//.test(url)) void shell.openExternal(url)
      return { action: "deny" }
    })
    window.webContents.on("will-navigate", (event, url) => {
      if (
        new URL(url).origin === new URL(start).origin &&
        new URL(url).protocol === new URL(start).protocol &&
        new URL(url).hostname === new URL(start).hostname
      )
        return
      event.preventDefault()
      if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    })
    void window.loadURL(start)
  }
  open()
  app.on("activate", () => {
    if (!BrowserWindow.getAllWindows().length) open()
  })
})
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
