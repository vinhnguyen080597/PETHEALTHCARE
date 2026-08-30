import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { createSupportTicket } from "@/lib/api/support";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";
import { parseBody, readJsonBody } from "@/lib/api/validation/parseRequest";
import { supportTicketBodySchema } from "@/lib/api/validation/schemas";

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const parsed = parseBody(supportTicketBodySchema, await readJsonBody(req));
  if (!parsed.ok) return parsed.response;
  try {
    const result = await createSupportTicket(token, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err, "Failed to submit support ticket");
  }
}
