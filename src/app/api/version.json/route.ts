import { NextResponse } from "next/server";
import type { VersionInfo } from "@/types/mdm";

const VERSION_INFO: VersionInfo = {
  versionCode: 1,
  versionName: "1.0.0",
  apkUrl: "https://mdmweb.sabuycall.net/apk/sabuy-mdm.apk",
  isMandatory: false,
};

/**
 * GET /api/version.json
 * APK version metadata for Android background silent auto-updates.
 */
export async function GET() {
  try {
    return NextResponse.json(VERSION_INFO, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[version.json] unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
