import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import {
  createWarrantyPolicy,
  listMyWarrantyPolicies,
} from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";
import { parseBody, readJsonBody } from "@/lib/api/validation/parseRequest";
import { warrantyPolicyBodySchema } from "@/lib/api/validation/schemas";

export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await listMyWarrantyPolicies(token);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to list policies" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(warrantyPolicyBodySchema, await readJsonBody(req));
  if (!parsed.ok) return parsed.response;
  try {
    const result = await createWarrantyPolicy(token, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to create policy" }, { status: 500 });
  }
}
