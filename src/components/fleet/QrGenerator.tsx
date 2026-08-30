"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/context/LanguageContext";
import type { ProvisioningExtras } from "@/types/mdm";

type QrResponse = {
  success: boolean;
  error?: string;
  extras?: ProvisioningExtras;
  payload?: string;
  checksum?: string;
  checksumSource?: string;
  qrDataUrl?: string;
};

export default function QrGenerator() {
  const { t } = useTranslation();
  const [deviceId, setDeviceId] = useState("");
  const [leaveSystemApps, setLeaveSystemApps] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QrResponse | null>(null);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/provisioning/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: deviceId.trim() || undefined,
          leaveAllSystemAppsEnabled: leaveSystemApps,
        }),
      });
      const body = (await res.json()) as QrResponse;
      if (!res.ok || body.success === false) {
        setResult(null);
        setError(body.error ?? t("provisioning.generateFailed"));
        return;
      }
      setResult(body);
    } catch {
      setResult(null);
      setError(t("provisioning.generateFailed"));
    } finally {
      setBusy(false);
    }
  }, [deviceId, leaveSystemApps, t]);

  useEffect(() => {
    void generate();
    // Initial encode only; later runs go through the Generate button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadPng() {
    if (!result?.qrDataUrl) return;
    const link = document.createElement("a");
    link.href = result.qrDataUrl;
    link.download = `sabuy-zt-qr${deviceId.trim() ? `-${deviceId.trim()}` : ""}.png`;
    link.click();
  }

  function printQr() {
    if (!result?.qrDataUrl) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=640,height=720");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${t("provisioning.printTitle")}</title>
      <style>
        body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;gap:1rem;padding:2rem;}
        img{width:360px;height:360px;image-rendering:pixelated;}
        code{font-size:12px;word-break:break-all;}
      </style></head><body>
      <h1>${t("provisioning.printTitle")}</h1>
      <img src="${result.qrDataUrl}" alt="${t("provisioning.qrAlt")}" />
      <p>${t("provisioning.printHint")}</p>
      ${deviceId.trim() ? `<p>deviceId: <code>${deviceId.trim()}</code></p>` : ""}
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    win.document.close();
  }

  async function copyJson() {
    if (!result?.payload) return;
    try {
      await navigator.clipboard.writeText(result.payload);
    } catch {
      setError(t("provisioning.copyFailed"));
    }
  }

  return (
    <section className="panel" data-testid="qr-generator">
      <header className="panel-head">
        <h2 data-i18n="provisioning.qrTitle">{t("provisioning.qrTitle")}</h2>
        <span>
          {result?.checksumSource
            ? t("provisioning.checksumSource", { source: result.checksumSource })
            : t("provisioning.checksumFromApk")}
        </span>
      </header>

      <label className="pkg-field">
        {t("provisioning.deviceIdLabel")}
        <input
          data-testid="qr-device-id"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          placeholder="store-bangkok-01"
        />
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={leaveSystemApps}
          onChange={(event) => setLeaveSystemApps(event.target.checked)}
          data-testid="qr-leave-system-apps"
        />
        {t("provisioning.leaveSystemApps")}
      </label>

      <div className="qr-actions">
        <button
          type="button"
          className="primary"
          onClick={() => void generate()}
          disabled={busy}
          data-testid="qr-generate"
        >
          {busy ? t("provisioning.encoding") : t("provisioning.generate")}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={downloadPng}
          disabled={!result?.qrDataUrl}
          data-testid="qr-download"
        >
          {t("provisioning.download")}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={printQr}
          disabled={!result?.qrDataUrl}
          data-testid="qr-print"
        >
          {t("provisioning.print")}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => void copyJson()}
          disabled={!result?.payload}
          data-testid="qr-copy-json"
        >
          {t("provisioning.copyJson")}
        </button>
      </div>

      {error ? (
        <p className="warn" role="alert" data-testid="qr-error">
          {error}
        </p>
      ) : (
        <p className="hint" data-i18n="provisioning.hint">
          {t("provisioning.hint")}
        </p>
      )}

      {result?.qrDataUrl ? (
        <div className="qr-frame" data-testid="qr-preview" aria-label={t("provisioning.qrAlt")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.qrDataUrl} alt={t("provisioning.qrAlt")} />
        </div>
      ) : null}

      {result?.extras ? (
        <textarea
          data-testid="qr-extras"
          readOnly
          value={JSON.stringify(result.extras, null, 2)}
          rows={12}
          spellCheck={false}
        />
      ) : null}
    </section>
  );
}
