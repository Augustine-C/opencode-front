const fs = require("node:fs")

const minimum = { width: 640, height: 480 }
const defaults = { width: 1320, height: 900 }

function restoreWindowState(value, areas) {
  const valid =
    value?.version === 1 &&
    value.bounds &&
    ["x", "y", "width", "height"].every((key) => Number.isFinite(value.bounds[key])) &&
    value.bounds.width >= minimum.width &&
    value.bounds.height >= minimum.height
  const bounds = valid ? value.bounds : defaults
  const overlap = (area) =>
    valid
      ? Math.max(0, Math.min(area.x + area.width, bounds.x + bounds.width) - Math.max(area.x, bounds.x)) *
        Math.max(0, Math.min(area.y + area.height, bounds.y + bounds.height) - Math.max(area.y, bounds.y))
      : 0
  const area = areas.reduce((best, next) => (overlap(next) > overlap(best) ? next : best), areas[0])
  const width = Math.round(Math.min(Math.max(minimum.width, bounds.width), Math.max(minimum.width, area.width)))
  const height = Math.round(Math.min(Math.max(minimum.height, bounds.height), Math.max(minimum.height, area.height)))
  return {
    bounds: {
      x: Math.round(
        Math.max(area.x, Math.min(valid ? bounds.x : area.x + (area.width - width) / 2, area.x + area.width - width)),
      ),
      y: Math.round(
        Math.max(
          area.y,
          Math.min(valid ? bounds.y : area.y + (area.height - height) / 2, area.y + area.height - height),
        ),
      ),
      width,
      height,
    },
    maximized: !!valid && value.maximized === true,
  }
}

function readWindowState(file, areas) {
  let value
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {}
  return restoreWindowState(value, areas)
}

function trackWindowState(window, file) {
  let timer
  const save = () => {
    clearTimeout(timer)
    if (window.isDestroyed()) return
    const state = { version: 1, bounds: window.getNormalBounds(), maximized: window.isMaximized() }
    try {
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(state))
      fs.renameSync(`${file}.tmp`, file)
    } catch {}
  }
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(save, 250)
  }
  for (const event of ["move", "resize", "maximize", "unmaximize"]) window.on(event, schedule)
  window.on("close", save)
  window.on("closed", () => clearTimeout(timer))
}

module.exports = { readWindowState, restoreWindowState, trackWindowState }
