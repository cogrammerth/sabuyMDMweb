"use client";

import { useState } from "react";
import { useTranslation } from "@/context/LanguageContext";

export default function DeviceNameCell({
  deviceId,
  initialName,
}: {
  deviceId: string;
  initialName: string | null;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor() {
    setDraft(name ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setDraft(name ?? "");
    setError(null);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/devices/${encodeURIComponent(deviceId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceName: draft.trim() || null }),
        }
      );
      const body = (await res.json()) as {
        success?: boolean;
        error?: string;
        device?: { deviceName?: string | null };
      };
      if (!res.ok || body.success === false) {
        setError(body.error ?? t("device.renameFailed"));
        return;
      }
      const next = body.device?.deviceName ?? (draft.trim() || null);
      setName(next);
      setEditing(false);
    } catch {
      setError(t("device.renameFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="name-edit" data-testid={`device-name-edit-${deviceId}`}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("device.friendlyPlaceholder")}
          data-testid={`device-name-input-${deviceId}`}
          disabled={saving}
        />
        <div className="name-edit-actions">
          <button
            type="button"
            className="secondary"
            onClick={cancel}
            disabled={saving}
            data-testid={`device-name-cancel-${deviceId}`}
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => void save()}
            disabled={saving}
            data-testid={`device-name-save-${deviceId}`}
          >
            {saving ? t("actions.saving") : t("actions.save")}
          </button>
        </div>
        {error ? <p className="field-error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="name-display">
      <span data-testid={`device-name-${deviceId}`}>
        {name && name.trim() ? name : "—"}
      </span>
      <button
        type="button"
        className="secondary name-edit-trigger"
        onClick={openEditor}
        data-testid={`device-name-edit-trigger-${deviceId}`}
        aria-label={`${t("actions.rename")} ${deviceId}`}
      >
        {t("actions.rename")}
      </button>
    </div>
  );
}
