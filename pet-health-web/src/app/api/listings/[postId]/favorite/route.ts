import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import {
  favoritePost,
  listFavorites,
  unfavoritePost,
} from "@/lib/api/petFeed";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";

type Props = { params: Promise<{ postId: string }> };

function extractIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      if (!row || typeof row !== "object") return "";
      return String((row as { id?: string }).id || "");
    })
    .filter(Boolean);
}

export async function GET(_req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const { postId } = await params;
  try {
    const result = await listFavorites(token);
    const favorited = extractIds(result).includes(postId);
    return NextResponse.json({ data: { favorited } });
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
