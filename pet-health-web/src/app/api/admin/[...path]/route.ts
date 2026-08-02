import { NextResponse } from "next/server";
import { getAccessToken, getSessionUser } from "@/lib/session";
import { API_V1 } from "@/lib/config";
import { ApiError, fetchJson } from "@/lib/api/client";

type Props = { params: Promise<{ path: string[] }> };

function mapAdminPath(segments: string[]): string {
  const path = segments.join("/");
  // /api/admin/posts -> /admin/pet-feed/posts
  if (path === "posts" || path.startsWith("posts/")) {
    return `/admin/pet-feed/${path}`;
  }
  if (path === "reports" || path.startsWith("reports/")) {
    return `/admin/pet-feed/${path}`;
  }
  if (path === "breeders" || path.startsWith("breeders/")) {
    return `/admin/breeder-profiles${path === "breeders" ? "" : path.slice("breeders".length)}`;
  }
  if (path === "accounts" || path.startsWith("accounts/")) {
    return `/admin/${path}`;
  }
  if (path === "feature-flags" || path.startsWith("feature-flags")) {
    return `/admin/${path}`;
  }
  return `/admin/${path}`;
}

async function proxy(req: Request, segments: string[]) {
  const session = await getSessionUser();
  const token = await getAccessToken();
  if (!token || !session.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const backendPath = mapAdminPath(segments);
  const method = req.method.toUpperCase();
  let body: unknown;
  if (method !== "GET" && method !== "HEAD") {
    body = await req.json().catch(() => undefined);
  }

  try {
    const data = await fetchJson(`${API_V1}${backendPath}`, {
      method,
      token,
      body,
      cache: "no-store",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json({ error: "Admin proxy failed" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: Props) {
  const { path } = await params;
  return proxy(req, path);
}

export async function PUT(req: Request, { params }: Props) {
  const { path } = await params;
  return proxy(req, path);
}

export async function POST(req: Request, { params }: Props) {
  const { path } = await params;
  return proxy(req, path);
}
