import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { confirmListingComplete } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { postId } = await params;
    const result = await confirmListingComplete(token, postId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to confirm completion" }, { status: 500 });
  }
}
