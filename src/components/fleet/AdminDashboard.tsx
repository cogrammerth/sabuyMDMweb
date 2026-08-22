import Link from "next/link";
import AgentOfficeView from "@/components/agents/AgentOfficeView";
import DeviceTable, { type DeviceRow } from "@/components/fleet/DeviceTable";
import OperatorNav from "@/components/fleet/OperatorNav";
import PolicyToggles from "@/components/fleet/PolicyToggles";
import QrGenerator from "@/components/fleet/QrGenerator";

export default function AdminDashboard({ devices }: { devices: DeviceRow[] }) {
  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div>
          <p className="office-kicker">SABUY CALL · DEVICE OWNER</p>
          <h1>MDM Web Hub</h1>
        </div>
        <OperatorNav current="console" />
      </header>
      <p className="hint" role="note">
        Policy writes live on the <Link href="/devices">fleet dashboard</Link>. Zero-Touch
        QR lives on <Link href="/provisioning">/provisioning</Link>. Set{" "}
        <code>OPERATOR_PASSWORD</code> before publishing admin routes.
      </p>
      <AgentOfficeView />
      <div className="admin-grid">
        <DeviceTable devices={devices} showConfigure />
        <div className="stack">
          <PolicyToggles />
          <QrGenerator />
        </div>
      </div>
    </div>
  );
}
