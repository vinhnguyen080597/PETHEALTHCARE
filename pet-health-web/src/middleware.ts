import { NextResponse, type NextRequest } from "next/server";
import { API_V1, COOKIE_ACCESS, COOKIE_REFRESH } from "@/lib/config";
import { mergeCookieHeader } from "@/lib/sessionCookies";
import { sessionCookieOptions } from "@/lib/sessionOptions";
import { accessTokenNeedsRefresh, extractAuthTokens } from "@/lib/sessionTokens";

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function clearSession(response: NextResponse): NextResponse {
  const opts = sessionCookieOptions(0);
  response.cookies.set(COOKIE_ACCESS, "", opts);
  response.cookies.set(COOKIE_REFRESH, "", opts);
  return response;
}

function applyTokens(
  request: NextRequest,
  tokens: { access_token: string; refresh_token?: string },
): NextResponse {
  const cookie = mergeCookieHeader(request.headers.get("cookie") || "", {
    [COOKIE_ACCESS]: tokens.access_token,
    [COOKIE_REFRESH]: tokens.refresh_token,
  });
  const headers = new Headers(request.headers);
  headers.set("cookie", cookie);
  const response = NextResponse.next({ request: { headers } });
  const opts = sessionCookieOptions();
  response.cookies.set(COOKIE_ACCESS, tokens.access_token, opts);
  if (tokens.refresh_token) {
    response.cookies.set(COOKIE_REFRESH, tokens.refresh_token, opts);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  // API routes refresh via getAccessToken so parallel polls share one server lock
  // per isolate instead of racing here on a rotating refresh token.
  if (isApiPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(COOKIE_ACCESS)?.value || null;
  const refreshToken = request.cookies.get(COOKIE_REFRESH)?.value || null;
  if (!refreshToken || (accessToken && !accessTokenNeedsRefresh(accessToken))) {
    return NextResponse.next();
  }

  try {
    const result = await fetch(`${API_V1}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (result.status === 401) {
      return clearSession(NextResponse.next());
    }
    if (!result.ok) return NextResponse.next();
    const tokens = extractAuthTokens(await result.json());
    if (!tokens.access_token) return NextResponse.next();
    return applyTokens(request, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
