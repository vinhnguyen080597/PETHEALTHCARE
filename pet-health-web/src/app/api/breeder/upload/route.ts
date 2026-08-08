import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAccessToken } from "@/lib/session";
import { uploadBreederProfileImage } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

function revalidateBreederPublicCaches(profileId?: string) {
  revalidateTag("public-breeders");
  if (profileId) {
    revalidateTag(profileId);
    revalidatePath(`/app/breeders/${profileId}`);
    revalidatePath(`/app/breeders/${profileId}`, "page");
  }
  revalidatePath("/app/breeders");
}

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const incoming = await req.formData();
    const kindRaw = String(incoming.get("kind") || "").trim().toLowerCase();
    const kind = kindRaw === "cover" ? "cover" : kindRaw === "avatar" ? "avatar" : "";
    if (!kind) {
      return NextResponse.json(
        { error: "kind must be avatar or cover", code: "INVALID_UPLOAD_KIND" },
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
    const persist =
      String(incoming.get("persist") || "1").trim().toLowerCase() !== "0";
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file, file.name || `${kind}.jpg`);
    if (persist) formData.append("persist", "1");
    const result = await uploadBreederProfileImage(token, formData);
    const profileId = result?.data?.profile?.id;
    if (persist) {
      revalidateBreederPublicCaches(
        typeof profileId === "string" ? profileId : undefined,
      );
    }
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to upload breeder photo" },
      { status: 500 },
    );
  }
}
