import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { uploadChatMedia } from "@/lib/api/petFeed";
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
    const kindRaw = String(incoming.get("kind") || "").trim().toLowerCase();
    const kind = kindRaw === "video" || file.type.startsWith("video/") ? "video" : "photo";
    const formData = new FormData();
    formData.set("kind", kind);
    formData.set("file", file, file.name || (kind === "video" ? "clip.mp4" : "photo.jpg"));
    const result = await uploadChatMedia(token, formData);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to upload media" }, { status: 500 });
  }
}
