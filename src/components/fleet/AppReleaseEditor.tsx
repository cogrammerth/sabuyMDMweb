"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/context/LanguageContext";
import type { AppVersionRecord, VersionInfo } from "@/types/mdm";

type LoadState = {
  active: AppVersionRecord | null;
  fallback: VersionInfo | null;
  releases: AppVersionRecord[];
};

function withActive(releases: AppVersionRecord[], active: AppVersionRecord): AppVersionRecord[] {
  const others = releases
    .filter((row) => row.versionCode !== active.versionCode)
    .map((row) => ({ ...row, isActive: false }));
  return [{ ...active, isActive: true }, ...others].sort((a, b) => b.versionCode - a.versionCode);
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AppReleaseEditor() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const [versionCode, setVersionCode] = useState("2");
  const [versionName, setVersionName] = useState("1.1.0");
  const [apkUrl, setApkUrl] = useState("https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk");
  const [isMandatory, setIsMandatory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyLoaded = useCallback((state: LoadState) => {
    setLoaded(state);
    const seed = state.active ?? state.fallback;
    if (seed) {
      setVersionName(seed.versionName);
      setApkUrl(seed.apkUrl);
      setIsMandatory(seed.isMandatory);
      setVersionCode(
        String(state.active ? state.active.versionCode : (state.fallback?.versionCode ?? 1) + 1)
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/releases", { cache: "no-store" });
        const body = (await res.json()) as {
          success?: boolean;
          active?: AppVersionRecord | null;
          fallback?: VersionInfo | null;
          releases?: AppVersionRecord[];
        };
        if (cancelled || !res.ok || body.success === false) return;
        applyLoaded({
          active: body.active ?? null,
          fallback: body.fallback ?? null,
          releases: body.releases ?? [],
        });
      } catch {
        /* keep defaults */
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [applyLoaded]);

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
        applyLoaded({
          active: body.version,
          fallback: null,
          releases: withActive(loaded?.releases ?? [], body.version),
        });
      }
      setToast(t("settings.published"));
    } catch {
      setError(t("settings.publishFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function activate(row: AppVersionRecord) {
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const res = await fetch("/api/admin/app-version", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionCode: row.versionCode,
          versionName: row.versionName,
          apkUrl: row.apkUrl,
          isMandatory: row.isMandatory,
          packageName: row.packageName,
          fileSizeBytes: row.fileSizeBytes,
          sha256: row.sha256,
          storagePath: row.storagePath,
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
        applyLoaded({
          active: body.version,
          fallback: null,
          releases: withActive(loaded?.releases ?? [], body.version),
        });
      }
      setToast(t("settings.activated"));
    } catch {
      setError(t("settings.publishFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    setToast(null);
    try {
      const form = new FormData();
      form.set("apk", file);
      form.set("isMandatory", isMandatory ? "true" : "false");
      const res = await fetch("/api/admin/releases/upload", {
        method: "POST",
        body: form,
      });
      const body = (await res.json()) as {
        success?: boolean;
        error?: string;
        version?: AppVersionRecord;
      };
      if (!res.ok || body.success === false) {
        setError(body.error ?? t("settings.uploadFailed"));
        return;
      }
      if (body.version) {
        applyLoaded({
          active: body.version,
          fallback: null,
          releases: withActive(loaded?.releases ?? [], body.version),
        });
        setToast(t("settings.uploaded"));
      }
    } catch {
      setError(t("settings.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  const current = loaded?.active ?? loaded?.fallback;
  const releases = loaded?.releases ?? [];

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

      <div
        className={`apk-dropzone${dragOver ? " drag" : ""}`}
        data-testid="apk-upload-zone"
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) void uploadFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <p className="apk-dropzone-title" data-i18n="settings.uploadTitle">
          {t("settings.uploadTitle")}
        </p>
        <p className="hint" data-i18n="settings.uploadHint">
          {uploading ? t("settings.uploading") : t("settings.uploadHint")}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          hidden
          data-testid="apk-upload-input"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void uploadFile(file);
          }}
        />
      </div>

      <div className="release-list" data-testid="release-list">
        <h3 data-i18n="settings.releasesTitle">{t("settings.releasesTitle")}</h3>
        {releases.length === 0 ? (
          <p className="hint" data-i18n="settings.releasesEmpty">
            {t("settings.releasesEmpty")}
          </p>
        ) : (
          releases.map((row) => (
            <article
              key={row.id}
              className={`release-row${row.isActive ? " active" : ""}`}
              data-testid={`release-row-${row.versionCode}`}
            >
              <div>
                <strong>
                  {row.versionName} ({row.versionCode})
                </strong>
                {row.isActive ? (
                  <span className="status-badge on">{t("settings.activeBadge")}</span>
                ) : null}
                <p className="hint">
                  {[row.packageName, formatBytes(row.fileSizeBytes)].filter(Boolean).join(" · ")}
                </p>
              </div>
              {!row.isActive ? (
                <button
                  type="button"
                  className="secondary"
                  data-testid={`release-activate-${row.versionCode}`}
                    onClick={() => void activate(row)}
                >
                  {t("settings.activate")}
                </button>
              ) : null}
            </article>
          ))
        )}
      </div>

      <h3 className="release-url-title" data-i18n="settings.publishByUrl">
        {t("settings.publishByUrl")}
      </h3>
      <p className="hint" data-i18n="settings.publishByUrlHint">
        {t("settings.publishByUrlHint")}
      </p>

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
          disabled={saving || uploading}
          data-testid="app-release-publish"
        >
          {saving ? t("settings.publishing") : t("settings.publish")}
        </button>
      </div>
    </section>
  );
}
