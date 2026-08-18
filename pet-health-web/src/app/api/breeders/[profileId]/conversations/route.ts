import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { startBreederConversation } from "@/lib/api/petFeed";
import { jsonError, unauthorized } from "@/lib/api/routeHelpers";

type Props = { params: Promise<{ profileId: string }> };

export async function POST(_req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) return unauthorized();
  const { profileId } = await params;
  try {
    const result = await startBreederConversation(token, profileId);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return jsonError(err, "Failed to start conversation");
  }
}
