import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { startConversation } from "@/lib/api/petFeed";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";

type Props = { params: Promise<{ postId: string }> };

export async function POST(_req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const { postId } = await params;
  try {
    const result = await startConversation(token, postId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err, "Failed to start conversation");
  }
}
