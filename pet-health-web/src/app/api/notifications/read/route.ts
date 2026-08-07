import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { markNotificationsRead } from "@/lib/api/petFeed";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  try {
    const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string" && Boolean(id))
      : undefined;
    const result = await markNotificationsRead(token, ids);
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err, "Failed to mark notifications read");
  }
}
