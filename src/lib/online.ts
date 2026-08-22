/** Treat a device as online when last_heartbeat is within this window. */
export const ONLINE_WINDOW_MS = 15 * 60 * 1000;

/** Battery percent at or below this is “low” on the fleet summary. */
export const LOW_BATTERY_THRESHOLD = 20;

export function isDeviceOnline(
  lastHeartbeat: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!lastHeartbeat) return false;
  const ts = Date.parse(lastHeartbeat);
  if (Number.isNaN(ts)) return false;
  return now - ts <= ONLINE_WINDOW_MS;
}
