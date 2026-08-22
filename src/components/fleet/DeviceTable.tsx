"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DeviceNameCell from "@/components/fleet/DeviceNameCell";
import { isDeviceOnline, LOW_BATTERY_THRESHOLD } from "@/lib/online";
import type { FleetDevice } from "@/types/mdm";

export type DeviceRow = FleetDevice;

function fmt(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "—";
  const delta = Date.now() - ts;
  const sec = Math.round(Math.abs(delta) / 1000);
  const suffix = delta >= 0 ? "ago" : "from now";
  if (sec < 45) return delta >= 0 ? "just now" : "soon";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ${suffix}`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ${suffix}`;
  const day = Math.round(hr / 24);
  return `${day}d ${suffix}`;
}

function matchesQuery(device: FleetDevice, query: string): boolean {
  if (!query) return true;
  const hay = [
    device.deviceId,
    device.deviceName,
    device.model,
    device.androidVersion,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

export default function DeviceTable({
  devices,
  showConfigure = false,
}: {
  devices: FleetDevice[];
  showConfigure?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "offline" | "low-battery">(
    "all"
  );
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices.filter((device) => {
      if (!matchesQuery(device, q)) return false;
      const online = isDeviceOnline(device.lastHeartbeat);
      if (filter === "online") return online;
      if (filter === "offline") return !online;
      if (filter === "low-battery") {
        return (
          device.batteryLevel !== null &&
          device.batteryLevel < LOW_BATTERY_THRESHOLD
        );
      }
      return true;
    });
  }, [devices, query, filter]);

  const colCount = showConfigure ? 9 : 8;

  return (
    <section className="panel" data-testid="device-table">
      <header className="panel-head">
        <h2>Fleet</h2>
        <span>
          {rows.length} of {devices.length} device
          {devices.length === 1 ? "" : "s"}
        </span>
      </header>
      <div className="filter-bar">
        <label>
          <span className="sr-only">Search devices</span>
          <input
            data-testid="device-search"
            type="search"
            placeholder="Search id, name, model…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filter status</span>
          <select
            data-testid="device-filter"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as typeof filter)
            }
          >
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="low-battery">Low battery</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Online</th>
              <th>Device ID</th>
              <th>Name</th>
              <th>Model</th>
              <th>Android</th>
              <th>Battery</th>
              <th>Free storage</th>
              <th>Last heartbeat</th>
              {showConfigure ? <th>Policy</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="empty">
                  {devices.length === 0
                    ? "No heartbeats yet. Devices appear after POST /api/heartbeat."
                    : "No devices match this search."}
                </td>
              </tr>
            ) : (
              rows.map((device) => {
                const online = isDeviceOnline(device.lastHeartbeat);
                const level = device.batteryLevel;
                return (
                  <tr key={device.deviceId} data-testid={`device-row-${device.deviceId}`}>
                    <td>
                      <span
                        className={online ? "badge-on" : "badge-off"}
                        data-online={online ? "true" : "false"}
                      >
                        {online ? "ONLINE" : "OFFLINE"}
                      </span>
                    </td>
                    <td>
                      <code>{device.deviceId}</code>
                    </td>
                    <td>
                      <DeviceNameCell
                        deviceId={device.deviceId}
                        initialName={device.deviceName}
                      />
                    </td>
                    <td>{fmt(device.model)}</td>
                    <td>{fmt(device.androidVersion)}</td>
                    <td>
                      {level === null ? (
                        "—"
                      ) : (
                        <div className="battery-cell">
                          <div
                            className={
                              level < LOW_BATTERY_THRESHOLD
                                ? "battery-track low"
                                : "battery-track"
                            }
                            title={`${level}%`}
                          >
                            <div
                              className="battery-fill"
                              style={{ width: `${Math.max(0, Math.min(100, level))}%` }}
                            />
                          </div>
                          <span>{level}%</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {device.storageFreeMb === null
                        ? "—"
                        : `${device.storageFreeMb.toLocaleString()} MB`}
                    </td>
                    <td>
                      <time
                        dateTime={device.lastHeartbeat ?? undefined}
                        title={device.lastHeartbeat ?? undefined}
                      >
                        {now === null
                          ? device.lastHeartbeat ?? "—"
                          : relativeTime(device.lastHeartbeat)}
                      </time>
                    </td>
                    {showConfigure ? (
                      <td>
                        <Link
                          className="configure-link"
                          href={`/devices/${encodeURIComponent(device.deviceId)}`}
                          data-testid={`configure-${device.deviceId}`}
                        >
                          Configure
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
