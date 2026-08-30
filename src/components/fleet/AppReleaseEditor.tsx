"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/context/LanguageContext";
import type { AppVersionRecord, VersionInfo } from "@/types/mdm";

type LoadState = {
  active: AppVersionRecord | null;
  fallback: VersionInfo | null;
};

export default function AppReleaseEditor() {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const [versionCode, setVersionCode] = useState("2");
  const [versionName, setVersionName] = useState("1.1.0");
  const [apkUrl, setApkUrl] = useState("https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk");
  const [isMandatory, setIsMandatory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/app-version", { cache: "no-store" });
        const body = (await res.json()) as {
          success?: boolean;
          active?: AppVersionRecord | null;
          fallback?: VersionInfo | null;
        };
        if (cancelled || !res.ok || body.success === false) return;
        setLoaded({
          active: body.active ?? null,
          fallback: body.fallback ?? null,
        });
        const seed = body.active ?? body.fallback;
        if (seed) {
          setVersionName(seed.versionName);
          setApkUrl(seed.apkUrl);
          setIsMandatory(seed.isMandatory);
          setVersionCode(
            String(
              body.active
                ? body.active.versionCode
                : (body.fallback?.versionCode ?? 1) + 1
            )
          );
        }
      } catch {
        /* keep defaults */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function publish() {
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const res = await fetch("/api/admin/app-version", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionCode: Number(versionCode),
          versionName: versionName.trim(),
          apkUrl: apkUrl.trim(),
          isMandatory,
        }),
      });
      const body = (await res.json()) as {
        success?: boolean;
        error?: string;
        version?: AppVersionRecord;
      };
      if (!res.ok || body.success === false) {
        setError(body.error ?? t("settings.publishFailed"));
        return;
      }
      if (body.version) {
        setLoaded({ active: body.version, fallback: null });
      }
      setToast(t("settings.published"));
    } catch {
      setError(t("settings.publishFailed"));
    } finally {
      setSaving(false);
    }
  }

  const current = loaded?.active ?? loaded?.fallback;

  return (
    <section className="panel" data-testid="app-release-editor">
      <header className="panel-head">
        <h2 data-i18n="nav.appReleases">{t("nav.appReleases")}</h2>
        <span data-i18n="settings.releaseSubtitle">{t("settings.releaseSubtitle")}</span>
      </header>

      {current ? (
        <div className="release-current" data-testid="app-release-current">
          <p className="hint">
            {t("settings.currentChannel")}{" "}
            <strong>
              {current.versionName} ({current.versionCode})
            </strong>
            {loaded?.active ? null : ` · ${t("settings.fallbackNote")}`}
          </p>
          <p className="hint mono">{current.apkUrl}</p>
        </div>
      ) : null}

      <div className="form-grid">
        <label>
          {t("settings.versionCode")}
          <input
            type="number"
            min={1}
            step={1}
            value={versionCode}
            onChange={(event) => setVersionCode(event.target.value)}
            data-testid="app-release-version-code"
          />
        </label>
        <label>
          {t("settings.versionName")}
          <input
            type="text"
            value={versionName}
            onChange={(event) => setVersionName(event.target.value)}
            data-testid="app-release-version-name"
          />
        </label>
        <label className="span-2">
          {t("settings.apkUrl")}
          <input
            type="url"
            value={apkUrl}
            onChange={(event) => setApkUrl(event.target.value)}
            data-testid="app-release-apk-url"
          />
        </label>
        <label className="toggle-inline">
          <input
            type="checkbox"
            checked={isMandatory}
            onChange={(event) => setIsMandatory(event.target.checked)}
            data-testid="app-release-mandatory"
          />
          {t("settings.mandatory")}
        </label>
      </div>

      {error ? <p className="field-error">{error}</p> : null}
      {toast ? (
        <p className="toast" data-testid="app-release-toast">
          {toast}
        </p>
      ) : null}

      <div className="panel-actions">
        <button
          type="button"
          className="primary"
          onClick={() => void publish()}
          disabled={saving}
          data-testid="app-release-publish"
        >
          {saving ? t("settings.publishing") : t("settings.publish")}
        </button>
      </div>
    </section>
  );
}
