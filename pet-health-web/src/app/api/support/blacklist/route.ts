import { NextResponse } from "next/server";
import { fetchJson, ApiError } from "@/lib/api/client";
import { parseBlacklistQuery } from "@/lib/api/validation/common";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = parseBlacklistQuery(url.searchParams.get("q"));
  try {
    const data = await fetchJson<{ data: unknown }>(
      `/support/blacklist?q=${encodeURIComponent(q)}`,
      { cache: "no-store" },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      {
        error: "Blacklist lookup unavailable",
        code: "BLACKLIST_UNAVAILABLE",
      },
      { status: 502 },
    );
  }
}
