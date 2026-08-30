import { NextResponse } from "next/server";
import { getAccessToken, getSessionUser } from "@/lib/session";
import { API_V1, UPLOAD_TIMEOUT_MS } from "@/lib/config";
import { ApiError, fetchJson } from "@/lib/api/client";
import { parseBody } from "@/lib/api/validation/parseRequest";
import {
  adminProxyBodySchema,
  resolveAdminProxyRoute,
} from "@/lib/api/validation/adminProxyAllowlist";

type Props = { params: Promise<{ path: string[] }> };

async function proxy(req: Request, segments: string[]) {
  const session = await getSessionUser();
  const token = await getAccessToken();
  if (!token || !session.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const method = req.method.toUpperCase();
  const resolved = resolveAdminProxyRoute(method, segments);
  if (!resolved.ok) {
    return NextResponse.json(
      {
        error: "Admin route not allowed",
        code: resolved.code,
      },
      { status: resolved.code === "ADMIN_PROXY_PATH_INVALID" ? 400 : 404 },
    );
  }

  const incomingUrl = new URL(req.url);
  const qs = incomingUrl.search || "";
  const url = `${API_V1}${resolved.backendPath}${qs}`;

  const contentType = req.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");

  try {
    if (isMultipart && method !== "GET" && method !== "HEAD") {
      if (resolved.bodySchemaKey !== "POST announcements") {
        return NextResponse.json(
          {
            error: "Multipart uploads are only allowed for announcement publish",
            code: "ADMIN_PROXY_MULTIPART_NOT_ALLOWED",
          },
          { status: 400 },
        );
      }
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
      body = await req.json().catch(() => ({}));
      const schema = adminProxyBodySchema(resolved.bodySchemaKey);
      if (schema) {
        const parsed = parseBody(schema, body);
        if (!parsed.ok) return parsed.response;
        body = parsed.data;
      }
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
