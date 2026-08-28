import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { createListingPostJson } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      {
        error:
          "Listing media must be uploaded before submit. Refresh the page and try again.",
        code: "LISTING_JSON_REQUIRED",
      },
      { status: 400 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const result = await createListingPostJson(token, body);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[api/listings] create failed", err);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
