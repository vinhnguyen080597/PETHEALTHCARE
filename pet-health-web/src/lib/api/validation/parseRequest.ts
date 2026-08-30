import { NextResponse } from "next/server";
import type { ZodError, ZodType } from "zod";

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function validationErrorResponse(error: ZodError, message = "Invalid request") {
  return NextResponse.json(
    {
      error: message,
      code: "VALIDATION_ERROR",
      issues: formatZodIssues(error),
    },
    { status: 400 },
  );
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): ParseResult<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false, response: validationErrorResponse(result.error) };
  }
  return { ok: true, data: result.data };
}

export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
