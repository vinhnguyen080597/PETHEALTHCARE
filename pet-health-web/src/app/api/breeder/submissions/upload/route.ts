import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { uploadBreederTransparencyMedia } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const incoming = await req.formData();
    const kindRaw = String(incoming.get("kind") || "").trim().toLowerCase();
    const kind =
      kindRaw === "facility_video" || kindRaw === "business_license" ? kindRaw : "";
    if (!kind) {
      return NextResponse.json(
        { error: "kind must be facility_video or business_license", code: "INVALID_UPLOAD_KIND" },
        { status: 400 },
      );
    }
    const file = incoming.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json(
        { error: "file is required", code: "BREEDER_FILE_REQUIRED" },
        { status: 400 },
      );
    }
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file, file.name || `${kind}.bin`);
    const result = await uploadBreederTransparencyMedia(token, formData);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to upload media" }, { status: 500 });
  }
}
