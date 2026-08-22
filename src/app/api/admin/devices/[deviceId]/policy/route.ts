import { NextRequest, NextResponse } from "next/server";
import { upsertPolicy } from "@/lib/policies";
import { requireOperatorJson } from "@/lib/operator-auth";
import type { PolicyWriteInput } from "@/types/mdm";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ deviceId: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
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

    const policy = await upsertPolicy(id, body as PolicyWriteInput);
    return NextResponse.json({ success: true, policy }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === "PolicyValidationError") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    console.error("[admin/policy] save failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save policy" },
      { status: 500 }
    );
  }
}
