import { NextResponse } from "next/server";
import { verifyOtpRequest } from "@/lib/api/auth";
import { applySessionCookies } from "@/lib/session";
import { ApiError } from "@/lib/api/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await verifyOtpRequest({
      email: String(body.email || "").trim(),
      token: String(body.token || body.otp || "").trim(),
      password: body.password ? String(body.password) : undefined,
    });
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
