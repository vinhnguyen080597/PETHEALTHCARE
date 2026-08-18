import test from "node:test";
import assert from "node:assert/strict";
import {
  accessTokenNeedsRefresh,
  decodeJwtPayload,
  extractAuthTokens,
  isExpiredAuthError,
} from "../src/lib/sessionTokens";
import { ApiError } from "../src/lib/api/client";

function jwtWithExp(exp: number): string {
  const payload = Buffer.from(JSON.stringify({ exp, sub: "u1" })).toString("base64url");
  return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}

test("decodeJwtPayload reads exp from a JWT", () => {
  const token = jwtWithExp(1_700_000_000);
  assert.equal(decodeJwtPayload(token)?.exp, 1_700_000_000);
  assert.equal(decodeJwtPayload("not-a-jwt"), null);
});

test("accessTokenNeedsRefresh uses JWT exp with skew", () => {
  const now = 1_700_000_000_000;
  assert.equal(accessTokenNeedsRefresh(null, now), true);
  assert.equal(accessTokenNeedsRefresh(jwtWithExp(1_700_000_120), now, 0), false);
  assert.equal(accessTokenNeedsRefresh(jwtWithExp(1_700_000_000), now, 0), true);
  assert.equal(accessTokenNeedsRefresh(jwtWithExp(1_699_999_940), now, 60), true);
  assert.equal(accessTokenNeedsRefresh("opaque-token", now), false);
});

test("extractAuthTokens reads nested supabase session payloads", () => {
  assert.deepEqual(
    extractAuthTokens({
      data: { session: { access_token: "a", refresh_token: "r" } },
    }),
    { access_token: "a", refresh_token: "r" },
  );
  assert.deepEqual(
    extractAuthTokens({ access_token: "a2", refresh_token: "r2" }),
    { access_token: "a2", refresh_token: "r2" },
  );
  assert.deepEqual(extractAuthTokens(null), {});
});

test("isExpiredAuthError matches 401 and token copy", () => {
  assert.equal(isExpiredAuthError(new ApiError("Invalid or expired token", 401)), true);
  assert.equal(isExpiredAuthError(new ApiError("Missing bearer token", 401)), true);
  assert.equal(isExpiredAuthError(new Error("Invalid or expired token")), true);
  assert.equal(isExpiredAuthError(new ApiError("boom", 500)), false);
});
