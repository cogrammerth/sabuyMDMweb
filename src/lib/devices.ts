import { getSupabaseAdmin } from "@/lib/supabase";
import {
  isDeviceOnline,
  LOW_BATTERY_THRESHOLD,
} from "@/lib/online";
import type { Device, FleetDevice, FleetSummary } from "@/types/mdm";

export { isDeviceOnline, isDeviceSyncing, LOW_BATTERY_THRESHOLD, ONLINE_WINDOW_MS } from "@/lib/online";

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
    currentAppVersionCode: row.current_app_version_code ?? null,
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

const DEVICE_COLUMNS_BASE =
  "id, device_id, device_name, model, android_version, battery_level, storage_free_mb, is_device_owner, is_online, last_heartbeat, created_at";
const DEVICE_COLUMNS = `${DEVICE_COLUMNS_BASE}, current_app_version_code`;

function isMissingColumnError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    Boolean(error.message?.includes("current_app_version_code"))
  );
}

function asDevice(row: unknown): Device {
  const record = row as Device & { current_app_version_code?: number | null };
  return {
    ...record,
    current_app_version_code: record.current_app_version_code ?? null,
  };
}

async function selectDevices(
  run: (columns: string) => PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>,
  failedMessage: string
): Promise<unknown> {
  const first = await run(DEVICE_COLUMNS);
  if (!first.error) return first.data;
  if (isMissingColumnError(first.error)) {
    const retry = await run(DEVICE_COLUMNS_BASE);
    if (retry.error) {
      console.error("[devices] query failed:", retry.error);
      throw new Error(failedMessage);
    }
    return retry.data;
  }
  console.error("[devices] query failed:", first.error);
  throw new Error(failedMessage);
}

/** Fetch fleet rows for specific device IDs (used by map pin joins). */
export async function mapDevicesById(
  deviceIds: string[],
  now: number = Date.now()
): Promise<Map<string, FleetDevice>> {
  const ids = [...new Set(deviceIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const supabase = getSupabaseAdmin();
  const data = await selectDevices((columns) =>
    supabase.from("devices").select(columns).in("device_id", ids)
  , "Failed to fetch devices");

  const out = new Map<string, FleetDevice>();
  for (const row of (Array.isArray(data) ? data : []) as unknown[]) {
    const fleet = toFleetDevice(asDevice(row), now);
    out.set(fleet.deviceId, fleet);
  }
  return out;
}

export async function listDevices(): Promise<FleetDevice[]> {
  const supabase = getSupabaseAdmin();
  const data = await selectDevices((columns) =>
    supabase
      .from("devices")
      .select(columns)
      .order("last_heartbeat", { ascending: false, nullsFirst: false })
      .limit(500)
  , "Failed to list devices");

  const now = Date.now();
  return (Array.isArray(data) ? data : []).map((row) =>
    toFleetDevice(asDevice(row), now)
  );
}

export async function getDevice(deviceId: string): Promise<FleetDevice | null> {
  const id = deviceId.trim();
  if (!id) return null;

  const supabase = getSupabaseAdmin();
  const data = await selectDevices((columns) =>
    supabase.from("devices").select(columns).eq("device_id", id).maybeSingle()
  , "Failed to fetch device");

  if (!data) return null;
  return toFleetDevice(asDevice(data));
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
  const data = await selectDevices((columns) =>
    supabase
      .from("devices")
      .update({ device_name: normalized })
      .eq("device_id", id)
      .select(columns)
      .maybeSingle()
  , "Failed to update device name");

  if (!data) {
    throw new DeviceNotFoundError();
  }

  return toFleetDevice(asDevice(data));
}
