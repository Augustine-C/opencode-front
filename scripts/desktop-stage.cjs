const fs = require("node:fs")
const path = require("node:path")
const { stageDependencies } = require("./desktop-dependencies.cjs")

const root = path.resolve(__dirname, "..")
const releaseVersion = process.argv[2] || require("../package.json").version.replace("+", ".")
if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(releaseVersion)) throw new Error(`Invalid release version: ${releaseVersion}`)
// Electron requires SemVer; the fourth release component is the port's build revision.
const parts = releaseVersion.split(".")
const version = parts.slice(0, 3).join(".") + (parts.length === 4 ? `+${parts[3]}` : "")
const renderer = path.join(root, "packages/app/dist")
if (!fs.existsSync(path.join(renderer, "index.html"))) throw new Error("Run bun run build before staging the desktop")

const stage = path.join(root, "dist/desktop-app")
fs.rmSync(stage, { recursive: true, force: true })
fs.mkdirSync(path.join(stage, "scripts"), { recursive: true })
fs.cpSync(renderer, path.join(stage, "packages/app/dist"), { recursive: true })
for (const file of ["desktop-main.cjs", "desktop-preload.cjs", "desktop-window-state.cjs", "desktop-protocol.cjs"])
  fs.copyFileSync(path.join(root, "scripts", file), path.join(stage, "scripts", file))
fs.cpSync(path.join(root, "dist/native"), path.join(stage, "dist/native"), { recursive: true })
stageDependencies(root, stage, ["lighthouse"])
for (const file of ["LICENSE", "NOTICE"]) fs.copyFileSync(path.join(root, file), path.join(stage, file))
fs.writeFileSync(
  path.join(stage, "package.json"),
  JSON.stringify(
    {
      name: "opencode-front",
      productName: "OpenCode Front",
      version,
      releaseVersion,
      main: "scripts/desktop-main.cjs",
      dependencies: { lighthouse: require("../packages/desktop/package.json").dependencies.lighthouse },
      license: "MIT",
    },
    null,
    2,
  ) + "\n",
)
