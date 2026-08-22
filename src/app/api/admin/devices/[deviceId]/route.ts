import { NextRequest, NextResponse } from "next/server";
import {
  DeviceNotFoundError,
  getDevice,
  updateDeviceName,
} from "@/lib/devices";
import { DEFAULT_POLICY, getPolicy } from "@/lib/policies";
import { requireOperatorJson } from "@/lib/operator-auth";
import type { DeviceNameWriteInput } from "@/types/mdm";

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

    const [device, policy] = await Promise.all([getDevice(id), getPolicy(id)]);
    return NextResponse.json({
      success: true,
      device,
      policy: policy ?? DEFAULT_POLICY,
    });
  } catch (error) {
    console.error("[admin/devices/:id] get failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch device" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { deviceName } = body as DeviceNameWriteInput;
    if (deviceName !== undefined && deviceName !== null && typeof deviceName !== "string") {
      return NextResponse.json(
        { success: false, error: "deviceName must be a string or null" },
        { status: 400 }
      );
    }

    const device = await updateDeviceName(id, deviceName ?? null);
    return NextResponse.json({ success: true, device });
  } catch (error) {
    if (error instanceof DeviceNotFoundError) {
      return NextResponse.json(
        { success: false, error: "Device not found" },
        { status: 404 }
      );
    }
    console.error("[admin/devices/:id] patch failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update device" },
      { status: 500 }
    );
  }
}
