const { contextBridge, ipcRenderer } = require("electron")
const args = process.argv.find((value) => value.startsWith("--opencode-window="))
const windowID = args?.slice("--opencode-window=".length) ?? "main"
contextBridge.exposeInMainWorld("electron", {
  os: process.platform === "darwin" ? "macos" : process.platform === "win32" ? "windows" : "linux",
  windowID,
  packaged: process.argv.includes("--opencode-packaged"),
  invoke: (method, input, request) => ipcRenderer.invoke("opencode-front:plugin-request", { method, input, request }),
  cancel: (request) => ipcRenderer.send("opencode-front:plugin-cancel", request),
  on(listener) {
    const receive = (_event, value) => listener(value)
    ipcRenderer.on("opencode-front:plugin-event", receive)
    return () => ipcRenderer.removeListener("opencode-front:plugin-event", receive)
  },
})
