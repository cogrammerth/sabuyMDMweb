"use client";

import { useState } from "react";

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

const TOGGLES: Array<{ key: keyof Omit<PolicyDraft, "kioskPackage">; label: string; hint: string }> = [
  { key: "disableCamera", label: "Disable camera", hint: "DevicePolicyManager camera restriction" },
  { key: "disableFactoryReset", label: "Disable factory reset", hint: "Blocks wipe / FRP bypass" },
  { key: "disableSafeBoot", label: "Disable safe boot", hint: "Blocks safe-mode DPC bypass" },
  { key: "disableUsbDebugging", label: "Disable USB debugging", hint: "ADB off when tightened" },
  { key: "kioskMode", label: "Kiosk / locktask", hint: "Requires a launchable package" },
];

export default function PolicyToggles() {
  const [draft, setDraft] = useState<PolicyDraft>(INITIAL);
  const kioskInvalid = draft.kioskMode && draft.kioskPackage.trim() === "";

  return (
    <section className="panel" data-testid="policy-toggles">
      <header className="panel-head">
        <h2>Remote policy</h2>
        <span>Preview — write path lands with operator auth</span>
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
        Kiosk package
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
    </section>
  );
}
