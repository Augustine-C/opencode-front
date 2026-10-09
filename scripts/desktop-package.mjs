import { packager } from "@electron/packager"

const [platform, arch, buildVersion] = process.argv.slice(2)
if (!((platform === "darwin" && arch === "arm64") || (platform === "win32" && arch === "x64"))) {
  throw new Error("Expected darwin arm64 or win32 x64")
}
if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(buildVersion ?? "")) {
  throw new Error("Expected a three or four component build version")
}

await packager({
  dir: "dist/desktop-app",
  name: "OpenCode-Front",
  platform,
  arch,
  electronVersion: "44.4.5",
  buildVersion,
  out: "dist/desktop",
  asar: true,
  junk: true,
  overwrite: true,
  ...(platform === "darwin"
    ? {
        osxSign: {
          identity: "-",
          identityValidation: false,
          continueOnError: false,
          // osx-sign v2 reads hardenedRuntime from per-file options, not the top-level object.
          // Ad hoc identities have no Team ID for hardened runtime library validation.
          optionsForFile: () => ({ hardenedRuntime: false }),
        },
      }
    : {}),
})
