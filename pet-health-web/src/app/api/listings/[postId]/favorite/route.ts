import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import {
  favoritePost,
  getPostFavoriteStatus,
  unfavoritePost,
} from "@/lib/api/petFeed";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";

type Props = { params: Promise<{ postId: string }> };

export async function GET(_req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const { postId } = await params;
  try {
    const result = await getPostFavoriteStatus(token, postId);
    return NextResponse.json({
      data: { favorited: Boolean(result?.data?.favorited) },
    });
  } catch (err) {
    return jsonError(err, "Failed to check favorite");
  }
}

export async function POST(_req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const { postId } = await params;
  try {
    await favoritePost(token, postId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err, "Failed to favorite");
  }
}

export async function DELETE(_req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const { postId } = await params;
  try {
    await unfavoritePost(token, postId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err, "Failed to unfavorite");
  }
}
