import { NextRequest, NextResponse } from "next/server";
import { issueDeviceToken } from "@/lib/device-auth";
import { requireOperatorJson } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ deviceId: string }>;
};

/**
 * Rotate (or mint) a device bearer token for an already-enrolled unit.
 * Returns plaintext once; only the hash is stored.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    const { deviceId: rawId } = await context.params;
    const deviceId = decodeURIComponent(rawId ?? "").trim();
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "deviceId is required" },
        { status: 400 }
      );
    }

    const deviceToken = await issueDeviceToken(deviceId);
    return NextResponse.json({
      success: true,
      deviceId,
      deviceToken,
      header: "X-Device-Token",
    });
  } catch (error) {
    console.error("[devices/token] rotate failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to rotate device token",
      },
      { status: 500 }
    );
  }
}
