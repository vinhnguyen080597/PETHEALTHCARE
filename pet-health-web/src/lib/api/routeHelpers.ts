import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";

export function jsonError(err: unknown, fallback = "Failed") {
  if (err instanceof ApiError) {
    // NextResponse.json cannot use 204/205 (no body allowed).
    const status = err.status === 204 || err.status === 205 ? 502 : err.status;
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
