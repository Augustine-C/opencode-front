import { resolve, dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync, readlinkSync, lstatSync, existsSync, writeFileSync, renameSync } from "node:fs"
import {
  auditImports,
  gitBlob,
  planImports,
  selectImports,
  validateRules,
  type Rules,
  type Inventory,
  type SourceFile,
} from "./model"
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const rules: Rules = await Bun.file(resolve(root, "upstream/import-rules.json")).json()
const inventory: Inventory = await Bun.file(resolve(root, "upstream/inventory.json")).json()
const provenance = await Bun.file(resolve(root, "docs/upstream.json")).json()
validateRules(rules)
const git = (cwd: string, args: string[]) => {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  if (result.exitCode) throw new Error(result.stderr.toString())
  return result.stdout.toString()
}
function localFiles() {
  const paths = git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean)
  const files = new Map<string, string>()
  for (const path of new Set(paths)) {
    const absolute = resolve(root, path)
    if (relative(root, absolute).startsWith("..")) throw new Error(`Path escapes repository: ${path}`)
    try {
      files.set(
        path,
        gitBlob(
          lstatSync(absolute).isSymbolicLink()
            ? new TextEncoder().encode(readlinkSync(absolute))
            : readFileSync(absolute),
        ),
      )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  }
  return files
}
const args = process.argv.slice(2)
const mode = args.shift() ?? "check"
if (mode === "check") {
  const projected = selectImports(inventory.files, rules)
  if (
    projected.length !== inventory.files.length ||
    projected.some((file, index) => file.target !== inventory.files[index].target)
  ) {
    throw new Error("Inventory targets disagree with import rules; review and regenerate the inventory")
  }
  if (inventory.commit !== provenance.commit) throw new Error("Import inventory and provenance commit disagree")

  if (args.length) throw new Error("Usage: bun run upstream:check")
  const files = localFiles()
  const result = auditImports({ inventory, rules, files })
  console.log(JSON.stringify(result, null, 2))
  if (result.errors.length) process.exitCode = 1
} else if (mode === "plan" || mode === "record") {
  const sourceIndex = args.indexOf("--source"),
    refIndex = args.indexOf("--ref")
  if (sourceIndex < 0 || refIndex < 0 || args.length !== 4 || !args[sourceIndex + 1] || !args[refIndex + 1]) {
    throw new Error(`Usage: bun run upstream:${mode} --source /path/to/opencode --ref <commit-or-tag>`)
  }
  const source = resolve(args[sourceIndex + 1])
  const ref = args[refIndex + 1]
  const commit = git(source, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]).trim()
  const files: SourceFile[] = git(source, ["ls-tree", "-r", "-z", commit])
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const [header, path] = line.split("\t")
      const [mode, , blob] = header.split(" ")
      return { path, mode, blob }
    })
  const selected = selectImports(files, rules)
  if (mode === "record") {
    if (commit !== provenance.commit) throw new Error("Record requires the exact commit declared in docs/upstream.json")
    const candidate: Inventory = { commit, files: selected }
    const result = auditImports({ inventory: candidate, rules, files: localFiles() })
    if (result.errors.length) throw new Error(JSON.stringify(result, null, 2))
    const content = `{\n  "commit": ${JSON.stringify(commit)},\n  "files": [\n${selected.map((file) => `    ${JSON.stringify(file)}`).join(",\n")}\n  ]\n}\n`
    const path = resolve(root, "upstream/inventory.json")
    writeFileSync(`${path}.tmp`, content)
    renameSync(`${path}.tmp`, path)
    console.log(JSON.stringify({ recorded: commit, ...result }, null, 2))
    process.exit(0)
  }
  const changes = planImports(inventory, selected, rules)
  const imported = new Set(inventory.files.map((file) => file.target))
  const collisions = selected
    .filter((file) => !imported.has(file.target) && existsSync(resolve(root, file.target)))
    .map((file) => file.target)
  const missingRoots = rules.imports
    .filter((rule) => !selected.some((file) => file.path === rule.source || file.path.startsWith(`${rule.source}/`)))
    .map((rule) => rule.source)
  console.log(
    JSON.stringify(
      { baseline: inventory.commit, candidate: commit, selected: selected.length, changes, collisions, missingRoots },
      null,
      2,
    ),
  )
  if (collisions.length || missingRoots.length) process.exitCode = 1
} else throw new Error(`Unknown mode: ${mode}`)
