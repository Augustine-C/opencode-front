const { app, BrowserWindow, protocol, net, shell } = require("electron")
const path = require("node:path")
const { pathToFileURL } = require("node:url")
const fs = require("node:fs")

protocol.registerSchemesAsPrivileged([
  {
    scheme: "oc",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])
const root = path.resolve(__dirname, "../packages/app/dist")
app.setName("OpenCode Front")
app.setPath("userData", path.join(app.getPath("appData"), "opencode-front"))
app.whenReady().then(() => {
  protocol.handle("oc", (request) => {
    const url = new URL(request.url)
    if (url.hostname !== "renderer") return new Response("Forbidden", { status: 403 })
    const file = path.resolve(root, `.${decodeURIComponent(url.pathname)}`)
    if (file !== root && !file.startsWith(root + path.sep)) return new Response("Forbidden", { status: 403 })
    const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(root, "index.html")
    return net.fetch(pathToFileURL(target).toString())
  })
  function open() {
    const window = new BrowserWindow({
      width: 1320,
      height: 900,
      minWidth: 640,
      minHeight: 480,
      title: "OpenCode Front",
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    })
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
