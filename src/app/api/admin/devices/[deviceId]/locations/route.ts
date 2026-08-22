import { NextRequest, NextResponse } from "next/server";
import { listDeviceLocations } from "@/lib/locations";
import { requireOperatorJson } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ deviceId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    const { deviceId } = await context.params;
    const id = decodeURIComponent(deviceId ?? "").trim();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "deviceId is required" },
        { status: 400 }
      );
    }

    const locations = await listDeviceLocations(id);
    return NextResponse.json({
      success: true,
      deviceId: id,
      locations,
    });
  } catch (error) {
    console.error("[admin/devices/:id/locations] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list device locations" },
      { status: 500 }
    );
  }
}
