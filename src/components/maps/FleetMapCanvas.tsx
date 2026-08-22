"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DeviceLatestLocation } from "@/types/mdm";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  FitToPoints,
  relativeHeartbeat,
} from "./map-utils";
import { statusDivIcon } from "./statusIcon";

export default function FleetMapCanvas() {
  const [locations, setLocations] = useState<DeviceLatestLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load locations");
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
          Loading location data…
        </p>
      ) : null}
      {error ? (
        <p className="map-overlay warn" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && locations.length === 0 ? (
        <p className="map-overlay hint" data-testid="fleet-map-empty">
          No GPS yet. Pins appear after heartbeats include latitude and longitude.
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
                  <dt>Device ID</dt>
                  <dd>
                    <code>{row.deviceId}</code>
                  </dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{row.model ?? "—"}</dd>
                </div>
                <div>
                  <dt>Battery</dt>
                  <dd>
                    {row.batteryLevel === null || row.batteryLevel === undefined
                      ? "—"
                      : `${row.batteryLevel}%`}
                  </dd>
                </div>
                <div>
                  <dt>Last heartbeat</dt>
                  <dd>
                    <time dateTime={row.lastHeartbeat ?? undefined}>
                      {relativeHeartbeat(row.lastHeartbeat)}
                    </time>
                  </dd>
                </div>
              </dl>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <ul className="map-legend" aria-label="Marker legend">
        <li>
          <span className="mdm-pin mdm-pin-online">
            <span className="mdm-pin-dot" />
          </span>
          Online
        </li>
        <li>
          <span className="mdm-pin mdm-pin-offline">
            <span className="mdm-pin-dot" />
          </span>
          Offline
        </li>
      </ul>
    </div>
  );
}
