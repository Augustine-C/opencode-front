import {
  openSessionTab,
  previewSessionTab,
  closeSessionTab,
  type SessionTabState,
} from "../src/shell/state/session-tabs"

// Compare the actual production reducers with the same file-tab workload across versions.
// No browser, backend, transcript, or user data is involved.
const iterations = 20_000
const launchers = new Set<string>()
function sample() {
  let state: SessionTabState = { tabs: { all: Array.from({ length: 20 }, (_, index) => `file://src/${index}.ts`) } }
  let checksum = 0
  const start = performance.now()
  for (let index = 0; index < iterations; index++) {
    const tab = `file://preview/${index % 10}.ts`
    state = previewSessionTab(state, tab, launchers)
    state = openSessionTab(state, tab, launchers)
    state = closeSessionTab(state, tab)
    checksum += state.tabs.all.length + (state.tabs.active?.length ?? 0)
  }
  return { durationMs: performance.now() - start, checksum }
}
sample()
const samples = Array.from({ length: 7 }, () => sample())
const sorted = samples.map((item) => item.durationMs).sort((a, b) => a - b)
console.log(JSON.stringify({ iterations, samples, medianMs: sorted[Math.floor(sorted.length / 2)] }, null, 2))
