import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import {
  createBreederFarmReview,
  getBreederDealReviews,
} from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

type Params = { params: Promise<{ profileId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const token = await getAccessToken();
  const { profileId } = await params;
  if (!String(profileId || "").trim()) {
    return NextResponse.json({ error: "Missing profile id" }, { status: 400 });
  }
  try {
    const result = await getBreederDealReviews(token, profileId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { profileId } = await params;
  if (!String(profileId || "").trim()) {
    return NextResponse.json({ error: "Missing profile id" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const result = await createBreederFarmReview(token, profileId, {
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
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
