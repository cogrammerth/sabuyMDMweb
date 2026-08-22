"use client";

import { useCallback, useEffect, useState } from "react";
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
        setError(body.error ?? "Failed to generate QR");
        return;
      }
      setResult(body);
    } catch {
      setResult(null);
      setError("Failed to generate QR");
    } finally {
      setBusy(false);
    }
  }, [deviceId, leaveSystemApps]);

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
    win.document.write(`<!doctype html><html><head><title>Sabuy Zero-Touch QR</title>
      <style>
        body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;gap:1rem;padding:2rem;}
        img{width:360px;height:360px;image-rendering:pixelated;}
        code{font-size:12px;word-break:break-all;}
      </style></head><body>
      <h1>Sabuy MDM Zero-Touch</h1>
      <img src="${result.qrDataUrl}" alt="Provisioning QR" />
      <p>Scan on a factory-reset Android device to become Device Owner.</p>
      ${deviceId.trim() ? `<p>Pre-assigned deviceId: <code>${deviceId.trim()}</code></p>` : ""}
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    win.document.close();
  }

  async function copyJson() {
    if (!result?.payload) return;
    try {
      await navigator.clipboard.writeText(result.payload);
    } catch {
      setError("Could not copy extras JSON");
    }
  }

  return (
    <section className="panel" data-testid="qr-generator">
      <header className="panel-head">
        <h2>Zero-Touch QR</h2>
        <span>
          {result?.checksumSource
            ? `Checksum: ${result.checksumSource}`
            : "Checksum from published APK"}
        </span>
      </header>

      <label className="pkg-field">
        Optional pre-assigned device ID
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
        Leave all system apps enabled
      </label>

      <div className="qr-actions">
        <button
          type="button"
          className="primary"
          onClick={() => void generate()}
          disabled={busy}
          data-testid="qr-generate"
        >
          {busy ? "Encoding…" : "Generate QR"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={downloadPng}
          disabled={!result?.qrDataUrl}
          data-testid="qr-download"
        >
          Download PNG
        </button>
        <button
          type="button"
          className="secondary"
          onClick={printQr}
          disabled={!result?.qrDataUrl}
          data-testid="qr-print"
        >
          Print
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => void copyJson()}
          disabled={!result?.payload}
          data-testid="qr-copy-json"
        >
          Copy JSON
        </button>
      </div>

      {error ? (
        <p className="warn" role="alert" data-testid="qr-error">
          {error}
        </p>
      ) : (
        <p className="hint">
          QR encodes Android Enterprise extras. Checksum is SHA-256 (base64url)
          of the published APK — not typed by hand.
        </p>
      )}

      {result?.qrDataUrl ? (
        <div className="qr-frame" data-testid="qr-preview" aria-label="Provisioning QR">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.qrDataUrl} alt="Zero-Touch provisioning QR code" />
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
