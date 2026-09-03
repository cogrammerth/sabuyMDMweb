import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const DEVICE_TOKEN_HEADER = "x-device-token";

export type DeviceAuthResult =
  | { ok: true; mode: "legacy" | "token" }
  | { ok: false; status: number; error: string };

function isDeviceAuthRequired(): boolean {
  const raw = process.env.DEVICE_AUTH_REQUIRED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function generateDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceToken(token: string): string {
  const pepper = process.env.DEVICE_TOKEN_PEPPER?.trim() ?? "";
  return createHash("sha256").update(`${pepper}${token}`).digest("hex");
}

function tokensMatch(expectedHash: string, presentedToken: string): boolean {
  const presentedHash = hashDeviceToken(presentedToken);
  try {
    const a = Buffer.from(expectedHash, "utf8");
    const b = Buffer.from(presentedHash, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function readDeviceTokenHeader(request: NextRequest): string | null {
  const raw = request.headers.get(DEVICE_TOKEN_HEADER)?.trim();
  return raw || null;
}

/**
 * Soft (default): devices without a stored hash stay open (legacy fleet).
 * Hard (`DEVICE_AUTH_REQUIRED=true`): every heartbeat/policy call needs a matching token.
 */
export async function authorizeDevice(
  request: NextRequest,
  deviceId: string
): Promise<DeviceAuthResult> {
  const id = deviceId.trim();
  if (!id) {
    return { ok: false, status: 400, error: "deviceId is required" };
  }

  const presented = readDeviceTokenHeader(request);
  const required = isDeviceAuthRequired();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("devices")
    .select("device_token_hash")
    .eq("device_id", id)
    .maybeSingle();

  if (error) {
    // Column missing (migration not applied) — fail open like other optional columns.
    if (
      error.code === "42703" ||
      error.code === "PGRST204" ||
      /device_token_hash/i.test(error.message ?? "")
    ) {
      if (required) {
        return {
          ok: false,
          status: 503,
          error: "Device authentication schema is not applied",
        };
      }
      return { ok: true, mode: "legacy" };
    }
    console.error("[device-auth] lookup failed:", error);
    return { ok: false, status: 500, error: "Failed to authorize device" };
  }

  const storedHash =
    data && typeof data.device_token_hash === "string"
      ? data.device_token_hash
      : null;

  if (!storedHash) {
    if (required) {
      return {
        ok: false,
        status: 401,
        error: "Device authentication required",
      };
    }
    return { ok: true, mode: "legacy" };
  }

  if (!presented || !tokensMatch(storedHash, presented)) {
    return {
      ok: false,
      status: 401,
      error: "Device authentication required",
    };
  }

  return { ok: true, mode: "token" };
}

export async function requireDeviceJson(
  request: NextRequest,
  deviceId: string
): Promise<NextResponse | null> {
  const result = await authorizeDevice(request, deviceId);
  if (result.ok) return null;
  return NextResponse.json(
    { success: false, error: result.error },
    { status: result.status }
  );
}

/** Upsert device_id with a new token hash (QR provision or rotate). */
export async function persistDeviceTokenHash(
  deviceId: string,
  tokenHash: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase.from("devices").upsert(
    {
      device_id: deviceId,
      device_token_hash: tokenHash,
      device_token_issued_at: now,
    },
    { onConflict: "device_id" }
  );

  if (!error) return;

  if (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /device_token_hash|device_token_issued_at/i.test(error.message ?? "")
  ) {
    console.warn(
      "[device-auth] device_token columns missing — apply supabase/migrations/004_device_tokens.sql"
    );
    // Still create the device row without the hash so QR enroll does not hard-fail.
    const { error: fallbackError } = await supabase.from("devices").upsert(
      { device_id: deviceId },
      { onConflict: "device_id" }
    );
    if (fallbackError) {
      console.error("[device-auth] fallback device upsert failed:", fallbackError);
      throw new Error("Failed to store device token");
    }
    return;
  }

  console.error("[device-auth] persist token failed:", error);
  throw new Error("Failed to store device token");
}

/** Issue a fresh plaintext token and persist its hash. */
export async function issueDeviceToken(deviceId: string): Promise<string> {
  const token = generateDeviceToken();
  await persistDeviceTokenHash(deviceId, hashDeviceToken(token));
  return token;
}
