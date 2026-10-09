const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const version = process.argv[2] || require("../package.json").version
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid release version: ${version}`)
const renderer = path.join(root, "packages/app/dist")
if (!fs.existsSync(path.join(renderer, "index.html"))) throw new Error("Run bun run build before staging the desktop")

const stage = path.join(root, "dist/desktop-app")
fs.rmSync(stage, { recursive: true, force: true })
fs.mkdirSync(path.join(stage, "scripts"), { recursive: true })
fs.cpSync(renderer, path.join(stage, "packages/app/dist"), { recursive: true })
fs.copyFileSync(path.join(root, "scripts/desktop-main.cjs"), path.join(stage, "scripts/desktop-main.cjs"))
for (const file of ["LICENSE", "NOTICE"]) fs.copyFileSync(path.join(root, file), path.join(stage, file))
fs.writeFileSync(
  path.join(stage, "package.json"),
  JSON.stringify({ name: "opencode-front", productName: "OpenCode Front", version, main: "scripts/desktop-main.cjs", license: "MIT" }, null, 2) + "\n",
)
