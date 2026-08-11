import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAccessToken } from "@/lib/session";
import { requestListingDispute } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";
import { httpPhotoUrls } from "@/lib/dealPhotoUpload";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { postId } = await params;
    const incoming = (await req.json().catch(() => ({}))) as {
      message?: string;
      note?: string;
      disputePhotoUrls?: unknown;
    };
    const message = String(incoming.message || incoming.note || "");
    const result = await requestListingDispute(token, postId, {
      message,
      disputePhotoUrls: httpPhotoUrls(incoming.disputePhotoUrls),
    });
    revalidateTag("public-posts");
    revalidateTag(postId);
    revalidatePath(`/app/pet-feed/posts/${postId}`);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to open dispute" }, { status: 500 });
  }
}
