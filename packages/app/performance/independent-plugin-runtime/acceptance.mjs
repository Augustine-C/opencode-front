import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { readdir, readFile } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
import { setTimeout as delay } from "node:timers/promises"

const root = resolve(".")
const fixture = "packages/app/performance/independent-plugin-runtime"
const template = "examples/independent-plugin-template"
const archive = `${template}/dist/example.hello-1.0.0.zip`

async function files(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await files(path)))
    else if (entry.isFile()) result.push(path)
  }
  return result
}

async function treeDigest(directory) {
  const lines = []
  for (const file of (await files(directory)).sort()) {
    const hash = createHash("sha256").update(await readFile(file)).digest("hex")
    lines.push(`${hash}  ${relative(root, file).split("\\").join("/")}\n`)
  }
  return createHash("sha256").update(lines.join("")).digest("hex")
}

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" })
    child.once("error", reject)
    child.once("exit", (code, signal) => {
      if (code === 0) resolveRun()
      else reject(new Error(`${command} exited with ${code ?? signal}`))
    })
  })
}

async function startPreview() {
  const child = spawn(
    "bun",
    ["x", "vite", "preview", "--config", `${fixture}/vite.config.ts`],
    { cwd: root, stdio: "ignore" },
  )
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`Vite preview exited with ${child.exitCode}`)
    try {
      const response = await fetch("http://127.0.0.1:4451")
      if (response.ok) return child
    } catch {}
    await delay(100)
  }
  child.kill("SIGTERM")
  throw new Error("Vite preview did not become ready")
}

await run("bun", ["run", "build"])
const before = await treeDigest("packages/app/dist")
await run("bun", ["run", "--cwd", template, "typecheck"])
await run("bun", ["run", "--cwd", template, "build"])
const after = await treeDigest("packages/app/dist")
if (before !== after)
  throw new Error("Building the independent plugin changed the host output")
await run("bun", ["x", "vite", "build", "--config", `${fixture}/vite.config.ts`])

const preview = await startPreview()
try {
  await run("node", [`${fixture}/e2e-probe.mjs`, archive])
} finally {
  preview.kill("SIGTERM")
}
console.log(JSON.stringify({ hostTreeDigest: before, unchangedAfterPluginBuild: true }))
