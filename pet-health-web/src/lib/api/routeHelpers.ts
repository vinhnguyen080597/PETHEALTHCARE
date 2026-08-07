import { NextResponse } from "next/server";
import { resolveRouteError } from "@/lib/api/routeError";

export function jsonError(err: unknown, fallback = "Failed") {
  const { status, body } = resolveRouteError(err, fallback);
  return NextResponse.json(body, { status });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
