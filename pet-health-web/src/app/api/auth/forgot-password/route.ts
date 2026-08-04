import { NextResponse } from "next/server";
import { forgotPasswordRequest } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim();
    if (!email) {
      return NextResponse.json(
        { error: "email is required", code: "MISSING_EMAIL" },
        { status: 400 },
      );
    }
    const result = await forgotPasswordRequest(email);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Could not send OTP" }, { status: 500 });
  }
}
