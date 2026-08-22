"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import PolicyEditor from "@/components/fleet/PolicyEditor";
import type { PolicyResponse } from "@/types/mdm";

const DeviceHistoryCanvas = dynamic(
  () => import("@/components/maps/DeviceHistoryCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="map-canvas history-map-canvas" data-testid="history-map-loading">
        Loading history map…
      </div>
    ),
  }
);

export default function DeviceDetailTabs({
  deviceId,
  initial,
}: {
  deviceId: string;
  initial: PolicyResponse;
}) {
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
          Policy
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          data-testid="tab-history"
          className={tab === "history" ? "tab on" : "tab"}
          onClick={() => setTab("history")}
        >
          Location history
        </button>
      </div>
      {tab === "policy" ? (
        <PolicyEditor deviceId={deviceId} initial={initial} />
      ) : (
        <section className="panel history-panel">
          <header className="panel-head">
            <h2>Movement log</h2>
            <span>Polyline from location_logs, oldest → newest</span>
          </header>
          <div className="map-canvas history-map-canvas">
            <DeviceHistoryCanvas deviceId={deviceId} />
          </div>
        </section>
      )}
    </div>
  );
}
