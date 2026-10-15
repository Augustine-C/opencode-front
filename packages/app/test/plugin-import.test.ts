import { expect, test } from "bun:test"
import { pluginDiagnostic } from "../src/plugins/diagnostics"

test("plugin diagnostics hide configured values and credentials in URLs or authorization errors", () => {
  const config = [{ id: "one", package: "one", enabled: true, options: { nested: { password: "private value" } } }]
  const result = pluginDiagnostic(
    "private value private%20value https://user:password@example.test/path?token=hidden#secret Bearer abc123 api_key=abc456",
    config,
  )
  for (const secret of ["private value", "private%20value", "user:", "?token=", "#secret", "abc123", "abc456"])
    expect(result).not.toContain(secret)
  expect(result).toContain("https://example.test/path")
})
