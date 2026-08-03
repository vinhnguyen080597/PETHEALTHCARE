import { NextResponse } from "next/server";
import { getAccessToken, getSessionUser } from "@/lib/session";
import { API_V1, UPLOAD_TIMEOUT_MS } from "@/lib/config";
import { ApiError, fetchJson } from "@/lib/api/client";

type Props = { params: Promise<{ path: string[] }> };

function mapAdminPath(segments: string[], method: string): string {
  const path = segments.join("/");
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
  // Create announcement lives under /pet-feed (admin role), edits under /admin
  if (path === "announcements" && method === "POST") {
    return `/pet-feed/announcements`;
  }
  if (path === "announcements" || path.startsWith("announcements/")) {
    return `/admin/${path}`;
  }
  if (path === "my-announcements") {
    return `/pet-feed/my-announcements`;
  }
  return `/admin/${path}`;
}

async function proxy(req: Request, segments: string[]) {
  const session = await getSessionUser();
  const token = await getAccessToken();
  if (!token || !session.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const method = req.method.toUpperCase();
  const backendPath = mapAdminPath(segments, method);
  const incomingUrl = new URL(req.url);
  const qs = incomingUrl.search || "";
  const url = `${API_V1}${backendPath}${qs}`;

  const contentType = req.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");

  try {
    if (isMultipart && method !== "GET" && method !== "HEAD") {
      const formData = await req.formData();
      const data = await fetchJson(url, {
        method,
        token,
        formData,
        timeoutMs: UPLOAD_TIMEOUT_MS,
        cache: "no-store",
      });
      return NextResponse.json(data);
    }

    let body: unknown;
    if (method !== "GET" && method !== "HEAD") {
      body = await req.json().catch(() => undefined);
    }
    const data = await fetchJson(url, {
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
