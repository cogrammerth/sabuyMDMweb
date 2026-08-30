import { listDevices, summarizeFleet } from "@/lib/devices";
import DeviceTable from "@/components/fleet/DeviceTable";
import FleetSummary from "@/components/fleet/FleetSummary";
import OperatorHeader from "@/components/fleet/OperatorHeader";
import TranslatedHint from "@/components/i18n/TranslatedHint";
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
      <OperatorHeader titleKey="pages.fleet" current="fleet" />
      <TranslatedHint k="hints.fleet" />
      <FleetSummary summary={summary} />
      <DeviceTable devices={devices} showConfigure />
    </div>
  );
}
