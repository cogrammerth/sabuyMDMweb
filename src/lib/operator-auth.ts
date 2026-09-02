import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

export type OperatorAuthResult =
  | { ok: true; mode: "session"; email: string | null }
  | { ok: false; status: number; error: string };

export async function authorizeOperator(
  request: NextRequest
): Promise<OperatorAuthResult> {
  const env = getSupabasePublicEnv();
  if (!env) {
    return {
      ok: false,
      status: 503,
      error:
        "Supabase Auth is not configured (set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    };
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        /* Session cookies are refreshed in middleware. */
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Operator authentication required" };
  }

  return { ok: true, mode: "session", email: data.user.email ?? null };
}

export async function requireOperatorJson(
  request: NextRequest
): Promise<NextResponse | null> {
  const result = await authorizeOperator(request);
  if (result.ok) return null;
  return NextResponse.json(
    { success: false, error: result.error },
    { status: result.status }
  );
}
