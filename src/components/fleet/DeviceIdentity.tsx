"use client";

import { useTranslation } from "@/context/LanguageContext";
import StatusBadge from "@/components/ui/StatusBadge";
import VersionIndicator from "@/components/fleet/VersionIndicator";
import type { FleetDevice } from "@/types/mdm";

export default function DeviceIdentity({
  deviceId,
  device,
  online,
  latestVersionCode = 1,
}: {
  deviceId: string;
  device: FleetDevice | null;
  online: boolean;
  latestVersionCode?: number;
}) {
  const { t } = useTranslation();

  return (
    <section className="panel" data-testid="device-identity">
      <header className="panel-head">
        <h2>
          <code>{deviceId || "unknown"}</code>
        </h2>
        <StatusBadge
          online={online}
          lastHeartbeat={device?.lastHeartbeat}
          awaiting={!device}
        />
      </header>
      <dl className="identity-grid">
        <div>
          <dt data-i18n="device.name">{t("device.name")}</dt>
          <dd>{device?.deviceName ?? "—"}</dd>
        </div>
        <div>
          <dt data-i18n="device.model">{t("device.model")}</dt>
          <dd>{device?.model ?? "—"}</dd>
        </div>
        <div>
          <dt data-i18n="device.android">{t("device.android")}</dt>
          <dd>{device?.androidVersion ?? "—"}</dd>
        </div>
        <div>
          <dt data-i18n="device.appVersion">{t("device.appVersion")}</dt>
          <dd>
            <VersionIndicator
              currentCode={device?.currentAppVersionCode}
              latestCode={latestVersionCode}
              testId={device ? `device-version-${device.deviceId}` : "device-version-unknown"}
            />
          </dd>
        </div>
        <div>
          <dt data-i18n="device.battery">{t("device.battery")}</dt>
          <dd>
            {device?.batteryLevel === null || device?.batteryLevel === undefined
              ? "—"
              : `${device.batteryLevel}%`}
          </dd>
        </div>
        <div>
          <dt data-i18n="device.storage">{t("device.storage")}</dt>
          <dd>
            {device?.storageFreeMb === null || device?.storageFreeMb === undefined
              ? "—"
              : `${device.storageFreeMb.toLocaleString()} MB`}
          </dd>
        </div>
      </dl>
      {!device ? (
        <p className="hint" data-i18n="device.noHeartbeat">
          {t("device.noHeartbeat")}
        </p>
      ) : null}
    </section>
  );
}
