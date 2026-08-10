import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAccessToken } from "@/lib/session";
import { updateListingWarrantyPolicy } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function PUT(
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
      warrantyPolicyId?: string | null;
      warranty_policy_id?: string | null;
    };
    const raw =
      body.warrantyPolicyId !== undefined
        ? body.warrantyPolicyId
        : body.warranty_policy_id;
    const warrantyPolicyId =
      raw == null || String(raw).trim() === "" ? null : String(raw).trim();

    const result = await updateListingWarrantyPolicy(
      token,
      postId,
      warrantyPolicyId,
    );

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
    return NextResponse.json(
      { error: "Failed to update warranty policy" },
      { status: 500 },
    );
  }
}
