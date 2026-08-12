import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAccessToken } from "@/lib/session";
import { submitDealReview } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

type Props = { params: Promise<{ postId: string }> };

export async function POST(req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { postId } = await params;
    const body = await req.json().catch(() => ({}));
    const rating = Number(body.rating);
    const comment = typeof body.body === "string" ? body.body.trim() : "";
    const result = await submitDealReview(token, postId, {
      rating,
      ...(comment ? { body: comment } : {}),
    });
    revalidateTag("public-breeders");
    if (result?.data?.breeder_profile_id) {
      revalidateTag(result.data.breeder_profile_id);
    }
    revalidateTag(postId);
    revalidatePath(`/app/pet-feed/posts/${postId}`);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
