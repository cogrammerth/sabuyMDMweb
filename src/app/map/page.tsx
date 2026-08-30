import OperatorHeader from "@/components/fleet/OperatorHeader";
import FleetMapView from "@/components/maps/FleetMapView";
import TranslatedHint from "@/components/i18n/TranslatedHint";

export const dynamic = "force-dynamic";

export default function FleetMapPage() {
  return (
    <div className="map-shell">
      <OperatorHeader titleKey="pages.map" current="map" />
      <TranslatedHint k="hints.map" />
      <div className="map-canvas" data-testid="fleet-map">
        <FleetMapView />
      </div>
    </div>
  );
}
