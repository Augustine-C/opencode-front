import { describe, expect, test } from "bun:test"
const { validateTag } = require("../../release-guard.cjs")
const { validateAsset } = require("../../release-publish.cjs")

const snapshot = () => ({ version: "2.3.0+1", tag: "2.3.0.1", sha: "abc",
  ref: { object: { type: "tag" } }, annotation: { object: { type: "commit", sha: "abc" } }, runs: [] as any[] })

describe("immutable release publication", () => {
  test("accepts same-commit workflow reruns", () => {
    const input = snapshot()
    input.runs = [{ event: "push", head_branch: input.tag, head_sha: input.sha }]
    expect(() => validateTag(input)).not.toThrow()
  })
  test("rejects reused tags even if the remote tag currently matches", () => {
    const input = snapshot()
    input.runs = [{ event: "push", head_branch: input.tag, head_sha: "old" }]
    expect(() => validateTag(input)).toThrow("BLOCKED_RELEASE_TAG_REUSE")
  })
  test("rejects moved, lightweight and wrong-version tags", () => {
    expect(() => validateTag({ ...snapshot(), sha: "old" })).toThrow("moved")
    expect(() => validateTag({ ...snapshot(), ref: { object: { type: "commit" } } })).toThrow("annotated")
    expect(() => validateTag({ ...snapshot(), version: "2.3.0+0" })).toThrow("package version")
  })
  test("only reuses uploaded assets with identical size and SHA-256", () => {
    const asset = { name: "mac.tar.gz", size: 10, digest: "sha256:abc" }
    expect(() => validateAsset({ ...asset, state: "uploaded" }, asset)).not.toThrow()
    for (const changes of [{ size: 11 }, { digest: "sha256:other" }, { state: "new" }])
      expect(() => validateAsset({ ...asset, state: "uploaded", ...changes }, asset)).toThrow("refusing to overwrite")
  })
})
