"use client";

import { useState } from "react";
import AppListEditor from "@/components/fleet/AppListEditor";
import { useTranslation } from "@/context/LanguageContext";
import type { PolicyResponse } from "@/types/mdm";

const TOGGLES: Array<{
  key: keyof Omit<PolicyResponse, "kioskPackage" | "hiddenApps" | "suspendedApps">;
  labelKey:
    | "policy.disableCamera"
    | "policy.disableFactoryReset"
    | "policy.disableSafeBoot"
    | "policy.disableUsbDebugging"
    | "policy.kioskMode";
  hintKey:
    | "policy.disableCameraHint"
    | "policy.disableFactoryResetHint"
    | "policy.disableSafeBootHint"
    | "policy.disableUsbDebuggingHint"
    | "policy.kioskModeHint";
}> = [
  {
    key: "disableCamera",
    labelKey: "policy.disableCamera",
    hintKey: "policy.disableCameraHint",
  },
  {
    key: "disableFactoryReset",
    labelKey: "policy.disableFactoryReset",
    hintKey: "policy.disableFactoryResetHint",
  },
  {
    key: "disableSafeBoot",
    labelKey: "policy.disableSafeBoot",
    hintKey: "policy.disableSafeBootHint",
  },
  {
    key: "disableUsbDebugging",
    labelKey: "policy.disableUsbDebugging",
    hintKey: "policy.disableUsbDebuggingHint",
  },
  {
    key: "kioskMode",
    labelKey: "policy.kioskMode",
    hintKey: "policy.kioskModeHint",
  },
];

export default function PolicyEditor({
  deviceId,
  initial,
}: {
  deviceId: string;
  initial: PolicyResponse;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PolicyResponse>(initial);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kioskInvalid = draft.kioskMode && draft.kioskPackage.trim() === "";

  async function save() {
    if (kioskInvalid) {
      setError(t("policy.kioskRequired"));
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
        setError(body.error ?? t("policy.saveFailed"));
        return;
      }
      if (body.policy) setDraft(body.policy);
      setToast(t("policy.saved"));
    } catch {
      setError(t("policy.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel" data-testid="policy-toggles">
      <header className="panel-head">
        <h2 data-i18n="actions.policyEditor">{t("actions.policyEditor")}</h2>
        <span data-i18n="policy.subtitle">{t("policy.subtitle")}</span>
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
              <strong data-i18n={item.labelKey}>{t(item.labelKey)}</strong>
              <p data-i18n={item.hintKey}>{t(item.hintKey)}</p>
            </div>
          </li>
        ))}
      </ul>
      <label className="pkg-field">
        {t("policy.kioskPackage")}
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
        <p className="warn" data-testid="kiosk-invariant" data-i18n="policy.kioskInvariant">
          {t("policy.kioskInvariant")}
        </p>
      ) : null}

      <div className="app-lists">
        <AppListEditor
          label={t("policy.hiddenApps")}
          testId="hidden-apps"
          packages={draft.hiddenApps}
          onChange={(hiddenApps) => setDraft((prev) => ({ ...prev, hiddenApps }))}
          placeholder="com.example.hidden"
        />
        <AppListEditor
          label={t("policy.suspendedApps")}
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
        {saving ? t("actions.saving") : t("policy.save")}
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
