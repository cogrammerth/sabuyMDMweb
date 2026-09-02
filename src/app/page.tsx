import { listDevices, summarizeFleet } from "@/lib/devices";
import { isDeviceSyncing } from "@/lib/online";
import AppShell from "@/components/layout/AppShell";
import ExecutiveDashboard from "@/components/dashboard/ExecutiveDashboard";
import type { FleetDevice } from "@/types/mdm";

export const dynamic = "force-dynamic";

export default async function Home() {
  let devices: FleetDevice[] = [];
  let health: "healthy" | "unhealthy" = "healthy";
  try {
    devices = await listDevices();
  } catch {
    health = "unhealthy";
  }
  const summary = summarizeFleet(devices);
  const pending = devices.filter((device) =>
    isDeviceSyncing(device.lastHeartbeat)
  ).length;

  return (
    <AppShell titleKey="pages.dashboard" current="dashboard">
      <ExecutiveDashboard
        devices={devices}
        summary={summary}
        pending={pending}
        health={health}
      />
    </AppShell>
  );
}
