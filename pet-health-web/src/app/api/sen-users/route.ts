import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { listSenUsers } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function GET(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const limit = Number(searchParams.get("limit") || 50);
    const result = await listSenUsers(token, { search, limit });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to list Sen users" }, { status: 500 });
  }
}
