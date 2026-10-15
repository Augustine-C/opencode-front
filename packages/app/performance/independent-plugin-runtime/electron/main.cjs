const { app, BrowserWindow, protocol, net } = require("electron")
const path = require("node:path")
const { createRendererHandler, registerRendererScheme } = require("../../../../../scripts/desktop-protocol.cjs")

registerRendererScheme(protocol)

const root = path.resolve(__dirname, "../dist")
app.whenReady().then(() => {
  protocol.handle("oc", createRendererHandler(root, net))
  const window = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  })
  void window.loadURL("oc://renderer/")
})
