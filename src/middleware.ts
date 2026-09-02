import { NextRequest, NextResponse } from "next/server";
import { authorizeOperator } from "@/lib/operator-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminApi = pathname.startsWith("/api/admin");
  const result = await authorizeOperator(request);

  if (result.ok) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    );
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/",
    "/admin",
    "/admin/:path*",
    "/office",
    "/devices",
    "/devices/:path*",
    "/map",
    "/map/:path*",
    "/provisioning",
    "/provisioning/:path*",
    "/settings",
    "/settings/:path*",
    "/api/admin/:path*",
  ],
};
