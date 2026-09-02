import { listDevices } from "@/lib/devices";
import { getActiveVersionInfo } from "@/lib/app-versions";
import AdminDashboard from "@/components/fleet/AdminDashboard";
import type { FleetDevice } from "@/types/mdm";

export const dynamic = "force-dynamic";

async function loadDevices(): Promise<{
  devices: FleetDevice[];
  latestVersionCode: number;
}> {
  try {
    const [devices, active] = await Promise.all([
      listDevices(),
      getActiveVersionInfo(),
    ]);
    return { devices, latestVersionCode: active.versionCode };
  } catch {
    return { devices: [], latestVersionCode: 1 };
  }
}

export default async function AdminPage() {
  const { devices, latestVersionCode } = await loadDevices();
  return (
    <AdminDashboard devices={devices} latestVersionCode={latestVersionCode} />
  );
}
