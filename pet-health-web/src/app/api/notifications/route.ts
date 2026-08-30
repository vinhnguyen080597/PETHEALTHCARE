import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { listNotifications } from "@/lib/api/petFeed";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";
import { parseNotificationsLimit } from "@/lib/api/validation/common";

export async function GET(req: Request) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseNotificationsLimit(searchParams.get("limit"));
    const result = await listNotifications(token, limit);
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err, "Failed to load notifications");
  }
}
