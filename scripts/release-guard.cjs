const { execFileSync } = require("node:child_process")

function api(endpoint) {
  return JSON.parse(execFileSync("gh", ["api", endpoint], { encoding: "utf8" }))
}

function validateTag({ version, tag, sha, ref, annotation, runs }) {
  if (!/^\d+\.\d+\.\d+\+\d+$/.test(version) || version.replace("+", ".") !== tag)
    throw new Error("Release tag must match the package version")
  if (ref.object.type !== "tag" || annotation?.object.type !== "commit")
    throw new Error("Release requires an annotated commit tag")
  if (annotation.object.sha !== sha) throw new Error("Remote release tag moved away from this workflow commit")
  if (runs.some((run) => run.event === "push" && run.head_branch === tag && run.head_sha !== sha))
    throw new Error("BLOCKED_RELEASE_TAG_REUSE: tag has push workflows at another commit")
}

function guard() {
  const { GITHUB_REPOSITORY: repo, GITHUB_REF_NAME: tag, GITHUB_SHA: sha, GITHUB_REF_TYPE: type } = process.env
  if (!repo || !tag || !sha || type !== "tag") throw new Error("Expected a tag-triggered GitHub workflow")
  const version = require("../package.json").version
  const ref = api(`repos/${repo}/git/ref/tags/${encodeURIComponent(tag)}`)
  const annotation = ref.object.type === "tag" ? api(`repos/${repo}/git/tags/${ref.object.sha}`) : null
  const pages = JSON.parse(execFileSync("gh", ["api", "--paginate", "--slurp",
    `repos/${repo}/actions/runs?branch=${encodeURIComponent(tag)}&event=push&per_page=100`], { encoding: "utf8" }))
  validateTag({ version, tag, sha, ref, annotation, runs: pages.flatMap((page) => page.workflow_runs) })
  console.log(`Verified immutable annotated release ${tag} at ${sha}`)
}

module.exports = { api, validateTag, guard }
if (require.main === module) guard()
