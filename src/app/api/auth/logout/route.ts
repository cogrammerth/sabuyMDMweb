import { NextResponse } from "next/server";
import { OPERATOR_COOKIE } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(OPERATOR_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
