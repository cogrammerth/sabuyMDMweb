import { getSupabaseAdmin } from "@/lib/supabase";
import {
  isDeviceOnline,
  LOW_BATTERY_THRESHOLD,
} from "@/lib/online";
import type { Device, FleetDevice, FleetSummary } from "@/types/mdm";

export { isDeviceOnline, LOW_BATTERY_THRESHOLD, ONLINE_WINDOW_MS } from "@/lib/online";

export function toFleetDevice(row: Device, now: number = Date.now()): FleetDevice {
  return {
    deviceId: row.device_id,
    deviceName: row.device_name,
    model: row.model,
    androidVersion: row.android_version,
    batteryLevel: row.battery_level,
    storageFreeMb: row.storage_free_mb,
    isDeviceOwner: row.is_device_owner,
    isOnline: isDeviceOnline(row.last_heartbeat, now),
    lastHeartbeat: row.last_heartbeat,
    createdAt: row.created_at,
  };
}

export function summarizeFleet(devices: FleetDevice[]): FleetSummary {
  const online = devices.filter((device) => device.isOnline).length;
  const lowBattery = devices.filter(
    (device) =>
      device.batteryLevel !== null && device.batteryLevel < LOW_BATTERY_THRESHOLD
  ).length;
  return {
    total: devices.length,
    online,
    offline: devices.length - online,
    lowBattery,
  };
}

const DEVICE_COLUMNS =
  "id, device_id, device_name, model, android_version, battery_level, storage_free_mb, is_device_owner, is_online, last_heartbeat, created_at";

/** Fetch fleet rows for specific device IDs (used by map pin joins). */
export async function mapDevicesById(
  deviceIds: string[],
  now: number = Date.now()
): Promise<Map<string, FleetDevice>> {
  const ids = [...new Set(deviceIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("devices")
    .select(DEVICE_COLUMNS)
    .in("device_id", ids);

  if (error) {
    console.error("[devices] map by id failed:", error);
    throw new Error("Failed to fetch devices");
  }

  const out = new Map<string, FleetDevice>();
  for (const row of data ?? []) {
    const fleet = toFleetDevice(row as Device, now);
    out.set(fleet.deviceId, fleet);
  }
  return out;
}

export async function listDevices(): Promise<FleetDevice[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("devices")
    .select(DEVICE_COLUMNS)
    .order("last_heartbeat", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) {
    console.error("[devices] list failed:", error);
    throw new Error("Failed to list devices");
  }

  const now = Date.now();
  return (data ?? []).map((row) => toFleetDevice(row as Device, now));
}

export async function getDevice(deviceId: string): Promise<FleetDevice | null> {
  const id = deviceId.trim();
  if (!id) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("devices")
    .select(DEVICE_COLUMNS)
    .eq("device_id", id)
    .maybeSingle();

  if (error) {
    console.error("[devices] get failed:", error);
    throw new Error("Failed to fetch device");
  }

  if (!data) return null;
  return toFleetDevice(data as Device);
}

export class DeviceNotFoundError extends Error {
  constructor(message = "Device not found") {
    super(message);
    this.name = "DeviceNotFoundError";
  }
}

export async function updateDeviceName(
  deviceId: string,
  deviceName: string | null
): Promise<FleetDevice> {
  const id = deviceId.trim();
  if (!id) {
    throw new Error("deviceId is required");
  }

  const normalized =
    deviceName === null || deviceName === undefined
      ? null
      : deviceName.trim() || null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("devices")
    .update({ device_name: normalized })
    .eq("device_id", id)
    .select(DEVICE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[devices] rename failed:", error);
    throw new Error("Failed to update device name");
  }

  if (!data) {
    throw new DeviceNotFoundError();
  }

  return toFleetDevice(data as Device);
}
