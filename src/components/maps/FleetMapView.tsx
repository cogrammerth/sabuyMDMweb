"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "@/context/LanguageContext";

const FleetMapCanvas = dynamic(() => import("./FleetMapCanvas"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  const { t } = useTranslation();
  return (
    <div className="map-fill" data-testid="fleet-map-loading">
      <p className="map-overlay hint">{t("map.loading")}</p>
    </div>
  );
}

export default function FleetMapView() {
  return <FleetMapCanvas />;
}
