export const OFFLINE_MUTATION_MESSAGE =
  "You appear to be offline. Reconnect before saving financial changes.";

export function isBrowserOnline() {
  return typeof window === "undefined" || window.navigator.onLine !== false;
}
