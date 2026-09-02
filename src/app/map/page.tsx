import AppShell from "@/components/layout/AppShell";
import FleetMapView from "@/components/maps/FleetMapView";
import TranslatedHint from "@/components/i18n/TranslatedHint";

export const dynamic = "force-dynamic";

export default function FleetMapPage() {
  return (
    <AppShell titleKey="pages.map" current="map" contentClassName="map-page">
      <TranslatedHint k="hints.map" />
      <div className="map-canvas" data-testid="fleet-map">
        <FleetMapView />
      </div>
    </AppShell>
  );
}
