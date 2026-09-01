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
    const message = err instanceof Error ? err.message : "Could not send OTP";
    return NextResponse.json(
      { error: message, code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
