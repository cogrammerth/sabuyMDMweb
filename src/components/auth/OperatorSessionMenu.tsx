"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/context/LanguageContext";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { getSupabasePublicEnv } from "@/lib/supabase-env";
import { signOutOperator } from "@/lib/operator-session";

export default function OperatorSessionMenu() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getSupabasePublicEnv()) return;
    let cancelled = false;
    const supabase = createBrowserSupabase();

    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setBusy(true);
    await signOutOperator();
    router.replace("/login");
    router.refresh();
  }

  if (!email) return null;

  return (
    <div className="session-menu" data-testid="operator-session">
      <span className="session-email" data-testid="operator-email-display" title={email}>
        {email}
      </span>
      <button
        type="button"
        className="session-signout"
        data-testid="header-sign-out"
        data-i18n="auth.signOut"
        disabled={busy}
        onClick={() => void signOut()}
      >
        {t("auth.signOut")}
      </button>
    </div>
  );
}
