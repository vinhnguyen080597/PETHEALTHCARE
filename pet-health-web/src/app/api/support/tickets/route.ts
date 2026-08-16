import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { createSupportTicket } from "@/lib/api/support";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  try {
    const body = await req.json().catch(() => ({}));
    const result = await createSupportTicket(token, body as Record<string, unknown>);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err, "Failed to submit support ticket");
  }
}
