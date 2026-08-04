import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  SITE_ORIGIN,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/config";

type OAuthProvider = "google" | "facebook";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/app/account";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/app/account";
  return raw;
}

function safeProvider(raw: string | null): OAuthProvider | null {
  return raw === "google" || raw === "facebook" ? raw : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = safeProvider(url.searchParams.get("provider"));
  const next = safeNextPath(url.searchParams.get("next"));
  const origin = SITE_ORIGIN || url.origin;

  const fail = (reason: string) => {
    const dest = new URL("/login", origin);
    dest.searchParams.set("oauth_error", reason);
    if (next !== "/app/account") dest.searchParams.set("next", next);
    return NextResponse.redirect(dest);
  };

  if (!isSupabaseConfigured()) return fail("oauth_not_configured");
  if (!provider) return fail("oauth_failed");

  try {
    const cookieStore = await cookies();
    const redirectTo = new URL(
      `/api/auth/oauth/callback?next=${encodeURIComponent(next)}`,
      origin,
    );

    // Build response later; cookie writes must land on the same redirect response.
    let oauthUrl = "";
    const pendingCookies: Array<{
      name: string;
      value: string;
      options?: Parameters<NextResponse["cookies"]["set"]>[2];
    }> = [];

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
        },
      },
      auth: { flowType: "pkce" },
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo.toString(),
        skipBrowserRedirect: true,
        ...(provider === "google"
          ? { queryParams: { access_type: "offline", prompt: "select_account" } }
          : {}),
      },
    });

    if (error || !data.url) {
      return fail(error?.message || "oauth_failed");
    }
    oauthUrl = data.url;

    const res = NextResponse.redirect(oauthUrl);
    for (const c of pendingCookies) {
      res.cookies.set(c.name, c.value, c.options);
    }
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : "oauth_failed");
  }
}
