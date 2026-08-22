import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { HeartbeatPayload } from "@/types/mdm";

function isValidHeartbeatPayload(
  body: unknown
): body is HeartbeatPayload {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.deviceId !== "string" || payload.deviceId.trim() === "") {
    return false;
  }

  return true;
}

function hasValidCoordinates(
  latitude: unknown,
  longitude: unknown
): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!isValidHeartbeatPayload(body)) {
      return NextResponse.json(
        { success: false, error: "deviceId is required" },
        { status: 400 }
      );
    }

    const {
      deviceId,
      model,
      androidVersion,
      batteryLevel,
      storageFreeMb,
      latitude,
      longitude,
    } = body;

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { error: upsertError } = await supabase.from("devices").upsert(
      {
        device_id: deviceId,
        model: typeof model === "string" ? model : null,
        android_version:
          typeof androidVersion === "string" ? androidVersion : null,
        battery_level:
          typeof batteryLevel === "number" && Number.isFinite(batteryLevel)
            ? batteryLevel
            : null,
        storage_free_mb:
          typeof storageFreeMb === "number" && Number.isFinite(storageFreeMb)
            ? storageFreeMb
            : null,
        is_online: true,
        last_heartbeat: now,
      },
      { onConflict: "device_id" }
    );

    if (upsertError) {
      console.error("[heartbeat] devices upsert failed:", upsertError);
      return NextResponse.json(
        { success: false, error: "Failed to update device heartbeat" },
        { status: 500 }
      );
    }

    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      hasValidCoordinates(latitude, longitude)
    ) {
      const { error: locationError } = await supabase
        .from("location_logs")
        .insert({
          device_id: deviceId,
          latitude,
          longitude,
        });

      if (locationError) {
        console.error("[heartbeat] location_logs insert failed:", locationError);
        return NextResponse.json(
          { success: false, error: "Failed to record location" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: true, timestamp: Date.now() },
      { status: 200 }
    );
  } catch (error) {
    console.error("[heartbeat] unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
