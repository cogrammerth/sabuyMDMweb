import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code || !getSupabasePublicEnv()) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  } catch {
    /* fall through to login */
  }

  return NextResponse.redirect(new URL("/login?error=auth", origin));
}
