import { getDevice } from "@/lib/devices";
import { DEFAULT_POLICY, getPolicy } from "@/lib/policies";
import { isDeviceOnline } from "@/lib/online";
import DeviceDetailTabs from "@/components/fleet/DeviceDetailTabs";
import DeviceIdentity from "@/components/fleet/DeviceIdentity";
import OperatorHeader from "@/components/fleet/OperatorHeader";
import BackToFleet from "./BackToFleet";
import MissingDeviceId from "./MissingDeviceId";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ deviceId: string }> };

export default async function DevicePolicyPage({ params }: PageProps) {
  const { deviceId: raw } = await params;
  const deviceId = decodeURIComponent(raw ?? "").trim();
  const [device, policy] = await Promise.all([
    deviceId ? getDevice(deviceId) : Promise.resolve(null),
    deviceId ? getPolicy(deviceId) : Promise.resolve(null),
  ]).catch(() => [null, null] as const);

  const online = isDeviceOnline(device?.lastHeartbeat ?? null);

  return (
    <div className="admin-shell">
      <OperatorHeader titleKey="pages.devicePolicy" current="fleet" />
      <BackToFleet />
      <DeviceIdentity deviceId={deviceId} device={device} online={online} />
      {deviceId ? (
        <DeviceDetailTabs
          deviceId={deviceId}
          initial={policy ?? DEFAULT_POLICY}
        />
      ) : (
        <MissingDeviceId />
      )}
    </div>
  );
}
