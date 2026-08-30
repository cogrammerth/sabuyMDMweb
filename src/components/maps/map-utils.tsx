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
