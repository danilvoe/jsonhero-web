export function isOffline(): boolean {
  return typeof OFFLINE !== "undefined" && OFFLINE === "true";
}
