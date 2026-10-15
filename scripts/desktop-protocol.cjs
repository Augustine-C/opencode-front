const fs = require("node:fs")
const path = require("node:path")
const { pathToFileURL } = require("node:url")

function registerRendererScheme(protocol) {
  protocol.registerSchemesAsPrivileged([
    { scheme: "oc", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  ])
}

function createRendererHandler(root, net) {
  const safeRoot = fs.realpathSync(root)
  const insideRoot = (file) => file === safeRoot || file.startsWith(safeRoot + path.sep)
  return (request) => {
    let url
    try {
      url = new URL(request.url)
    } catch {
      return new Response("Bad request", { status: 400 })
    }
    if (url.hostname !== "renderer") return new Response("Forbidden", { status: 403 })
    let requested
    try {
      requested = path.resolve(safeRoot, `.${decodeURIComponent(url.pathname)}`)
    } catch {
      return new Response("Bad request", { status: 400 })
    }
    if (!insideRoot(requested)) return new Response("Forbidden", { status: 403 })
    let target = path.join(safeRoot, "index.html")
    if (fs.existsSync(requested) && fs.statSync(requested).isFile()) target = requested
    try {
      target = fs.realpathSync(target)
    } catch {
      return new Response("Not found", { status: 404 })
    }
    if (!insideRoot(target)) return new Response("Forbidden", { status: 403 })
    return net.fetch(pathToFileURL(target).toString())
  }
}

module.exports = { createRendererHandler, registerRendererScheme }
