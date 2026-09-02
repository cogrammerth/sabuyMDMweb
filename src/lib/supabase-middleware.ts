import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicEnv } from "@/lib/supabase-env";
import type { User } from "@supabase/supabase-js";

export type MiddlewareSession = {
  user: User | null;
  response: NextResponse;
  configured: boolean;
};

function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

export function withSessionCookies(
  sessionResponse: NextResponse,
  next: NextResponse
): NextResponse {
  return copyCookies(sessionResponse, next);
}

export async function updateSession(
  request: NextRequest
): Promise<MiddlewareSession> {
  let response = NextResponse.next({ request });
  const env = getSupabasePublicEnv();
  if (!env) {
    return { user: null, response, configured: false };
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, response, configured: true };
}
