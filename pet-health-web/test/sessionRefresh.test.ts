import test from "node:test";
import assert from "node:assert/strict";
import { mergeCookieHeader } from "../src/lib/sessionCookies";
import { shouldRetryAfterUnauthorized } from "../src/lib/fetchWithSession";

test("mergeCookieHeader replaces access token without dropping other cookies", () => {
  assert.equal(
    mergeCookieHeader("pm_lang=VI; pm_access_token=old; theme=light", {
      pm_access_token: "new",
      pm_refresh_token: "r2",
    }),
    "pm_lang=VI; pm_access_token=new; theme=light; pm_refresh_token=r2",
  );
});

test("mergeCookieHeader removes blank cookie values", () => {
  assert.equal(
    mergeCookieHeader("pm_access_token=dead; pm_refresh_token=r1", {
      pm_access_token: "",
      pm_refresh_token: null,
    }),
    "",
  );
});

test("shouldRetryAfterUnauthorized retries API 401 once", () => {
  assert.equal(shouldRetryAfterUnauthorized(401, false, "/api/messages"), true);
  assert.equal(shouldRetryAfterUnauthorized(401, true, "/api/messages"), false);
  assert.equal(shouldRetryAfterUnauthorized(500, false, "/api/messages"), false);
  assert.equal(
    shouldRetryAfterUnauthorized(401, false, "/api/auth/refresh"),
    false,
  );
});
