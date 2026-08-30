"use client";

import { useState } from "react";
import { useTranslation } from "@/context/LanguageContext";

interface PolicyDraft {
  disableCamera: boolean;
  disableFactoryReset: boolean;
  disableSafeBoot: boolean;
  disableUsbDebugging: boolean;
  kioskMode: boolean;
  kioskPackage: string;
}

const INITIAL: PolicyDraft = {
  disableCamera: false,
  disableFactoryReset: true,
  disableSafeBoot: true,
  disableUsbDebugging: false,
  kioskMode: false,
  kioskPackage: "",
};

const TOGGLES: Array<{
  key: keyof Omit<PolicyDraft, "kioskPackage">;
  labelKey:
    | "policy.disableCamera"
    | "policy.disableFactoryReset"
    | "policy.disableSafeBoot"
    | "policy.disableUsbDebugging"
    | "policy.kioskModePreview";
  hintKey:
    | "policy.disableCameraHint"
    | "policy.disableFactoryResetHint"
    | "policy.disableSafeBootHint"
    | "policy.disableUsbDebuggingHint"
    | "policy.kioskModePreviewHint";
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
    labelKey: "policy.kioskModePreview",
    hintKey: "policy.kioskModePreviewHint",
  },
];

export default function PolicyToggles() {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PolicyDraft>(INITIAL);
  const kioskInvalid = draft.kioskMode && draft.kioskPackage.trim() === "";

  return (
    <section className="panel" data-testid="policy-toggles">
      <header className="panel-head">
        <h2 data-i18n="policy.title">{t("policy.title")}</h2>
        <span data-i18n="policy.previewSubtitle">{t("policy.previewSubtitle")}</span>
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
              <strong>{t(item.labelKey)}</strong>
              <p>{t(item.hintKey)}</p>
            </div>
          </li>
        ))}
      </ul>
      <label className="pkg-field">
        {t("policy.kioskPackageShort")}
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
          {t("policy.kioskInvariant")}
        </p>
      ) : null}
    </section>
  );
}
