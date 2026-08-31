import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { patchListingStatus } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

type Params = { params: Promise<{ postId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId } = await params;
  if (!String(postId || "").trim()) {
    return NextResponse.json({ error: "Missing post id" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const result = await patchListingStatus(token, postId, {
      status: body.status,
      saleChannel: body.saleChannel ?? body.sale_channel,
      buyerEmail: body.buyerEmail ?? body.buyer_email,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
