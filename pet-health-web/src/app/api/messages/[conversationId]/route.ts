import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { listMessages, sendMessage } from "@/lib/api/petFeed";
import { ApiError } from "@/lib/api/client";
import { parseBody, readJsonBody } from "@/lib/api/validation/parseRequest";
import { sendMessageBodySchema } from "@/lib/api/validation/schemas";

type Props = { params: Promise<{ conversationId: string }> };

export async function GET(_req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { conversationId } = await params;
  try {
    const result = await listMessages(token, conversationId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Props) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { conversationId } = await params;
  try {
    const parsed = parseBody(sendMessageBodySchema, await readJsonBody(req));
    if (!parsed.ok) return parsed.response;
    const result = await sendMessage(
      token,
      conversationId,
      parsed.data.body,
      parsed.data.mediaUrls,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
