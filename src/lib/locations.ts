import { mapDevicesById } from "@/lib/devices";
import { isDeviceOnline } from "@/lib/online";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DeviceLatestLocation, DeviceLocationPoint } from "@/types/mdm";

const LATEST_SCAN_LIMIT = 8000;
const HISTORY_LIMIT = 500;

/**
 * Most recent location_logs row per device_id, joined with fleet metadata.
 * Online is computed from last_heartbeat (15-minute window), not is_online.
 */
export async function listLatestLocations(): Promise<DeviceLatestLocation[]> {
  const supabase = getSupabaseAdmin();
  const now = Date.now();

  const { data: logs, error: logsError } = await supabase
    .from("location_logs")
    .select("device_id, latitude, longitude, recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(LATEST_SCAN_LIMIT);

  if (logsError) {
    console.error("[locations] latest logs failed:", logsError);
    throw new Error("Failed to list latest locations");
  }

  const latest = new Map<
    string,
    { latitude: number; longitude: number; recorded_at: string }
  >();
  for (const row of logs ?? []) {
    if (!latest.has(row.device_id)) {
      latest.set(row.device_id, {
        latitude: row.latitude,
        longitude: row.longitude,
        recorded_at: row.recorded_at,
      });
    }
  }

  if (latest.size === 0) return [];

  const byId = await mapDevicesById([...latest.keys()], now);

  const out: DeviceLatestLocation[] = [];
  for (const [deviceId, point] of latest) {
    const device = byId.get(deviceId);
    out.push({
      deviceId,
      deviceName: device?.deviceName ?? null,
      model: device?.model ?? null,
      batteryLevel: device?.batteryLevel ?? null,
      isOnline: device ? isDeviceOnline(device.lastHeartbeat, now) : false,
      lastHeartbeat: device?.lastHeartbeat ?? null,
      latitude: point.latitude,
      longitude: point.longitude,
      recordedAt: point.recorded_at,
    });
  }
  return out;
}

/**
 * Historical coordinates for one device, oldest-first for polyline drawing.
 * Newest `limit` rows are kept, then reversed to recorded_at ASC.
 */
export async function listDeviceLocations(
  deviceId: string,
  limit: number = HISTORY_LIMIT
): Promise<DeviceLocationPoint[]> {
  const id = deviceId.trim();
  if (!id) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("location_logs")
    .select("id, latitude, longitude, recorded_at")
    .eq("device_id", id)
    .order("recorded_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, HISTORY_LIMIT)));

  if (error) {
    console.error("[locations] history failed:", error);
    throw new Error("Failed to list device locations");
  }

  return (data ?? [])
    .slice()
    .reverse()
    .map((row) => ({
      id: row.id,
      latitude: row.latitude,
      longitude: row.longitude,
      recordedAt: row.recorded_at,
    }));
}
