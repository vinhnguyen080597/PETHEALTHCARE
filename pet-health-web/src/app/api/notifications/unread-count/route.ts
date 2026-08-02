import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { getUnreadNotificationCount } from "@/lib/api/petFeed";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";

export async function GET() {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  try {
    const result = await getUnreadNotificationCount(token);
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err, "Failed to load unread count");
  }
}
