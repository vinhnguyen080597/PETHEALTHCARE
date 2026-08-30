import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { markNotificationsRead } from "@/lib/api/petFeed";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";
import { parseBody, readJsonBody } from "@/lib/api/validation/parseRequest";
import { markNotificationsReadBodySchema } from "@/lib/api/validation/schemas";

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const parsed = parseBody(markNotificationsReadBodySchema, await readJsonBody(req));
  if (!parsed.ok) return parsed.response;
  try {
    const result = await markNotificationsRead(token, parsed.data.ids);
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err, "Failed to mark notifications read");
  }
}
