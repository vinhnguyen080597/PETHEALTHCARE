import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAccessToken } from "@/lib/session";
import { updateMyBreederProfilePhotos } from "@/lib/api/petFeed";
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

export async function PATCH(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      avatarUrl?: string;
      coverUrl?: string;
    };
    const avatarUrl =
      typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    const coverUrl =
      typeof body.coverUrl === "string" ? body.coverUrl.trim() : "";
    if (!avatarUrl && !coverUrl) {
      return NextResponse.json(
        { error: "avatarUrl or coverUrl is required", code: "BREEDER_PHOTO_REQUIRED" },
        { status: 400 },
      );
    }
    const result = await updateMyBreederProfilePhotos(token, {
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(coverUrl ? { coverUrl } : {}),
    });
    const profileId = result?.data?.id;
    revalidateBreederPublicCaches(
      typeof profileId === "string" ? profileId : undefined,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to update breeder photos" },
      { status: 500 },
    );
  }
}
