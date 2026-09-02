import { NextRequest, NextResponse } from "next/server";
import { parseClientVersionCode } from "@/lib/apk-parse";
import {
  DEFAULT_VERSION_INFO,
  getActiveVersionInfo,
  resolveUpdateAvailable,
} from "@/lib/app-versions";

/**
 * GET /api/version.json
 * APK version metadata for Android background silent auto-updates.
 * Reads the active row from app_versions; falls back to DEFAULT_VERSION_INFO.
 * When currentAppVersionCode is supplied, also returns updateAvailable.
 */
export async function GET(request: NextRequest) {
  try {
    const version = await getActiveVersionInfo();
    const raw = request.nextUrl.searchParams.get("currentAppVersionCode");
    const current = parseClientVersionCode(raw);
    const body =
      raw !== null
        ? {
            ...version,
            updateAvailable: resolveUpdateAvailable(current, version.versionCode),
          }
        : version;
    return NextResponse.json(body, {
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
