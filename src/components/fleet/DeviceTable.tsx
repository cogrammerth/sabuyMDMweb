"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DeviceNameCell from "@/components/fleet/DeviceNameCell";
import StatusBadge from "@/components/ui/StatusBadge";
import VersionIndicator from "@/components/fleet/VersionIndicator";
import { useTranslation } from "@/context/LanguageContext";
import { formatRelativeTime } from "@/lib/i18n";
import { isDeviceOnline, LOW_BATTERY_THRESHOLD } from "@/lib/online";
import type { FleetDevice } from "@/types/mdm";

export type DeviceRow = FleetDevice;

function fmt(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
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
  latestVersionCode = 1,
}: {
  devices: FleetDevice[];
  showConfigure?: boolean;
  latestVersionCode?: number;
}) {
  const { t } = useTranslation();
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

  const colCount = showConfigure ? 10 : 9;

  return (
    <section className="panel" data-testid="device-table">
      <header className="panel-head">
        <h2 data-i18n="fleet.title">{t("fleet.title")}</h2>
        <span data-i18n="fleet.count">
          {t("fleet.count", { shown: rows.length, total: devices.length })}
        </span>
      </header>
      <div className="filter-bar">
        <label>
          <span className="sr-only">{t("fleet.search")}</span>
          <input
            data-testid="device-search"
            type="search"
            placeholder={t("fleet.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">{t("fleet.filterStatus")}</span>
          <select
            data-testid="device-filter"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as typeof filter)
            }
          >
            <option value="all">{t("fleet.filterAll")}</option>
            <option value="online">{t("fleet.filterOnline")}</option>
            <option value="offline">{t("fleet.filterOffline")}</option>
            <option value="low-battery">{t("fleet.filterLowBattery")}</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th data-i18n="metrics.healthStatus">{t("metrics.healthStatus")}</th>
              <th data-testid="col-device-id" data-i18n="fleet.colDeviceId">
                {t("fleet.colDeviceId")}
              </th>
              <th data-i18n="fleet.colName">{t("fleet.colName")}</th>
              <th data-i18n="fleet.colModel">{t("fleet.colModel")}</th>
              <th data-i18n="fleet.colAndroid">{t("fleet.colAndroid")}</th>
              <th data-i18n="fleet.colAppVersion">{t("fleet.colAppVersion")}</th>
              <th data-i18n="fleet.colBattery">{t("fleet.colBattery")}</th>
              <th data-i18n="fleet.colStorage">{t("fleet.colStorage")}</th>
              <th data-i18n="fleet.colHeartbeat">{t("fleet.colHeartbeat")}</th>
              {showConfigure ? (
                <th data-i18n="fleet.colPolicy">{t("fleet.colPolicy")}</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="empty">
                  {devices.length === 0
                    ? t("fleet.emptyNone")
                    : t("fleet.emptyFilter")}
                </td>
              </tr>
            ) : (
              rows.map((device) => {
                const online = isDeviceOnline(device.lastHeartbeat);
                const level = device.batteryLevel;
                return (
                  <tr key={device.deviceId} data-testid={`device-row-${device.deviceId}`}>
                    <td>
                      <StatusBadge
                        online={online}
                        lastHeartbeat={device.lastHeartbeat}
                      />
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
                      <VersionIndicator
                        currentCode={device.currentAppVersionCode}
                        latestCode={latestVersionCode}
                        testId={`device-version-${device.deviceId}`}
                      />
                    </td>
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
                          : formatRelativeTime(device.lastHeartbeat, t)}
                      </time>
                    </td>
                    {showConfigure ? (
                      <td>
                        <Link
                          className="configure-link"
                          href={`/devices/${encodeURIComponent(device.deviceId)}`}
                          data-testid={`configure-${device.deviceId}`}
                        >
                          {t("fleet.configure")}
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
