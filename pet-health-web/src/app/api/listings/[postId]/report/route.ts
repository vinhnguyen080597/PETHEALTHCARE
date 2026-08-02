import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { reportPost } from "@/lib/api/petFeed";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";

type Props = { params: Promise<{ postId: string }> };

export async function POST(req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const { postId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const reason = String((body as { reason?: string }).reason || "").trim();
    const note = String((body as { note?: string }).note || "").trim();
    if (!reason) {
      return NextResponse.json(
        { error: "reason is required", code: "MISSING_REASON" },
        { status: 400 },
      );
    }
    const result = await reportPost(token, postId, {
      reason,
      ...(note ? { note } : {}),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err, "Failed to report listing");
  }
}
