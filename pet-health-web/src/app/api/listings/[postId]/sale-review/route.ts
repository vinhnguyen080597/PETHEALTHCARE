import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { createSaleFarmReview, getMySaleReview } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

type Params = { params: Promise<{ postId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId } = await params;
  try {
    const result = await getMySaleReview(token, postId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to load sale review" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId } = await params;
  try {
    const body = await req.json();
    const result = await createSaleFarmReview(token, postId, {
      rating: body.rating,
      body: body.body,
      photoUrls: body.photoUrls ?? body.photo_urls,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to submit sale review" }, { status: 500 });
  }
}
