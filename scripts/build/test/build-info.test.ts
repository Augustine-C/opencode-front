import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { readBuildInfo } from "../../build-info"

test("only a clean exact client release tag is presented as released; GUI provenance stays independent", () => {
  const dir = mkdtempSync(join(tmpdir(), "opencode-build-"))
  const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, stdio: "pipe" })
  try {
    mkdirSync(join(dir, "docs"))
    writeFileSync(join(dir, "package.json"), JSON.stringify({ version: "2.0.28+0" }))
    writeFileSync(join(dir, "docs/upstream.json"), JSON.stringify({ version: "2.0.29", commit: "upstream-commit" }))
    expect(readBuildInfo(dir).release).toBeUndefined()
    git("init")
    git("add", ".")
    git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-m", "fixture")
    expect(readBuildInfo(dir).release).toBeUndefined()
    git("tag", "2.0.27.0")
    expect(readBuildInfo(dir).release).toBeUndefined()
    git("tag", "2.0.28.0")
    expect(readBuildInfo(dir)).toMatchObject({
      version: "2.0.28+0",
      release: "2.0.28.0",
      upstreamVersion: "2.0.29",
      upstreamCommit: "upstream-commit",
      dirty: false,
    })
    writeFileSync(join(dir, "change.txt"), "local modification")
    expect(readBuildInfo(dir)).toMatchObject({ dirty: true, release: undefined })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
