import { NextRequest, NextResponse } from "next/server";
import { listLatestLocations } from "@/lib/locations";
import { requireOperatorJson } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    const locations = await listLatestLocations();
    return NextResponse.json({
      success: true,
      locations,
    });
  } catch (error) {
    console.error("[admin/locations/latest] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list latest locations" },
      { status: 500 }
    );
  }
}
