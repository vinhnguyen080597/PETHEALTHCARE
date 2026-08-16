import { NextResponse } from "next/server";
import { API_V1 } from "@/lib/config";
import { fetchJson, ApiError } from "@/lib/api/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
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
    // Fallback if backend unreachable: keep response shape stable for UI
    return NextResponse.json(
      {
        error: "Blacklist lookup unavailable",
        code: "BLACKLIST_UNAVAILABLE",
        hint: API_V1,
      },
      { status: 502 },
    );
  }
}
