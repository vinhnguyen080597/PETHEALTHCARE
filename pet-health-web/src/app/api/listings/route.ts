import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { createListingPost } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const incoming = await req.formData();
    const formData = new FormData();

    const fieldMap: Record<string, string> = {
      title: "title",
      species: "species",
      breed: "breed",
      gender: "gender",
      ageMonths: "ageMonths",
      location: "location",
      priceNote: "priceNote",
      description: "description",
      vaccineStatus: "vaccineStatus",
      dewormingStatus: "dewormingStatus",
      status: "status",
      warranty_policy_id: "warranty_policy_id",
      personality: "personality",
      paperwork: "paperwork",
      contact: "contact",
    };

    for (const [key, dest] of Object.entries(fieldMap)) {
      const value = incoming.get(key);
      if (value != null && value !== "") formData.set(dest, String(value));
    }

    const photos = incoming.getAll("photos");
    for (const photo of photos) {
      if (photo instanceof File && photo.size > 0) {
        formData.append("photos", photo);
      }
    }

    const video = incoming.get("video");
    if (video instanceof File && video.size > 0) {
      formData.set("video", video);
    }

    const evidence = incoming.getAll("healthEvidence");
    for (const file of evidence) {
      if (file instanceof File && file.size > 0) {
        formData.append("healthEvidence", file);
      }
    }

    const result = await createListingPost(token, formData);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
