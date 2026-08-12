import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import {
  createBreederProfileSubmission,
  listMyBreederProfileSubmissions,
} from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await listMyBreederProfileSubmissions(token);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to load submissions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const submissionType = String(body.submissionType || body.submission_type || "").trim();
    const url = String(body.url || "").trim();
    const note = typeof body.note === "string" ? body.note.trim() : undefined;
    const result = await createBreederProfileSubmission(token, {
      submissionType,
      url,
      ...(note ? { note } : {}),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to submit detail" }, { status: 500 });
  }
}
