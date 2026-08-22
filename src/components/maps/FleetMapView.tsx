"use client";

import dynamic from "next/dynamic";

const FleetMapCanvas = dynamic(() => import("./FleetMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="map-fill" data-testid="fleet-map-loading">
      <p className="map-overlay hint">Loading fleet map…</p>
    </div>
  ),
});

export default function FleetMapView() {
  return <FleetMapCanvas />;
}
