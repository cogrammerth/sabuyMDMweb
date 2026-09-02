import { createBrowserSupabase } from "@/lib/supabase-browser";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

export async function signOutOperator(): Promise<void> {
  try {
    if (getSupabasePublicEnv()) {
      const supabase = createBrowserSupabase();
      await supabase.auth.signOut();
    }
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* still leave the session UI */
  }
}
