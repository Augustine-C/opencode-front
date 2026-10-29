import { FrontVersionInfo } from "../../src/extensions/version-info"
import { state, setState } from "./context"
export default function VersionFixture() {
  return <div style={{ "max-width": "560px", padding: "16px" }}><FrontVersionInfo />
    <button id="version-offline" onClick={() => setState("offline", !state.offline)}>Toggle connection</button>
  </div>
}
