import { getDevice } from "@/lib/devices";
import { getActiveVersionInfo } from "@/lib/app-versions";
import { DEFAULT_POLICY, getPolicy } from "@/lib/policies";
import { isDeviceOnline } from "@/lib/online";
import DeviceDetailTabs from "@/components/fleet/DeviceDetailTabs";
import DeviceIdentity from "@/components/fleet/DeviceIdentity";
import AppShell from "@/components/layout/AppShell";
import BackToFleet from "./BackToFleet";
import MissingDeviceId from "./MissingDeviceId";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ deviceId: string }> };

export default async function DevicePolicyPage({ params }: PageProps) {
  const { deviceId: raw } = await params;
  const deviceId = decodeURIComponent(raw ?? "").trim();
  let device = null;
  let policy = null;
  let latestVersionCode = 1;
  if (deviceId) {
    try {
      const [loadedDevice, loadedPolicy, active] = await Promise.all([
        getDevice(deviceId),
        getPolicy(deviceId),
        getActiveVersionInfo(),
      ]);
      device = loadedDevice;
      policy = loadedPolicy;
      latestVersionCode = active.versionCode;
    } catch {
      device = null;
      policy = null;
    }
  } else {
    try {
      latestVersionCode = (await getActiveVersionInfo()).versionCode;
    } catch {
      latestVersionCode = 1;
    }
  }

  const online = isDeviceOnline(device?.lastHeartbeat ?? null);

  return (
    <AppShell titleKey="pages.devicePolicy" current="fleet">
      <BackToFleet />
      <DeviceIdentity
        deviceId={deviceId}
        device={device}
        online={online}
        latestVersionCode={latestVersionCode}
      />
      {deviceId ? (
        <DeviceDetailTabs
          deviceId={deviceId}
          initial={policy ?? DEFAULT_POLICY}
        />
      ) : (
        <MissingDeviceId />
      )}
    </AppShell>
  );
}
