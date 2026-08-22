import Link from "next/link";
import { getDevice } from "@/lib/devices";
import { DEFAULT_POLICY, getPolicy } from "@/lib/policies";
import { isDeviceOnline } from "@/lib/online";
import DeviceDetailTabs from "@/components/fleet/DeviceDetailTabs";
import OperatorNav from "@/components/fleet/OperatorNav";

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
      <header className="admin-top">
        <div>
          <p className="office-kicker">SABUY CALL · DEVICE OWNER</p>
          <h1>Device policy</h1>
        </div>
        <OperatorNav current="fleet" />
      </header>
      <p className="hint">
        <Link href="/devices">← Fleet</Link>
      </p>
      <section className="panel" data-testid="device-identity">
        <header className="panel-head">
          <h2>
            <code>{deviceId || "unknown"}</code>
          </h2>
          <span className={online ? "badge-on" : "badge-off"}>
            {device ? (online ? "ONLINE" : "OFFLINE") : "AWAITING HEARTBEAT"}
          </span>
        </header>
        <dl className="identity-grid">
          <div>
            <dt>Name</dt>
            <dd>{device?.deviceName ?? "—"}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{device?.model ?? "—"}</dd>
          </div>
          <div>
            <dt>Android</dt>
            <dd>{device?.androidVersion ?? "—"}</dd>
          </div>
          <div>
            <dt>Battery</dt>
            <dd>
              {device?.batteryLevel === null || device?.batteryLevel === undefined
                ? "—"
                : `${device.batteryLevel}%`}
            </dd>
          </div>
          <div>
            <dt>Free storage</dt>
            <dd>
              {device?.storageFreeMb === null || device?.storageFreeMb === undefined
                ? "—"
                : `${device.storageFreeMb.toLocaleString()} MB`}
            </dd>
          </div>
        </dl>
        {!device ? (
          <p className="hint">
            No heartbeat row yet. Policy can still be saved — PolicySyncWorker may
            run before the first heartbeat.
          </p>
        ) : null}
      </section>
      {deviceId ? (
        <DeviceDetailTabs
          deviceId={deviceId}
          initial={policy ?? DEFAULT_POLICY}
        />
      ) : (
        <p className="warn">Missing device id.</p>
      )}
    </div>
  );
}
