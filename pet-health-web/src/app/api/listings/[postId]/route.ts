import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { updateMyListing } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

type Params = { params: Promise<{ postId: string }> };

export async function PUT(req: Request, { params }: Params) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId } = await params;
  if (!String(postId || "").trim()) {
    return NextResponse.json({ error: "Missing post id" }, { status: 400 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await updateMyListing(token, postId, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
  }
}
