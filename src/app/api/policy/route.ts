import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Policy, PolicyResponse } from "@/types/mdm";

const DEFAULT_POLICY: PolicyResponse = {
  disableCamera: false,
  disableFactoryReset: true,
  disableSafeBoot: true,
  disableUsbDebugging: false,
  kioskMode: false,
  kioskPackage: "",
  hiddenApps: [],
  suspendedApps: [],
};

function toPolicyResponse(policy: Policy): PolicyResponse {
  return {
    disableCamera: policy.disable_camera,
    disableFactoryReset: policy.disable_factory_reset,
    disableSafeBoot: policy.disable_safe_boot,
    disableUsbDebugging: policy.disable_usb_debugging,
    kioskMode: policy.kiosk_mode,
    kioskPackage: policy.kiosk_package ?? "",
    hiddenApps: policy.hidden_apps ?? [],
    suspendedApps: policy.suspended_apps ?? [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim();

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "deviceId query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existingPolicy, error: fetchError } = await supabase
      .from("policies")
      .select("*")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (fetchError) {
      console.error("[policy] fetch failed:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch policy" },
        { status: 500 }
      );
    }

    if (existingPolicy) {
      return NextResponse.json(toPolicyResponse(existingPolicy), {
        status: 200,
      });
    }

    const now = new Date().toISOString();
    const { data: createdPolicy, error: createError } = await supabase
      .from("policies")
      .insert({
        device_id: deviceId,
        disable_camera: DEFAULT_POLICY.disableCamera,
        disable_factory_reset: DEFAULT_POLICY.disableFactoryReset,
        disable_safe_boot: DEFAULT_POLICY.disableSafeBoot,
        disable_usb_debugging: DEFAULT_POLICY.disableUsbDebugging,
        kiosk_mode: DEFAULT_POLICY.kioskMode,
        kiosk_package: DEFAULT_POLICY.kioskPackage,
        hidden_apps: DEFAULT_POLICY.hiddenApps,
        suspended_apps: DEFAULT_POLICY.suspendedApps,
        updated_at: now,
      })
      .select("*")
      .maybeSingle();

    if (createError) {
      // Race: another request may have inserted the same device_id.
      if (createError.code === "23505") {
        const { data: racedPolicy, error: retryError } = await supabase
          .from("policies")
          .select("*")
          .eq("device_id", deviceId)
          .maybeSingle();

        if (retryError || !racedPolicy) {
          console.error("[policy] race retry failed:", retryError);
          return NextResponse.json(DEFAULT_POLICY, { status: 200 });
        }

        return NextResponse.json(toPolicyResponse(racedPolicy), {
          status: 200,
        });
      }

      console.error("[policy] auto-create failed:", createError);
      // Still return defaults so the device can continue operating.
      return NextResponse.json(DEFAULT_POLICY, { status: 200 });
    }

    if (createdPolicy) {
      return NextResponse.json(toPolicyResponse(createdPolicy), {
        status: 200,
      });
    }

    return NextResponse.json(DEFAULT_POLICY, { status: 200 });
  } catch (error) {
    console.error("[policy] unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
