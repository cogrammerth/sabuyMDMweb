import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

export async function createServerSupabaseClient() {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error("SUPABASE_AUTH_NOT_CONFIGURED");
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* Called from a Server Component — middleware refreshes the session. */
        }
      },
    },
  });
}
