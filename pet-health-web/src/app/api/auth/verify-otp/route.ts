import { NextResponse } from "next/server";
import { verifyOtpRequest } from "@/lib/api/auth";
import { applySessionCookies } from "@/lib/session";
import { ApiError } from "@/lib/api/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    const otp = String(body.otp || body.token || "").trim();
    const password = String(body.password || "");
    const displayName = String(body.displayName || "").trim();
    if (!email || !otp || !password) {
      return NextResponse.json(
        { error: "email, otp and password are required", code: "MISSING_FIELDS" },
        { status: 400 },
      );
    }
    if (!displayName) {
      return NextResponse.json(
        { error: "displayName is required", code: "DISPLAY_NAME_REQUIRED" },
        { status: 400 },
      );
    }
    const result = await verifyOtpRequest({ email, otp, password, displayName });
    const session = result.data as {
      access_token?: string;
      refresh_token?: string;
      session?: { access_token?: string; refresh_token?: string };
      account?: unknown;
      user?: unknown;
    };
    const res = NextResponse.json({
      data: { account: session.account, user: session.user },
    });
    applySessionCookies(res, {
      access_token: session.access_token || session.session?.access_token,
      refresh_token: session.refresh_token || session.session?.refresh_token,
    });
    return res;
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "OTP verification failed" }, { status: 500 });
  }
}
