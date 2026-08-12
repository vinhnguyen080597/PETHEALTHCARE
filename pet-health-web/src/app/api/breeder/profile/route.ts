import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { upsertMyBreederProfile } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function PUT(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const displayName = String(body.displayName || "").trim();
    const location = String(body.location || "").trim();
    const contact =
      body.contact && typeof body.contact === "object"
        ? (body.contact as Record<string, string>)
        : {};
    const phone = String(contact.phone || "").trim();
    const facebook = String(contact.facebook || "").trim();
    const zalo = String(contact.zalo || "").trim();

    if (!displayName || !location) {
      return NextResponse.json(
        {
          error: "displayName and location are required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const commitments = Array.isArray(
      (body.metadata as { transparencyCommitments?: unknown })
        ?.transparencyCommitments,
    )
      ? (
          (body.metadata as { transparencyCommitments: unknown[] })
            .transparencyCommitments
        ).filter((x): x is string => typeof x === "string")
      : [];
    if (
      !commitments.includes("accurate_information") ||
      !commitments.includes("app_only_verification")
    ) {
      return NextResponse.json(
        {
          error: "Transparency commitments are required",
          code: "COMMITMENTS_REQUIRED",
        },
        { status: 400 },
      );
    }

    const result = await upsertMyBreederProfile(token, {
      displayName,
      bio: String(body.bio || ""),
      location,
      avatarUrl: body.avatarUrl || undefined,
      contact: { phone, facebook, zalo },
      primarySpecies: Array.isArray(body.primarySpecies)
        ? body.primarySpecies
        : [],
      registrationUnit: String(body.registrationUnit || ""),
      registrationUnitOther: String(body.registrationUnitOther || ""),
      mainBreeds: Array.isArray(body.mainBreeds) ? body.mainBreeds : [],
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? body.metadata
          : {},
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to save breeder profile" },
      { status: 500 },
    );
  }
}
