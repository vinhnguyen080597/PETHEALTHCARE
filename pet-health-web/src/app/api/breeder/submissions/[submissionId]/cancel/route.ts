import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { cancelBreederProfileSubmission } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

type Props = { params: Promise<{ submissionId: string }> };

export async function POST(_req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { submissionId } = await params;
    const result = await cancelBreederProfileSubmission(token, submissionId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to cancel submission" }, { status: 500 });
  }
}
