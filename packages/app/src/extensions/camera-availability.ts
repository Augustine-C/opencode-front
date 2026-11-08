import { createResource } from "solid-js"

export function createCameraAvailability() {
  const [available, actions] = createResource(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return false

    try {
      return (await navigator.mediaDevices.enumerateDevices()).some((device) => device.kind === "videoinput")
    } catch {
      return false
    }
  })

  return { available, refetch: actions.refetch }
}

export function cameraHint() {
  const insecure =
    typeof location !== "undefined" &&
    location.protocol === "http:" &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1"

  return insecure ? ("server.connect.camera.native" as const) : ("server.connect.camera.unavailable" as const)
}
