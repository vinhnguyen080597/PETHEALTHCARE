import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import {
  getMyBreederProfile,
  upsertMyBreederProfile,
} from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";
import { isTemplateId } from "@/lib/types";

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const template = body.template;
    if (!isTemplateId(template)) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }
    const current = await getMyBreederProfile(token);
    const profile = current.data;
    if (!profile) {
      return NextResponse.json(
        { error: "Breeder profile not found. Create a profile first." },
        { status: 404 },
      );
    }
    const metadata = {
      ...(profile.metadata || {}),
      ...(body.metadata || {}),
      template,
    };
    const updated = await upsertMyBreederProfile(token, {
      displayName: profile.display_name,
      bio: profile.bio,
      location: profile.location,
      avatarUrl: profile.avatar_url,
      contact: profile.contact,
      primarySpecies: profile.primary_species,
      mainBreeds: profile.main_breeds,
      metadata,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
