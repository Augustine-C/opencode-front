import { spawn } from "node:child_process"
import electron from "electron"

// The desktop is a thin renderer shell. It never discovers, starts, replaces, or stops an OpenCode service.
const child = spawn(electron, ["scripts/desktop-main.cjs"], { stdio: "inherit", env: process.env })
child.on("exit", (code) => process.exit(code ?? 0))
