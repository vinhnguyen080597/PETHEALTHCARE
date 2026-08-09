import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { deleteWarrantyPolicy, updateWarrantyPolicy } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ policyId: string }> },
) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { policyId } = await params;
    const result = await deleteWarrantyPolicy(token, policyId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to delete policy" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ policyId: string }> },
) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { policyId } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await updateWarrantyPolicy(token, policyId, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to update policy" }, { status: 500 });
  }
}
