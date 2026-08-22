import OperatorNav from "@/components/fleet/OperatorNav";
import FleetMapView from "@/components/maps/FleetMapView";

export const dynamic = "force-dynamic";

export default function FleetMapPage() {
  return (
    <div className="map-shell">
      <header className="admin-top">
        <div>
          <p className="office-kicker">SABUY CALL · DEVICE OWNER</p>
          <h1>Fleet map</h1>
        </div>
        <OperatorNav current="map" />
      </header>
      <p className="hint" role="note">
        Latest GPS per device from <code>location_logs</code>. Green pins are
        online (heartbeat within 15 minutes); gray pins are offline.
      </p>
      <div className="map-canvas" data-testid="fleet-map">
        <FleetMapView />
      </div>
    </div>
  );
}
