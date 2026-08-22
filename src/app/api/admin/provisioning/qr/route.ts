import { NextRequest, NextResponse } from "next/server";
import { requireOperatorJson } from "@/lib/operator-auth";
import { createProvisioningQr } from "@/lib/provisioning";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const record = body as Record<string, unknown>;
    const deviceId =
      typeof record.deviceId === "string" ? record.deviceId : undefined;
    const leaveAllSystemAppsEnabled =
      typeof record.leaveAllSystemAppsEnabled === "boolean"
        ? record.leaveAllSystemAppsEnabled
        : undefined;

    const result = await createProvisioningQr({
      deviceId,
      leaveAllSystemAppsEnabled,
    });

    return NextResponse.json({
      success: true,
      extras: result.extras,
      payload: result.payload,
      checksum: result.checksum,
      checksumSource: result.checksumSource,
      qrDataUrl: result.qrDataUrl,
    });
  } catch (error) {
    console.error("[provisioning/qr] failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate provisioning QR",
      },
      { status: 500 }
    );
  }
}
