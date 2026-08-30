"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/context/LanguageContext";

export default function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/devices";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || body.success === false) {
        setError(body.error ?? t("login.failed"));
        return;
      }
      router.replace(next.startsWith("/") ? next : "/devices");
    } catch {
      setError(t("login.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel login-card" data-testid="login-form" onSubmit={(event) => void submit(event)}>
      <header className="panel-head">
        <h2 data-i18n="login.signInTitle">{t("login.signInTitle")}</h2>
        <span data-i18n="login.signInSubtitle">{t("login.signInSubtitle")}</span>
      </header>
      <label className="pkg-field">
        {t("login.password")}
        <input
          data-testid="operator-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </label>
      {error ? (
        <p className="warn" role="alert">
          {error}
        </p>
      ) : null}
      <button className="primary" type="submit" disabled={busy} data-testid="operator-login">
        {busy ? t("login.submitting") : t("login.submit")}
      </button>
    </form>
  );
}
