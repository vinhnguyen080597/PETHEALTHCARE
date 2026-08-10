import test from "node:test";
import assert from "node:assert/strict";
import { formatNotificationBadge, HEADER_UNREAD_BADGE_CLASS } from "../src/lib/notifications/badge";
import {
  fillEmail,
  fillSeconds,
  isValidEmail,
  parseRetryAfterSeconds,
} from "../src/lib/authErrorParsers";

test("formatNotificationBadge caps at 99+", () => {
  assert.equal(formatNotificationBadge(0), "0");
  assert.equal(formatNotificationBadge(12), "12");
  assert.equal(formatNotificationBadge(99), "99");
  assert.equal(formatNotificationBadge(100), "99+");
  assert.equal(formatNotificationBadge(-3), "0");
});

test("header unread badge uses brand amber pill style", () => {
  assert.match(HEADER_UNREAD_BADGE_CLASS, /bg-\[#D97706\]/);
  assert.match(HEADER_UNREAD_BADGE_CLASS, /text-\[9px\]/);
  assert.match(HEADER_UNREAD_BADGE_CLASS, /top-1 right-1/);
  assert.match(HEADER_UNREAD_BADGE_CLASS, /rounded-full/);
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
