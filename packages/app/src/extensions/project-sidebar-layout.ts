import { createMediaQuery } from "@solid-primitives/media"
import { useSettings } from "@/settings/model"

const bounded = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback

// Both the shell and its project divider read the same geometry, including at the compact breakpoint.
export function useProjectSidebarLayout() {
  const settings = useSettings()
  const compact = createMediaQuery("(max-width: 1119px)")
  const projects = () => bounded(settings.appearance.projectTabWidths().projects, 160, 300, 200)
  const sessions = () => bounded(settings.appearance.projectTabWidths().sessions, 200, 420, 244)
  const projectColumn = () => (compact() ? 54 : projects())
  const width = () => projectColumn() + sessions()
  const projectMax = () => Math.min(300, projects() + sessions() - 200)
  return {
    compact,
    projects,
    sessions,
    projectColumn,
    projectMax,
    width,
    min: () => projectColumn() + 200,
    max: () => projectColumn() + 420,
    resize(width: number) {
      if (!settings.ready()) return
      settings.appearance.setProjectTabWidths(projects(), bounded(width - projectColumn(), 200, 420, 244))
    },
    resizeProjects(width: number) {
      if (!settings.ready() || compact()) return
      const total = projects() + sessions()
      const next = bounded(width, Math.max(160, total - 420), projectMax(), projects())
      settings.appearance.setProjectTabWidths(next, total - next)
    },
  }
}
