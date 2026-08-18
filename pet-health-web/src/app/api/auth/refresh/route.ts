import { NextResponse } from "next/server";
import { refreshRequest } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  applySessionCookies,
  clearSessionCookies,
  getSessionTokens,
} from "@/lib/session";
import { accessTokenNeedsRefresh, extractAuthTokens } from "@/lib/sessionTokens";

export async function POST() {
  const { accessToken, refreshToken } = await getSessionTokens();
  if (accessToken && !accessTokenNeedsRefresh(accessToken)) {
    return NextResponse.json({ ok: true, refreshed: false });
  }
  if (!refreshToken) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    clearSessionCookies(res);
    return res;
  }

  try {
    const result = await refreshRequest(refreshToken);
    const tokens = extractAuthTokens(result);
    if (!tokens.access_token) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      clearSessionCookies(res);
      return res;
    }
    const res = NextResponse.json({ ok: true, refreshed: true });
    applySessionCookies(res, tokens);
    return res;
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 401;
    const res = NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: status === 401 || status === 400 ? 401 : status },
    );
    if (status === 401 || status === 400) clearSessionCookies(res);
    return res;
  }
}
