import { listDevices, summarizeFleet } from "@/lib/devices";
import { getActiveVersionInfo } from "@/lib/app-versions";
import DeviceTable from "@/components/fleet/DeviceTable";
import FleetSummary from "@/components/fleet/FleetSummary";
import AppShell from "@/components/layout/AppShell";
import TranslatedHint from "@/components/i18n/TranslatedHint";
import type { FleetDevice, FleetSummary as Summary } from "@/types/mdm";

export const dynamic = "force-dynamic";

async function loadFleet(): Promise<{
  devices: FleetDevice[];
  summary: Summary;
  latestVersionCode: number;
}> {
  try {
    const [devices, active] = await Promise.all([
      listDevices(),
      getActiveVersionInfo(),
    ]);
    return {
      devices,
      summary: summarizeFleet(devices),
      latestVersionCode: active.versionCode,
    };
  } catch {
    return {
      devices: [],
      summary: { total: 0, online: 0, offline: 0, lowBattery: 0 },
      latestVersionCode: 1,
    };
  }
}

export default async function DevicesPage() {
  const { devices, summary, latestVersionCode } = await loadFleet();

  return (
    <AppShell titleKey="pages.fleet" current="fleet">
      <TranslatedHint k="hints.fleet" />
      <FleetSummary summary={summary} />
      <DeviceTable
        devices={devices}
        showConfigure
        latestVersionCode={latestVersionCode}
      />
    </AppShell>
  );
}
