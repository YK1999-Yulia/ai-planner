/** Short vibration tick; silently does nothing where unsupported (iOS, desktop). */
export function vibrate(ms: number) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(ms);
  } catch {
    // ignore — never let haptics break the app
  }
}
