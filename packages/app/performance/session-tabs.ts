import { createRoot } from "solid-js"
import { createStore } from "solid-js/store"
import { createSessionTabs } from "../src/session/helpers"

// Production tab derivation only; no browser, backend, transcript, or user data.
const iterations = 20_000
function sample(all: string[]) {
  return createRoot((dispose) => {
    const [state, setState] = createStore({ active: "review", all })
    const tabs = { active: () => state.active, all: () => state.all }
    const model = createSessionTabs({
      tabs: () => tabs,
      pathFromTab: (tab) => (tab.startsWith("file://") ? tab.slice(7) : undefined),
      normalizeTab: (tab) => tab,
      review: () => true,
      hasReview: () => true,
      fileBrowser: () => true,
      browser: () => true,
    })
    const sequence = ["review", "context", "file://src/0.ts", "browser:one", "open-file"]
    let checksum = 0
    const start = performance.now()
    for (let index = 0; index < iterations; index++) {
      setState("active", sequence[index % sequence.length])
      checksum += model.activeTab().length + model.openedTabs().length
    }
    const durationMs = performance.now() - start
    dispose()
    return { durationMs, checksum }
  })
}
const all = [
  "context",
  "browser:one",
  "open-file",
  ...Array.from({ length: 20 }, (_, index) => `file://src/${index}.ts`),
]
sample(all)
const samples = Array.from({ length: 7 }, () => sample(all))
const sorted = samples.map((item) => item.durationMs).sort((a, b) => a - b)
console.log(JSON.stringify({ iterations, samples, medianMs: sorted[Math.floor(sorted.length / 2)] }, null, 2))
