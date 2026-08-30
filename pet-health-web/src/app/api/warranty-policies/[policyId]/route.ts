import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { deleteWarrantyPolicy, updateWarrantyPolicy } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";
import { parseBody, readJsonBody } from "@/lib/api/validation/parseRequest";
import {
  warrantyPolicyBodySchema,
  warrantyPolicyIdParamSchema,
} from "@/lib/api/validation/schemas";

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
    const idParsed = warrantyPolicyIdParamSchema.safeParse(policyId);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid policy id" }, { status: 400 });
    }
    const result = await deleteWarrantyPolicy(token, idParsed.data);
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
    const idParsed = warrantyPolicyIdParamSchema.safeParse(policyId);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid policy id" }, { status: 400 });
    }
    const parsed = parseBody(warrantyPolicyBodySchema, await readJsonBody(req));
    if (!parsed.ok) return parsed.response;
    const result = await updateWarrantyPolicy(token, idParsed.data, parsed.data);
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
