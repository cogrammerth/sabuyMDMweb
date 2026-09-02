import { NextRequest, NextResponse } from "next/server";
import { listAppVersions, getActiveAppVersion, DEFAULT_VERSION_INFO } from "@/lib/app-versions";
import { requireOperatorJson } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    const [active, releases] = await Promise.all([
      getActiveAppVersion(),
      listAppVersions(),
    ]);
    return NextResponse.json({
      success: true,
      active,
      releases,
      fallback: active === null ? DEFAULT_VERSION_INFO : null,
    });
  } catch (error) {
    console.error("[admin/releases] list failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list releases" },
      { status: 500 }
    );
  }
}
