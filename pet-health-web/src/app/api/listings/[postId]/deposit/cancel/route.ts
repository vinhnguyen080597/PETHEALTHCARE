import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAccessToken } from "@/lib/session";
import { cancelListingDeposit } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";
import { parseBody, readJsonBody } from "@/lib/api/validation/parseRequest";
import { dealCancelBodySchema } from "@/lib/api/validation/schemas";

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
    const parsed = parseBody(dealCancelBodySchema, await readJsonBody(req));
    if (!parsed.ok) return parsed.response;
    const result = await cancelListingDeposit(token, postId, parsed.data);
    revalidateTag("public-posts");
    revalidateTag(postId);
    revalidatePath(`/app/pet-feed/posts/${postId}`);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to cancel deposit" }, { status: 500 });
  }
}
