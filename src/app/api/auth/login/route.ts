import { NextRequest, NextResponse } from "next/server";
import {
  createOperatorSessionToken,
  OPERATOR_COOKIE,
  operatorCookieOptions,
  operatorGateMode,
  verifyOperatorPassword,
} from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const mode = operatorGateMode();
  if (mode === "open-dev") {
    return NextResponse.json({
      success: true,
      mode,
      message: "Operator gate is open in development",
    });
  }
  if (mode === "misconfigured-prod") {
    return NextResponse.json(
      {
        success: false,
        error: "Operator gate is not configured (set OPERATOR_PASSWORD)",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? String((body as { password?: unknown }).password ?? "")
      : "";

  if (!verifyOperatorPassword(password)) {
    return NextResponse.json(
      { success: false, error: "Invalid operator password" },
      { status: 401 }
    );
  }

  const token = await createOperatorSessionToken();
  const response = NextResponse.json({ success: true, mode: "required" });
  response.cookies.set(OPERATOR_COOKIE, token, operatorCookieOptions());
  return response;
}
