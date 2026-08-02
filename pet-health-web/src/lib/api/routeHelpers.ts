import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";

export function jsonError(err: unknown, fallback = "Failed") {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
