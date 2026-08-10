import test from "node:test";
import assert from "node:assert/strict";
import { resolveRouteError } from "../src/lib/api/routeError";
import {
  langCookieOptions,
  parseLang,
  sessionCookieOptions,
} from "../src/lib/sessionOptions";
import { genderLabel, getLang, t } from "../src/i18n/index";
import {
  resolveAuthError,
  resolveForgotError,
  resolveOtpError,
} from "../src/lib/authErrors";

test("resolveRouteError remaps 204/205 and falls back", () => {
  assert.deepEqual(resolveRouteError({ status: 204, message: "No content", code: "EMPTY" }), {
    status: 502,
    body: { error: "No content", code: "EMPTY" },
  });
  assert.deepEqual(resolveRouteError({ status: 404, message: "Missing" }), {
    status: 404,
    body: { error: "Missing", code: undefined },
  });
  assert.deepEqual(resolveRouteError(new Error("boom"), "Oops"), {
    status: 500,
    body: { error: "Oops" },
  });
});

test("sessionOptions parseLang and cookie flags", () => {
  assert.equal(parseLang("en"), "EN");
  assert.equal(parseLang("VI"), "VI");
  assert.equal(parseLang(undefined), "VI");
  const session = sessionCookieOptions(10);
  assert.equal(session.httpOnly, true);
  assert.equal(session.maxAge, 10);
  assert.equal(session.sameSite, "lax");
  const lang = langCookieOptions();
  assert.equal(lang.httpOnly, false);
});

test("i18n getLang prefers query then cookie", () => {
  assert.equal(getLang({ searchParams: { lang: "en" } }), "EN");
  assert.equal(getLang({ cookie: "EN" }), "EN");
  assert.equal(getLang({}), "VI");
  assert.equal(t("EN", "nav.login"), "Log in");
  assert.equal(genderLabel("EN", "male"), t("EN", "common.male"));
  assert.equal(genderLabel("VI", "female"), t("VI", "common.female"));
  assert.equal(genderLabel("EN", "unknown"), "unknown");
  assert.equal(t("VI", "landing.searchPlaceholder"), "Bạn đang tìm bé thú cưng nào?");
  assert.equal(t("EN", "landing.searchPlaceholder"), "Looking for a pet?");
});

test("resolveAuthError / OTP / forgot map codes", () => {
  assert.match(
    resolveAuthError("EN", true, { code: "EMAIL_ALREADY_REGISTERED" }),
    /already|registered|exist/i,
  );
  assert.match(resolveAuthError("EN", false, {}, 503), /fail|sign|in|error/i);
  assert.match(resolveOtpError("EN", { code: "otp_expired" }), /expir/i);
  assert.match(resolveOtpError("EN", { code: "invalid_otp" }), /invalid|wrong|otp/i);
  assert.match(resolveForgotError("EN", { code: "PASSWORD_TOO_SHORT" }), /pass|short|weak/i);
});
