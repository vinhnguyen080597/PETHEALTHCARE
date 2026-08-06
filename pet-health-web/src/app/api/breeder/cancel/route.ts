import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { cancelMyBreederVerificationRequest } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function POST() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await cancelMyBreederVerificationRequest(token);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to cancel request" },
      { status: 500 },
    );
  }
}
