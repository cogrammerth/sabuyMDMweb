"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DeviceLocationPoint } from "@/types/mdm";
import { useTranslation } from "@/context/LanguageContext";
import { formatRelativeTime } from "@/lib/i18n";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  FitToPoints,
} from "./map-utils";

export default function DeviceHistoryCanvas({ deviceId }: { deviceId: string }) {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<DeviceLocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/admin/devices/${encodeURIComponent(deviceId)}/locations`,
          { cache: "no-store" }
        );
        const body = (await res.json()) as {
          success?: boolean;
          error?: string;
          locations?: DeviceLocationPoint[];
        };
        if (!res.ok || body.success === false) {
          throw new Error(body.error ?? "Failed to load location history");
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
  }, [deviceId]);

  const points = useMemo(
    () =>
      locations.map(
        (row) => [row.latitude, row.longitude] as [number, number]
      ),
    [locations]
  );
  const last = locations[locations.length - 1];

  return (
    <div className="map-fill history-map-fill" data-testid="device-history-map">
      {loading ? (
        <p className="map-overlay hint">{t("map.loadingBreadcrumbs")}</p>
      ) : null}
      {failed ? (
        <p className="map-overlay warn" role="alert">
          {t("map.historyFailed")}
        </p>
      ) : null}
      {!loading && !failed && locations.length === 0 ? (
        <p className="map-overlay hint" data-testid="history-map-empty">
          {t("map.historyEmpty")}
        </p>
      ) : null}
      <MapContainer
        center={last ? [last.latitude, last.longitude] : DEFAULT_MAP_CENTER}
        zoom={last ? 14 : DEFAULT_MAP_ZOOM}
        scrollWheelZoom
        className="leaflet-host"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={points} />
        {points.length >= 2 ? (
          <Polyline
            positions={points}
            pathOptions={{ color: "#3bc46a", weight: 3, opacity: 0.85 }}
          />
        ) : null}
        {last ? (
          <CircleMarker
            center={[last.latitude, last.longitude]}
            radius={8}
            pathOptions={{
              color: "#0f1419",
              weight: 2,
              fillColor: "#3bc46a",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <p className="map-popup-line">
                {t("map.lastFix", {
                  when: formatRelativeTime(last.recordedAt, t),
                })}
              </p>
              <p className="map-popup-line">
                {last.latitude.toFixed(5)}, {last.longitude.toFixed(5)}
              </p>
            </Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
    </div>
  );
}
