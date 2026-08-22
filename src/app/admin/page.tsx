import { listDevices } from "@/lib/devices";
import AdminDashboard from "@/components/fleet/AdminDashboard";
import type { FleetDevice } from "@/types/mdm";

export const dynamic = "force-dynamic";

async function loadDevices(): Promise<FleetDevice[]> {
  try {
    return await listDevices();
  } catch {
    return [];
  }
}

export default async function AdminPage() {
  const devices = await loadDevices();
  return <AdminDashboard devices={devices} />;
}
