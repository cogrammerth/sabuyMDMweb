import Link from "next/link";
import { listDevices, summarizeFleet } from "@/lib/devices";
import DeviceTable from "@/components/fleet/DeviceTable";
import FleetSummary from "@/components/fleet/FleetSummary";
import OperatorNav from "@/components/fleet/OperatorNav";
import type { FleetDevice, FleetSummary as Summary } from "@/types/mdm";

export const dynamic = "force-dynamic";

async function loadFleet(): Promise<{ devices: FleetDevice[]; summary: Summary }> {
  try {
    const devices = await listDevices();
    return { devices, summary: summarizeFleet(devices) };
  } catch {
    return {
      devices: [],
      summary: { total: 0, online: 0, offline: 0, lowBattery: 0 },
    };
  }
}

export default async function DevicesPage() {
  const { devices, summary } = await loadFleet();

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div>
          <p className="office-kicker">SABUY CALL · DEVICE OWNER</p>
          <h1>Fleet dashboard</h1>
        </div>
        <OperatorNav current="fleet" />
      </header>
      <p className="hint" role="note">
        Online means <code>last_heartbeat</code> within 15 minutes. Low battery is
        under 20%.{" "}
        <Link href="/admin">Agent office</Link> still lives on the console.{" "}
        <Link href="/map">Fleet map</Link> plots the latest GPS pin per device.
      </p>
      <FleetSummary summary={summary} />
      <DeviceTable devices={devices} showConfigure />
    </div>
  );
}
