"use client";

import { useTranslation } from "@/context/LanguageContext";
import { isDeviceSyncing } from "@/lib/online";

export default function StatusBadge({
  online,
  lastHeartbeat,
  awaiting = false,
}: {
  online: boolean;
  lastHeartbeat?: string | null;
  awaiting?: boolean;
}) {
  const { t } = useTranslation();
  const syncing = !awaiting && isDeviceSyncing(lastHeartbeat ?? null);

  if (awaiting) {
    return (
      <span className="status-badge wait" data-online="false">
        🟡 {t("device.awaiting")}
      </span>
    );
  }
  if (syncing) {
    return (
      <span className="status-badge sync" data-online="true">
        🟡 {t("fleet.syncing")}
      </span>
    );
  }
  if (online) {
    return (
      <span className="status-badge on badge-on" data-online="true">
        🟢 {t("fleet.online")}
      </span>
    );
  }
  return (
    <span className="status-badge off badge-off" data-online="false">
      🔴 {t("fleet.offline")}
    </span>
  );
}
