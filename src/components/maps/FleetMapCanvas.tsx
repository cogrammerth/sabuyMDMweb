"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DeviceLatestLocation } from "@/types/mdm";
import { useTranslation } from "@/context/LanguageContext";
import { formatRelativeTime } from "@/lib/i18n";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  FitToPoints,
} from "./map-utils";
import { statusDivIcon } from "./statusIcon";

export default function FleetMapCanvas() {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<DeviceLatestLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/locations/latest", {
          cache: "no-store",
        });
        const body = (await res.json()) as {
          success?: boolean;
          error?: string;
          locations?: DeviceLatestLocation[];
        };
        if (!res.ok || body.success === false) {
          throw new Error(body.error ?? "Failed to load locations");
        }
        if (!cancelled) {
          setLocations(body.locations ?? []);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const points = useMemo(
    () =>
      locations.map(
        (row) => [row.latitude, row.longitude] as [number, number]
      ),
    [locations]
  );

  return (
    <div className="map-fill" data-testid="leaflet-map">
      {loading ? (
        <p className="map-overlay hint" data-testid="fleet-map-loading">
          {t("map.loadingLocations")}
        </p>
      ) : null}
      {failed ? (
        <p className="map-overlay warn" role="alert">
          {t("map.loadFailed")}
        </p>
      ) : null}
      {!loading && !failed && locations.length === 0 ? (
        <p className="map-overlay hint" data-testid="fleet-map-empty">
          {t("map.empty")}
        </p>
      ) : null}
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom
        className="leaflet-host"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={points} />
        {locations.map((row) => (
          <Marker
            key={row.deviceId}
            position={[row.latitude, row.longitude]}
            icon={statusDivIcon(row.isOnline)}
          >
            <Popup>
              <dl className="map-popup">
                <div>
                  <dt>{t("map.deviceId")}</dt>
                  <dd>
                    <code>{row.deviceId}</code>
                  </dd>
                </div>
                <div>
                  <dt>{t("map.model")}</dt>
                  <dd>{row.model ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("map.battery")}</dt>
                  <dd>
                    {row.batteryLevel === null || row.batteryLevel === undefined
                      ? "—"
                      : `${row.batteryLevel}%`}
                  </dd>
                </div>
                <div>
                  <dt>{t("map.lastHeartbeat")}</dt>
                  <dd>
                    <time dateTime={row.lastHeartbeat ?? undefined}>
                      {formatRelativeTime(row.lastHeartbeat, t)}
                    </time>
                  </dd>
                </div>
              </dl>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <ul className="map-legend" aria-label={t("map.legend")}>
        <li>
          <span className="mdm-pin mdm-pin-online">
            <span className="mdm-pin-dot" />
          </span>
          {t("map.online")}
        </li>
        <li>
          <span className="mdm-pin mdm-pin-offline">
            <span className="mdm-pin-dot" />
          </span>
          {t("map.offline")}
        </li>
      </ul>
    </div>
  );
}
