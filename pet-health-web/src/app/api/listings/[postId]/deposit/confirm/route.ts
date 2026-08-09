import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { confirmListingDeposit } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

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
    const body = (await req.json().catch(() => ({}))) as {
      senUserId?: string;
      acknowledge?: boolean;
    };
    const result = await confirmListingDeposit(token, postId, {
      senUserId: body.senUserId,
      acknowledge: Boolean(body.acknowledge),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to confirm deposit" }, { status: 500 });
  }
}
