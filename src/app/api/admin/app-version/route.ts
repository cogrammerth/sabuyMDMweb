import { NextRequest, NextResponse } from "next/server";
import {
  AppVersionValidationError,
  DEFAULT_VERSION_INFO,
  getActiveAppVersion,
  publishAppVersion,
} from "@/lib/app-versions";
import { requireOperatorJson } from "@/lib/operator-auth";
import type { AppVersionWriteInput } from "@/types/mdm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    const active = await getActiveAppVersion();
    return NextResponse.json({
      success: true,
      active,
      fallback: active === null ? DEFAULT_VERSION_INFO : null,
    });
  } catch (error) {
    console.error("[admin/app-version] get failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch app version" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

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

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const record = await publishAppVersion(body as AppVersionWriteInput);
    return NextResponse.json({ success: true, version: record });
  } catch (error) {
    if (error instanceof AppVersionValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    console.error("[admin/app-version] publish failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to publish app version",
      },
      { status: 500 }
    );
  }
}
