"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/context/LanguageContext";
import { authErrorKey } from "@/lib/auth-errors";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

export default function ResetPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!getSupabasePublicEnv()) {
      setReady(true);
      setHasSession(false);
      return;
    }
    let cancelled = false;
    const supabase = createBrowserSupabase();
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setHasSession(Boolean(data.user));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!password || !confirm) {
      setError(t("auth.required"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.weakPassword"));
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(t(authErrorKey(updateError)));
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(t(authErrorKey(caught)));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <p className="hint" data-i18n="login.loading">
        {t("login.loading")}
      </p>
    );
  }

  if (!hasSession) {
    return (
      <div className="panel login-card" data-testid="reset-password-invalid">
        <header className="panel-head">
          <h2 data-i18n="auth.resetTitle">{t("auth.resetTitle")}</h2>
        </header>
        <p className="warn" role="alert" data-i18n="auth.invalidLink">
          {t("auth.invalidLink")}
        </p>
        <p className="auth-links">
          <Link href="/forgot-password" data-i18n="auth.forgotPassword">
            {t("auth.forgotPassword")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="panel login-card"
      data-testid="reset-password-form"
      onSubmit={(event) => void submit(event)}
    >
      <header className="panel-head">
        <h2 data-i18n="auth.resetTitle">{t("auth.resetTitle")}</h2>
        <span data-i18n="auth.resetSubtitle">{t("auth.resetSubtitle")}</span>
      </header>
      <label className="pkg-field">
        <span data-i18n="auth.newPassword">{t("auth.newPassword")}</span>
        <input
          data-testid="reset-password"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <label className="pkg-field">
        <span data-i18n="auth.confirmPassword">{t("auth.confirmPassword")}</span>
        <input
          data-testid="reset-password-confirm"
          type="password"
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
      </label>
      {error ? (
        <p className="warn" role="alert" data-testid="auth-error">
          {error}
        </p>
      ) : null}
      <button
        className="primary"
        type="submit"
        disabled={busy}
        data-testid="reset-submit"
      >
        {busy ? t("auth.resetSubmitting") : t("auth.resetSubmit")}
      </button>
    </form>
  );
}
