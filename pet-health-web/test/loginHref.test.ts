import test from "node:test";
import assert from "node:assert/strict";
import {
  guestAppLoginPath,
  isAppActionHref,
  isAppRoute,
  loginHref,
  maybeLoginHref,
  signupHref,
} from "../src/lib/loginHref";

test("loginHref encodes next path", () => {
  assert.equal(loginHref("/app/account"), "/login?next=%2Fapp%2Faccount");
  assert.equal(loginHref("app/messages"), "/login?next=%2Fapp%2Fmessages");
});

test("signupHref optional next", () => {
  assert.equal(signupHref(), "/signup");
  assert.equal(signupHref(null), "/signup");
  assert.equal(signupHref("/app/pet-feed"), "/signup?next=%2Fapp%2Fpet-feed");
});

test("maybeLoginHref sends guests to login with return path", () => {
  assert.equal(maybeLoginHref(true, "/app/pet-feed"), "/app/pet-feed");
  assert.equal(
    maybeLoginHref(false, "/app/news"),
    "/login?next=%2Fapp%2Fnews",
  );
});

test("guestAppLoginPath sends /app deep links to login with return URL", () => {
  assert.equal(isAppRoute("/app/pet-feed"), true);
  assert.equal(isAppRoute("/login"), false);
  assert.equal(guestAppLoginPath("/privacy-policy"), null);
  assert.equal(
    guestAppLoginPath("/app/pet-feed"),
    "/login?next=%2Fapp%2Fpet-feed",
  );
  assert.equal(
    guestAppLoginPath("/app/pet-feed", "?q=meo"),
    "/login?next=%2Fapp%2Fpet-feed%3Fq%3Dmeo",
  );
});

test("isAppActionHref detects in-app routes", () => {
  assert.equal(isAppActionHref("/app/notifications"), true);
  assert.equal(isAppActionHref("/login"), false);
  assert.equal(isAppActionHref(null), false);
  assert.equal(isAppActionHref("https://evil.example/app"), false);
});
