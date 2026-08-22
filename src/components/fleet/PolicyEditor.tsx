"use client";

import { useState } from "react";
import AppListEditor from "@/components/fleet/AppListEditor";
import type { PolicyResponse } from "@/types/mdm";

const TOGGLES: Array<{
  key: keyof Omit<PolicyResponse, "kioskPackage" | "hiddenApps" | "suspendedApps">;
  label: string;
  hint: string;
}> = [
  { key: "disableCamera", label: "Disable camera", hint: "DevicePolicyManager camera restriction" },
  { key: "disableFactoryReset", label: "Block factory reset", hint: "Blocks wipe / FRP bypass" },
  { key: "disableSafeBoot", label: "Block safe boot", hint: "Blocks safe-mode DPC bypass" },
  { key: "disableUsbDebugging", label: "Block USB debugging", hint: "ADB off when tightened" },
  { key: "kioskMode", label: "Kiosk mode", hint: "Locktask — requires a launchable package" },
];

export default function PolicyEditor({
  deviceId,
  initial,
}: {
  deviceId: string;
  initial: PolicyResponse;
}) {
  const [draft, setDraft] = useState<PolicyResponse>(initial);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kioskInvalid = draft.kioskMode && draft.kioskPackage.trim() === "";

  async function save() {
    if (kioskInvalid) {
      setError("kioskPackage is required when kioskMode is true");
      return;
    }
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const res = await fetch(
        `/api/admin/devices/${encodeURIComponent(deviceId)}/policy`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        }
      );
      const body = (await res.json()) as {
        success?: boolean;
        error?: string;
        policy?: PolicyResponse;
      };
      if (!res.ok || body.success === false) {
        setError(body.error ?? "Failed to save policy");
        return;
      }
      if (body.policy) setDraft(body.policy);
      setToast("Policy saved. Devices pick this up on the next PolicySyncWorker poll.");
    } catch {
      setError("Failed to save policy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel" data-testid="policy-toggles">
      <header className="panel-head">
        <h2>Remote policy</h2>
        <span>Writes `policies` and bumps updated_at</span>
      </header>
      <ul className="toggle-list">
        {TOGGLES.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              role="switch"
              aria-checked={draft[item.key]}
              data-testid={`policy-switch-${item.key}`}
              className={draft[item.key] ? "switch on" : "switch"}
              onClick={() =>
                setDraft((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
              }
            >
              <span className="knob" />
            </button>
            <div>
              <strong>{item.label}</strong>
              <p>{item.hint}</p>
            </div>
          </li>
        ))}
      </ul>
      <label className="pkg-field">
        Target kiosk package
        <input
          data-testid="kiosk-package"
          value={draft.kioskPackage}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, kioskPackage: event.target.value }))
          }
          placeholder="com.sabuy.call"
          disabled={!draft.kioskMode}
        />
      </label>
      {kioskInvalid ? (
        <p className="warn" data-testid="kiosk-invariant">
          Locktask on with an empty package is invalid. Security desk will reject it.
        </p>
      ) : null}

      <div className="app-lists">
        <AppListEditor
          label="Hidden apps"
          testId="hidden-apps"
          packages={draft.hiddenApps}
          onChange={(hiddenApps) => setDraft((prev) => ({ ...prev, hiddenApps }))}
          placeholder="com.example.hidden"
        />
        <AppListEditor
          label="Suspended apps"
          testId="suspended-apps"
          packages={draft.suspendedApps}
          onChange={(suspendedApps) =>
            setDraft((prev) => ({ ...prev, suspendedApps }))
          }
          placeholder="com.example.suspended"
        />
      </div>

      <button
        type="button"
        className="primary"
        data-testid="policy-save"
        onClick={() => void save()}
        disabled={saving || kioskInvalid}
      >
        {saving ? "Saving…" : "Save policy"}
      </button>

      {toast ? (
        <p className="toast ok" role="status" data-testid="policy-toast">
          {toast}
        </p>
      ) : null}
      {error ? (
        <p className="toast err" role="alert" data-testid="policy-save-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
