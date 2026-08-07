import test from "node:test";
import assert from "node:assert/strict";
import { formatNotificationBadge } from "../src/lib/notifications/badge.ts";
import {
  fillEmail,
  fillSeconds,
  isValidEmail,
  parseRetryAfterSeconds,
} from "../src/lib/authErrorParsers.ts";

test("formatNotificationBadge caps at 99+", () => {
  assert.equal(formatNotificationBadge(0), "0");
  assert.equal(formatNotificationBadge(12), "12");
  assert.equal(formatNotificationBadge(99), "99");
  assert.equal(formatNotificationBadge(100), "99+");
  assert.equal(formatNotificationBadge(-3), "0");
});

test("isValidEmail validates basic addresses", () => {
  assert.equal(isValidEmail("a@b.co"), true);
  assert.equal(isValidEmail("  user@example.com "), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail(""), false);
});

test("parseRetryAfterSeconds reads field or message text", () => {
  assert.equal(parseRetryAfterSeconds({ retry_after: 12.2 }), 13);
  assert.equal(parseRetryAfterSeconds({ retryAfter: 5 }), 5);
  assert.equal(parseRetryAfterSeconds({ error: "Wait 42 seconds before retry" }), 42);
  assert.equal(parseRetryAfterSeconds({}), 60);
});

test("fillSeconds and fillEmail replace templates", () => {
  assert.equal(fillSeconds("Retry in {{seconds}}s", 9), "Retry in 9s");
  assert.equal(fillEmail("Code sent to {{email}}", "a@b.co"), "Code sent to a@b.co");
});
