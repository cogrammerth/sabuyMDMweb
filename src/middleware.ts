import { NextRequest, NextResponse } from "next/server";
import {
  updateSession,
  withSessionCookies,
} from "@/lib/supabase-middleware";

function pathIs(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isPublicPath(pathname: string): boolean {
  if (pathIs(pathname, "/login")) return true;
  if (pathIs(pathname, "/forgot-password")) return true;
  if (pathIs(pathname, "/reset-password")) return true;
  if (pathIs(pathname, "/auth/callback")) return true;
  if (pathIs(pathname, "/api/heartbeat")) return true;
  if (pathIs(pathname, "/api/policy")) return true;
  if (pathIs(pathname, "/api/version.json")) return true;
  if (pathIs(pathname, "/api/health")) return true;
  if (pathIs(pathname, "/api/auth")) return true;
  return false;
}

function isAdminApi(pathname: string): boolean {
  return pathIs(pathname, "/api/admin") || pathIs(pathname, "/api/agents");
}

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { user, response, configured } = await updateSession(request);
  const publicPath = isPublicPath(pathname);

  if (!configured && !publicPath) {
    if (isAdminApi(pathname)) {
      return withSessionCookies(
        response,
        NextResponse.json(
          {
            success: false,
            error:
              "Supabase Auth is not configured (set NEXT_PUBLIC_SUPABASE_ANON_KEY)",
          },
          { status: 503 }
        )
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return withSessionCookies(response, NextResponse.redirect(login));
  }

  if (!user && !publicPath) {
    if (isAdminApi(pathname)) {
      return withSessionCookies(
        response,
        NextResponse.json(
          { success: false, error: "Operator authentication required" },
          { status: 401 }
        )
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return withSessionCookies(response, NextResponse.redirect(login));
  }

  if (user && pathIs(pathname, "/login")) {
    const dest = safeNextPath(request.nextUrl.searchParams.get("next"));
    return withSessionCookies(
      response,
      NextResponse.redirect(new URL(dest, request.url))
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
