import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAccessToken } from "@/lib/session";
import { requestListingDispute } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";
import { parseBody, readJsonBody } from "@/lib/api/validation/parseRequest";
import { dealDisputeBodySchema } from "@/lib/api/validation/schemas";

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
    const parsed = parseBody(dealDisputeBodySchema, await readJsonBody(req));
    if (!parsed.ok) return parsed.response;
    const result = await requestListingDispute(token, postId, parsed.data);
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
    return NextResponse.json({ error: "Failed to open dispute" }, { status: 500 });
  }
}
