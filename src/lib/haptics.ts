/** A tiny buzz on devices that support it. */
export function tick(ms = 8): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate(ms);
  } catch {
    /* unsupported */
  }
}
