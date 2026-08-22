"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
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
        setError(body.error ?? "Login failed");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/devices");
    } catch {
      setError("Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel login-card" onSubmit={(event) => void submit(event)}>
      <header className="panel-head">
        <h2>Operator sign-in</h2>
        <span>Shared password gate</span>
      </header>
      <label className="pkg-field">
        Password
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
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
