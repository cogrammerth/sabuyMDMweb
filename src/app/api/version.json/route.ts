import { NextResponse } from "next/server";
import { DEFAULT_VERSION_INFO, getActiveVersionInfo } from "@/lib/app-versions";

/**
 * GET /api/version.json
 * APK version metadata for Android background silent auto-updates.
 * Reads the active row from app_versions; falls back to DEFAULT_VERSION_INFO.
 */
export async function GET() {
  try {
    const version = await getActiveVersionInfo();
    return NextResponse.json(version, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[version.json] unexpected error:", error);
    return NextResponse.json(DEFAULT_VERSION_INFO, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }
}
