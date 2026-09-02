import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { getMyDirectFarmReview } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

type Params = { params: Promise<{ profileId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { profileId } = await params;
  if (!String(profileId || "").trim()) {
    return NextResponse.json({ error: "Missing profile id" }, { status: 400 });
  }
  try {
    const result = await getMyDirectFarmReview(token, profileId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to load farm review" }, { status: 500 });
  }
}
