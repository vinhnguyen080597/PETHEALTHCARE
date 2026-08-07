/** Map thrown API errors into a JSON body + HTTP status for Next route handlers. */
export function resolveRouteError(
  err: unknown,
  fallback = "Failed",
): { status: number; body: { error: string; code?: string } } {
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number" &&
    "message" in err
  ) {
    const apiErr = err as { status: number; message: string; code?: string };
    // NextResponse.json cannot use 204/205 (no body allowed).
    const status = apiErr.status === 204 || apiErr.status === 205 ? 502 : apiErr.status;
    return {
      status,
      body: { error: apiErr.message, code: apiErr.code },
    };
  }
  return { status: 500, body: { error: fallback } };
}
