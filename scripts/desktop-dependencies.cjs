const fs = require("node:fs")
const path = require("node:path")
const { createRequire } = require("node:module")

// Keep resource-bearing Node packages intact (Lighthouse reads reports/assets by path).
// Resolve every edge from its installed parent, preserving nested dependency versions.
function stageDependencies(root, stage, names) {
  const copied = new Set()
  const hoisted = new Map()
  function locate(name, parent) {
    const require = createRequire(path.join(parent, "package.json"))
    try {
      return path.dirname(require.resolve(`${name}/package.json`))
    } catch {}
    let current = path.dirname(require.resolve(name))
    while (true) {
      const file = path.join(current, "package.json")
      if (fs.existsSync(file) && JSON.parse(fs.readFileSync(file)).name === name) return current
      const next = path.dirname(current)
      if (next === current) throw new Error(`Cannot locate desktop dependency ${name}`)
      current = next
    }
  }
  function copy(name, parent, target, ancestors) {
    const source = fs.realpathSync(locate(name, parent))
    if (ancestors.get(name) === source) return
    const rootSource = hoisted.get(name)
    if (rootSource === source) return
    if (!rootSource) hoisted.set(name, source)
    const destination = path.join(rootSource ? target : stage, "node_modules", name)
    if (copied.has(destination)) return
    copied.add(destination)
    fs.cpSync(source, destination, {
      recursive: true,
      dereference: true,
      filter: (file) => path.basename(file) !== "node_modules",
    })
    const pkg = JSON.parse(fs.readFileSync(path.join(source, "package.json")))
    const next = new Map(ancestors).set(name, source)
    for (const child of Object.keys(pkg.dependencies ?? {})) copy(child, source, destination, next)
    for (const child of Object.keys(pkg.optionalDependencies ?? {})) {
      try {
        locate(child, source)
      } catch {
        continue
      }
      copy(child, source, destination, next)
    }
  }
  for (const name of names) copy(name, root, stage, new Map())
}
module.exports = { stageDependencies }
