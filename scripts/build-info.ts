import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

export function readBuildInfo(root: string) {
  const git = (...args: string[]) => {
    try {
      return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
    } catch {
      return ""
    }
  }
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }
  const upstream = JSON.parse(readFileSync(join(root, "docs/upstream.json"), "utf8")) as {
    version: string
    commit: string
  }
  const commit = git("rev-parse", "HEAD") || "unknown"
  const dirty = !!git("status", "--porcelain")
  const tag = pkg.version.replace("+", ".")
  const release =
    !dirty && /^\d+\.\d+\.\d+\.\d+$/.test(tag) && git("tag", "--points-at", "HEAD").split("\n").includes(tag)
      ? tag
      : undefined
  return {
    version: pkg.version,
    commit,
    dirty,
    release,
    upstreamVersion: upstream.version,
    upstreamCommit: upstream.commit,
  }
}
