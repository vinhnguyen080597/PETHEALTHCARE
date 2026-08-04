import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  isSupabaseConfigured,
  SITE_ORIGIN,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/config";
import { applySessionCookies } from "@/lib/session";
import { meRequest } from "@/lib/api/auth";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/app/account";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/app/account";
  return raw;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const oauthError =
    url.searchParams.get("error_description") || url.searchParams.get("error");
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = SITE_ORIGIN || url.origin;

  const loginError = (message: string) => {
    const dest = new URL("/login", origin);
    dest.searchParams.set("oauth_error", message);
    if (next !== "/app/account") dest.searchParams.set("next", next);
    return NextResponse.redirect(dest);
  };

  if (!isSupabaseConfigured()) {
    return loginError("oauth_not_configured");
  }
  if (oauthError) {
    return loginError(oauthError);
  }
  if (!code) {
    return loginError("oauth_missing_code");
  }

  try {
    const cookieStore = await cookies();
    const redirectTo = new URL(next, origin);
    const res = NextResponse.redirect(redirectTo);

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
      auth: { flowType: "pkce" },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session?.access_token) {
      return loginError(error?.message || "oauth_exchange_failed");
    }

    const accessToken = data.session.access_token;
    const refreshToken = data.session.refresh_token;

    try {
      await meRequest(accessToken);
    } catch {
      // Profile may be created on the next authenticated API call.
    }

    applySessionCookies(res, {
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return loginError(message);
  }
}
