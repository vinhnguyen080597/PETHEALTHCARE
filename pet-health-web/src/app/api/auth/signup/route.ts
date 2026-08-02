import { NextResponse } from "next/server";
import { signupRequest } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await signupRequest({
      email: String(body.email || "").trim(),
      password: String(body.password || ""),
      displayName: body.displayName ? String(body.displayName) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
