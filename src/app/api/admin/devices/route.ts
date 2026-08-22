import { NextRequest, NextResponse } from "next/server";
import { listDevices, summarizeFleet } from "@/lib/devices";
import { requireOperatorJson } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    const devices = await listDevices();
    return NextResponse.json({
      success: true,
      devices,
      summary: summarizeFleet(devices),
    });
  } catch (error) {
    console.error("[admin/devices] list failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list devices" },
      { status: 500 }
    );
  }
}
