import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { listConversations } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await listConversations(token);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
