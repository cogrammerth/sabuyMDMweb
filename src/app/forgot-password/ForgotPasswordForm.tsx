"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/context/LanguageContext";
import { authErrorKey } from "@/lib/auth-errors";
import { createBrowserSupabase } from "@/lib/supabase-browser";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("auth.required"));
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError(t("auth.invalidEmail"));
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserSupabase();
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        { redirectTo }
      );
      if (resetError) {
        setError(t(authErrorKey(resetError)));
        return;
      }
      setSent(true);
    } catch (caught) {
      setError(t(authErrorKey(caught)));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="panel login-card" data-testid="forgot-password-sent">
        <header className="panel-head">
          <h2 data-i18n="auth.forgotTitle">{t("auth.forgotTitle")}</h2>
        </header>
        <p className="hint" data-i18n="auth.forgotSent">
          {t("auth.forgotSent")}
        </p>
        <p className="auth-links">
          <Link href="/login" data-i18n="auth.backToSignIn">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      className="panel login-card"
      data-testid="forgot-password-form"
      onSubmit={(event) => void submit(event)}
    >
      <header className="panel-head">
        <h2 data-i18n="auth.forgotTitle">{t("auth.forgotTitle")}</h2>
        <span data-i18n="auth.forgotSubtitle">{t("auth.forgotSubtitle")}</span>
      </header>
      <label className="pkg-field">
        <span data-i18n="auth.email">{t("auth.email")}</span>
        <input
          data-testid="forgot-email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
        data-testid="forgot-submit"
      >
        {busy ? t("auth.forgotSubmitting") : t("auth.forgotSubmit")}
      </button>
      <p className="auth-links">
        <Link href="/login" data-i18n="auth.backToSignIn">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
