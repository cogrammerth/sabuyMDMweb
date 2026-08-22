import { NextRequest, NextResponse } from "next/server";

export const OPERATOR_COOKIE = "sabuy_operator";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type OperatorGateMode = "open-dev" | "required" | "misconfigured-prod";

export function operatorPassword(): string | undefined {
  const value = process.env.OPERATOR_PASSWORD?.trim();
  return value ? value : undefined;
}

export function operatorGateMode(): OperatorGateMode {
  if (operatorPassword()) return "required";
  if (process.env.NODE_ENV === "production") return "misconfigured-prod";
  return "open-dev";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createOperatorSessionToken(): Promise<string> {
  const secret = operatorPassword();
  if (!secret) {
    throw new Error("OPERATOR_PASSWORD is not configured");
  }
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `v1.${exp}`;
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyOperatorSessionToken(
  token: string | undefined
): Promise<boolean> {
  const secret = operatorPassword();
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = await hmacHex(secret, payload);
  return timingSafeEqual(expected, parts[2]);
}

export function verifyOperatorPassword(candidate: string): boolean {
  const secret = operatorPassword();
  if (!secret) return false;
  return timingSafeEqual(secret, candidate);
}

export type OperatorAuthResult =
  | { ok: true; mode: "open-dev" | "session" | "bearer" }
  | { ok: false; status: number; error: string };

export async function authorizeOperator(
  request: NextRequest
): Promise<OperatorAuthResult> {
  const mode = operatorGateMode();
  if (mode === "open-dev") {
    return { ok: true, mode: "open-dev" };
  }
  if (mode === "misconfigured-prod") {
    return {
      ok: false,
      status: 503,
      error: "Operator gate is not configured (set OPERATOR_PASSWORD)",
    };
  }

  const bearer = request.headers.get("authorization");
  const secret = operatorPassword();
  if (secret && bearer?.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    if (timingSafeEqual(secret, token)) {
      return { ok: true, mode: "bearer" };
    }
  }

  const cookie = request.cookies.get(OPERATOR_COOKIE)?.value;
  if (await verifyOperatorSessionToken(cookie)) {
    return { ok: true, mode: "session" };
  }

  return { ok: false, status: 401, error: "Operator authentication required" };
}

export async function requireOperatorJson(
  request: NextRequest
): Promise<NextResponse | null> {
  const result = await authorizeOperator(request);
  if (result.ok) return null;
  return NextResponse.json(
    { success: false, error: result.error },
    { status: result.status }
  );
}

export function operatorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
