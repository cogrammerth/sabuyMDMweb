import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSupabasePublicEnv } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!getSupabasePublicEnv()) {
    return NextResponse.json({ success: true });
  }

  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    /* still report success so the client can leave the session UI */
  }

  return NextResponse.json({ success: true });
}
