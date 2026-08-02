import { NextResponse } from "next/server";
import { loginRequest } from "@/lib/api/auth";
import { applySessionCookies } from "@/lib/session";
import { ApiError } from "@/lib/api/client";

function extractTokens(session: Record<string, unknown>) {
  const nested = session.session as
    | { access_token?: string; refresh_token?: string }
    | undefined;
  return {
    access_token:
      (session.access_token as string | undefined) || nested?.access_token,
    refresh_token:
      (session.refresh_token as string | undefined) || nested?.refresh_token,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }
    const result = await loginRequest(email, password);
    const session = (result.data || {}) as Record<string, unknown>;
    const res = NextResponse.json({
      data: { account: session.account, user: session.user },
    });
    applySessionCookies(res, extractTokens(session));
    return res;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
