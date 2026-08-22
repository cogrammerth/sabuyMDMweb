import OperatorNav from "@/components/fleet/OperatorNav";
import AppReleaseEditor from "@/components/fleet/AppReleaseEditor";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div>
          <p className="office-kicker">SABUY CALL · DEVICE OWNER</p>
          <h1>Settings</h1>
        </div>
        <OperatorNav current="settings" />
      </header>
      <p className="hint" role="note">
        Publish APK metadata without redeploying the hub. Devices poll{" "}
        <code>GET /api/version.json</code> from UpdateWorker.
      </p>
      <AppReleaseEditor />
    </div>
  );
}
