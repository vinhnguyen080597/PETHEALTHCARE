import { getAccessToken } from "@/lib/session";
import { createComment, listComments } from "@/lib/api/petFeed";
import { listPublicPostComments } from "@/lib/api/public";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";
import { NextResponse } from "next/server";

type Props = { params: Promise<{ postId: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { postId } = await params;
  try {
    const token = await getAccessToken();
    if (token) {
      const result = await listComments(token, postId);
      return NextResponse.json(result);
    }
    const data = await listPublicPostComments(postId);
    return NextResponse.json({ data });
  } catch (err) {
    return jsonError(err, "Failed to load comments");
  }
}

export async function POST(req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const { postId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(
      (body as { body?: string; text?: string }).body ||
        (body as { text?: string }).text ||
        "",
    );
    const result = await createComment(token, postId, text);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err, "Failed to post comment");
  }
}
