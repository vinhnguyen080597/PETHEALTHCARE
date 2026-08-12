import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { appealTransparencyWarning } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";

type Props = { params: Promise<{ warningId: string }> };

export async function POST(_req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { warningId } = await params;
    const result = await appealTransparencyWarning(token, warningId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to appeal warning" }, { status: 500 });
  }
}
