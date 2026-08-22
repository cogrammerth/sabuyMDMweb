import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/mdm";

function getSupabaseEnv(): { url: string; serviceRoleKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url === "your-supabase-url") {
    throw new Error(
      "Missing or invalid NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local."
    );
  }

  if (!serviceRoleKey || serviceRoleKey === "your-supabase-service-role-key") {
    throw new Error(
      "Missing or invalid SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local."
    );
  }

  return { url, serviceRoleKey };
}

/**
 * Typed Supabase admin client using the service role key.
 * Use only on the server (API routes / Server Components) — never expose to the browser.
 */
export function createSupabaseAdmin(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = getSupabaseEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** Singleton admin client for API routes. */
let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!adminClient) {
    adminClient = createSupabaseAdmin();
  }
  return adminClient;
}
