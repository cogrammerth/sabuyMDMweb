import { NextResponse } from "next/server";
import { requireOperatorJson } from "@/lib/operator-auth";
import {
  resolveProvisioningConfig,
  resolveSignatureChecksum,
  getProvisioningConfigSync,
} from "@/lib/provisioning";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireOperatorJson(request);
  if (denied) return denied;

  try {
    const config = await resolveProvisioningConfig();
    const { checksum, source } = await resolveSignatureChecksum(config.apkUrl);
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
        config: getProvisioningConfigSync(),
      },
      { status: 503 }
    );
  }
}
