import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { uploadFarmReviewPhoto } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const incoming = await req.formData();
    const file = incoming.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json(
        { error: "file is required", code: "PET_FEED_FILE_REQUIRED" },
        { status: 400 },
      );
    }
    const formData = new FormData();
    formData.set("file", file, file.name || "farm-review.jpg");
    const result = await uploadFarmReviewPhoto(token, formData);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}
