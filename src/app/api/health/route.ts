import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function payload(
  status: "healthy" | "unhealthy",
  database: "connected" | "error"
) {
  return {
    status,
    database,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Light liveness probe for Railway / Cloudflare. Does not require operator
 * auth. Never includes connection strings, keys, or query error details.
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store, max-age=0" };

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("devices")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) {
      console.error("[health] database check failed");
      return NextResponse.json(payload("unhealthy", "error"), {
        status: 503,
        headers,
      });
    }

    return NextResponse.json(payload("healthy", "connected"), {
      status: 200,
      headers,
    });
  } catch {
    console.error("[health] database check threw");
    return NextResponse.json(payload("unhealthy", "error"), {
      status: 503,
      headers,
    });
  }
}
