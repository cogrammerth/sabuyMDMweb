"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

/** Bangkok — default viewport when the fleet has no GPS yet. */
export const DEFAULT_MAP_CENTER: [number, number] = [13.7563, 100.5018];
export const DEFAULT_MAP_ZOOM = 12;

export function FitToPoints({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const key = points.map((point) => point.join(",")).join("|");

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(points, { padding: [48, 48], maxZoom: 15 });
  }, [map, key, points]);

  return null;
}

export function relativeHeartbeat(iso: string | null): string {
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
