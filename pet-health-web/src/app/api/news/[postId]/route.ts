import { NextResponse } from "next/server";
import { getPublicPostDetail } from "@/lib/api/public";
import { isAnnouncementPost } from "@/lib/siteNav";
import { ApiError } from "@/lib/api/client";

type Params = { params: Promise<{ postId: string }> };

/** Public announcement detail for in-feed expand (no auth required). */
export async function GET(_req: Request, { params }: Params) {
  const { postId } = await params;
  if (!String(postId || "").trim()) {
    return NextResponse.json({ error: "Missing post id" }, { status: 400 });
  }
  try {
    const listing = await getPublicPostDetail(postId);
    if (!listing || !isAnnouncementPost(listing.postKind)) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }
    return NextResponse.json({ data: listing });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}
