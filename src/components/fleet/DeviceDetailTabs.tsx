"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import PolicyEditor from "@/components/fleet/PolicyEditor";
import { useTranslation } from "@/context/LanguageContext";
import type { PolicyResponse } from "@/types/mdm";

const DeviceHistoryCanvas = dynamic(
  () => import("@/components/maps/DeviceHistoryCanvas"),
  {
    ssr: false,
    loading: () => <HistoryMapLoading />,
  }
);

function HistoryMapLoading() {
  const { t } = useTranslation();
  return (
    <div className="map-canvas history-map-canvas" data-testid="history-map-loading">
      {t("device.loadingHistory")}
    </div>
  );
}

export default function DeviceDetailTabs({
  deviceId,
  initial,
}: {
  deviceId: string;
  initial: PolicyResponse;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"policy" | "history">("policy");

  return (
    <div className="device-workspace">
      <div className="tab-bar" role="tablist" data-testid="device-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "policy"}
          data-testid="tab-policy"
          className={tab === "policy" ? "tab on" : "tab"}
          onClick={() => setTab("policy")}
        >
          {t("device.tabPolicy")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          data-testid="tab-history"
          className={tab === "history" ? "tab on" : "tab"}
          onClick={() => setTab("history")}
        >
          {t("device.tabHistory")}
        </button>
      </div>
      {tab === "policy" ? (
        <PolicyEditor deviceId={deviceId} initial={initial} />
      ) : (
        <section className="panel history-panel">
          <header className="panel-head">
            <h2 data-i18n="device.movementLog">{t("device.movementLog")}</h2>
            <span data-i18n="device.movementHint">{t("device.movementHint")}</span>
          </header>
          <div className="map-canvas history-map-canvas">
            <DeviceHistoryCanvas deviceId={deviceId} />
          </div>
        </section>
      )}
    </div>
  );
}
