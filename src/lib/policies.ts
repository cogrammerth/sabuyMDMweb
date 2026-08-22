import { getSupabaseAdmin } from "@/lib/supabase";
import type { Policy, PolicyResponse, PolicyWriteInput } from "@/types/mdm";

export const DEFAULT_POLICY: PolicyResponse = {
  disableCamera: false,
  disableFactoryReset: true,
  disableSafeBoot: true,
  disableUsbDebugging: false,
  kioskMode: false,
  kioskPackage: "",
  hiddenApps: [],
  suspendedApps: [],
};

export function toPolicyResponse(policy: Policy): PolicyResponse {
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

export function toPolicyInsert(deviceId: string, policy: PolicyResponse) {
  return {
    device_id: deviceId,
    disable_camera: policy.disableCamera,
    disable_factory_reset: policy.disableFactoryReset,
    disable_safe_boot: policy.disableSafeBoot,
    disable_usb_debugging: policy.disableUsbDebugging,
    kiosk_mode: policy.kioskMode,
    kiosk_package: policy.kioskPackage,
    hidden_apps: policy.hiddenApps,
    suspended_apps: policy.suspendedApps,
    updated_at: new Date().toISOString(),
  };
}

function asBoolean(value: unknown, fallback: boolean): boolean | { error: string } {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  return { error: "Policy flags must be booleans" };
}

function asPackageList(value: unknown, field: string): string[] | { error: string } {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    return { error: `${field} must be an array of package names` };
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      return { error: `${field} must be an array of package names` };
    }
    const pkg = item.trim();
    if (!pkg || seen.has(pkg)) continue;
    seen.add(pkg);
    out.push(pkg);
  }
  return out;
}

export type PolicyValidation =
  | { ok: true; policy: PolicyResponse }
  | { ok: false; error: string };

/**
 * Merge a write body onto defaults and enforce the locktask invariant:
 * kioskMode true requires a non-empty kioskPackage.
 */
export function validatePolicyWrite(input: PolicyWriteInput): PolicyValidation {
  const disableCamera = asBoolean(input.disableCamera, DEFAULT_POLICY.disableCamera);
  if (typeof disableCamera !== "boolean") return { ok: false, error: disableCamera.error };

  const disableFactoryReset = asBoolean(
    input.disableFactoryReset,
    DEFAULT_POLICY.disableFactoryReset
  );
  if (typeof disableFactoryReset !== "boolean") {
    return { ok: false, error: disableFactoryReset.error };
  }

  const disableSafeBoot = asBoolean(
    input.disableSafeBoot,
    DEFAULT_POLICY.disableSafeBoot
  );
  if (typeof disableSafeBoot !== "boolean") {
    return { ok: false, error: disableSafeBoot.error };
  }

  const disableUsbDebugging = asBoolean(
    input.disableUsbDebugging,
    DEFAULT_POLICY.disableUsbDebugging
  );
  if (typeof disableUsbDebugging !== "boolean") {
    return { ok: false, error: disableUsbDebugging.error };
  }

  const kioskMode = asBoolean(input.kioskMode, DEFAULT_POLICY.kioskMode);
  if (typeof kioskMode !== "boolean") return { ok: false, error: kioskMode.error };

  if (input.kioskPackage !== undefined && typeof input.kioskPackage !== "string") {
    return { ok: false, error: "kioskPackage must be a string" };
  }
  const kioskPackage =
    typeof input.kioskPackage === "string"
      ? input.kioskPackage.trim()
      : DEFAULT_POLICY.kioskPackage;

  const hiddenApps = asPackageList(input.hiddenApps, "hiddenApps");
  if (!Array.isArray(hiddenApps)) return { ok: false, error: hiddenApps.error };

  const suspendedApps = asPackageList(input.suspendedApps, "suspendedApps");
  if (!Array.isArray(suspendedApps)) return { ok: false, error: suspendedApps.error };

  if (kioskMode && kioskPackage === "") {
    return {
      ok: false,
      error: "kioskPackage is required when kioskMode is true",
    };
  }

  return {
    ok: true,
    policy: {
      disableCamera,
      disableFactoryReset,
      disableSafeBoot,
      disableUsbDebugging,
      kioskMode,
      kioskPackage,
      hiddenApps,
      suspendedApps,
    },
  };
}

export async function getPolicy(deviceId: string): Promise<PolicyResponse | null> {
  const id = deviceId.trim();
  if (!id) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("device_id", id)
    .maybeSingle();

  if (error) {
    console.error("[policies] fetch failed:", error);
    throw new Error("Failed to fetch policy");
  }

  return data ? toPolicyResponse(data as Policy) : null;
}

export async function upsertPolicy(
  deviceId: string,
  input: PolicyWriteInput
): Promise<PolicyResponse> {
  const parsed = validatePolicyWrite(input);
  if (!parsed.ok) {
    const err = new Error(parsed.error);
    err.name = "PolicyValidationError";
    throw err;
  }

  const id = deviceId.trim();
  if (!id) {
    const err = new Error("deviceId is required");
    err.name = "PolicyValidationError";
    throw err;
  }

  const supabase = getSupabaseAdmin();
  const row = toPolicyInsert(id, parsed.policy);
  const { data, error } = await supabase
    .from("policies")
    .upsert(row, { onConflict: "device_id" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[policies] upsert failed:", error);
    throw new Error("Failed to save policy");
  }

  if (data) return toPolicyResponse(data as Policy);
  return parsed.policy;
}
