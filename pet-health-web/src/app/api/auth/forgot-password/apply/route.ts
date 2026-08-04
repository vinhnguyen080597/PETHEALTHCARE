import { NextResponse } from "next/server";
import { applyForgotPasswordRequest } from "@/lib/api/auth";
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
    const otp = String(body.otp || "").trim();
    const newPassword = String(body.newPassword || "");
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "email, otp and newPassword are required", code: "MISSING_FIELDS" },
        { status: 400 },
      );
    }
    const result = await applyForgotPasswordRequest({ email, otp, newPassword });
    const session = (result.data || {}) as Record<string, unknown>;
    const tokens = extractTokens(session);
    const res = NextResponse.json({
      data: {
        success: session.success ?? true,
        account: session.account,
        user: session.user,
        hasSession: Boolean(tokens.access_token),
      },
    });
    if (tokens.access_token) {
      applySessionCookies(res, tokens);
    }
    return res;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}
