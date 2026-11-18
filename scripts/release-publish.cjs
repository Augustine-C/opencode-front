const fs = require("node:fs")
const path = require("node:path")
const { createHash } = require("node:crypto")
const { execFileSync } = require("node:child_process")
const { api, guard } = require("./release-guard.cjs")

function validateAsset(existing, expected) {
  if (existing.state !== "uploaded" || existing.size !== expected.size || existing.digest !== expected.digest)
    throw new Error(`Existing asset differs; refusing to overwrite ${expected.name}`)
}

function publish() {
  guard()
  const repo = process.env.GITHUB_REPOSITORY
  const tag = process.env.GITHUB_REF_NAME
  const gh = (...args) => execFileSync("gh", args, { stdio: "inherit" })
  const expected = ["opencode-front-macos-arm64.tar.gz", "opencode-front-windows-x64.zip",
    `opencode-front-codearts-plugin-${tag}.zip`].map((name) => {
    const data = fs.readFileSync(path.join("artifacts", name))
    if (!data.length) throw new Error(`Empty release asset: ${name}`)
    return { name, size: data.length, digest: `sha256:${createHash("sha256").update(data).digest("hex")}` }
  })
  const releases = JSON.parse(execFileSync("gh", ["api", "--paginate", "--slurp",
    `repos/${repo}/releases?per_page=100`], { encoding: "utf8" })).flat()
  let release = releases.find((item) => item.tag_name === tag)
  if (release && (release.draft || release.prerelease)) throw new Error("Existing release is not stable and published")
  // Validate all existing assets before uploading any missing asset. Reruns are idempotent only for identical bytes.
  for (const asset of release?.assets || []) {
    const match = expected.find((item) => item.name === asset.name)
    if (!match) throw new Error(`Unexpected existing release asset: ${asset.name}`)
    validateAsset(asset, match)
  }
  const notes = `docs/releases/${tag}.md`
  if (!release) {
    gh("release", "create", tag, "--repo", repo, "--verify-tag", "--title", tag,
      ...(fs.existsSync(notes) ? ["--notes-file", notes] : ["--generate-notes"]))
    release = api(`repos/${repo}/releases/tags/${tag}`)
  }
  for (const asset of expected) {
    if (release.assets.some((item) => item.name === asset.name)) continue
    gh("release", "upload", tag, path.join("artifacts", asset.name), "--repo", repo)
  }
  const uploaded = api(`repos/${repo}/releases/tags/${tag}`)
  for (const asset of expected) {
    const actual = uploaded.assets.find((item) => item.name === asset.name)
    if (!actual) throw new Error(`Missing uploaded asset: ${asset.name}`)
    validateAsset(actual, asset)
  }
  guard()
  if (fs.existsSync(notes)) {
    const rows = expected.map((item) => `| [${item.name}](https://github.com/${repo}/releases/download/${tag}/${item.name}) | ${item.size} | \`${item.digest.slice(7)}\` |`)
    fs.writeFileSync("artifacts/RELEASE_NOTES.md", `${fs.readFileSync(notes, "utf8")}\n| File | Bytes | SHA-256 |\n| --- | ---: | --- |\n${rows.join("\n")}\n`)
    gh("release", "edit", tag, "--repo", repo, "--notes-file", "artifacts/RELEASE_NOTES.md")
  }
}

module.exports = { validateAsset }
if (require.main === module) publish()
