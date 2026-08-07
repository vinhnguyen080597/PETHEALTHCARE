import test from "node:test";
import assert from "node:assert/strict";
import { isAppActionHref, loginHref, signupHref } from "../src/lib/loginHref.ts";

test("loginHref encodes next path", () => {
  assert.equal(loginHref("/app/account"), "/login?next=%2Fapp%2Faccount");
  assert.equal(loginHref("app/messages"), "/login?next=%2Fapp%2Fmessages");
});

test("signupHref optional next", () => {
  assert.equal(signupHref(), "/signup");
  assert.equal(signupHref(null), "/signup");
  assert.equal(signupHref("/app/pet-feed"), "/signup?next=%2Fapp%2Fpet-feed");
});

test("isAppActionHref detects in-app routes", () => {
  assert.equal(isAppActionHref("/app/notifications"), true);
  assert.equal(isAppActionHref("/login"), false);
  assert.equal(isAppActionHref(null), false);
  assert.equal(isAppActionHref("https://evil.example/app"), false);
});
