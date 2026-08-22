import { NextResponse } from "next/server";
import { requireOperatorJson } from "@/lib/operator-auth";
import {
  getProvisioningConfig,
  resolveApkChecksum,
} from "@/lib/provisioning";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    const config = getProvisioningConfig();
    const { checksum, source } = await resolveApkChecksum(config.apkUrl);
    return NextResponse.json({
      success: true,
      config,
      checksum,
      checksumSource: source,
    });
  } catch (error) {
    console.error("[provisioning/config] failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve provisioning config",
        config: getProvisioningConfig(),
      },
      { status: 503 }
    );
  }
}
