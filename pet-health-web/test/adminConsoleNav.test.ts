import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import { adminRequestHref } from "../src/lib/notifications/deepLinks";
import {
  ADMIN_CONSOLE_PATH,
  ADMIN_NAV_ITEMS,
  ADMIN_SECTIONS,
  adminConsoleHref,
  adminGuestLoginHref,
  parseAdminConsoleSearch,
  summarizeAdminLoadErrors,
} from "../src/lib/admin/consoleNav";

test("nav items cover every admin section in sidebar order", () => {
  assert.deepEqual(
    ADMIN_NAV_ITEMS.map((item) => item.key),
    [...ADMIN_SECTIONS],
  );
});

test("parseAdminConsoleSearch defaults to home and ignores invalid values", () => {
  assert.deepEqual(parseAdminConsoleSearch({}), {
    section: "home",
    requestType: null,
    focus: null,
    listingStatus: null,
  });
  assert.deepEqual(parseAdminConsoleSearch({ section: "hack", type: "nope" }), {
    section: "home",
    requestType: null,
    focus: null,
    listingStatus: null,
  });
});

test("parseAdminConsoleSearch treats a request type as the requests section", () => {
  assert.deepEqual(parseAdminConsoleSearch({ type: "breeder", focus: "bp-1" }), {
    section: "requests",
    requestType: "breeder",
    focus: "bp-1",
    listingStatus: null,
  });
});

test("parseAdminConsoleSearch keeps a valid section over a stray type", () => {
  assert.deepEqual(
    parseAdminConsoleSearch({
      section: "listings",
      type: "breeder",
      focus: "post-9",
    }),
    {
      section: "listings",
      requestType: null,
      focus: null,
      listingStatus: "all",
    },
  );
});

test("parseAdminConsoleSearch reads URLSearchParams", () => {
  const qs = new URLSearchParams(
    "section=requests&type=farm_review&focus=rev-1",
  );
  assert.deepEqual(parseAdminConsoleSearch(qs), {
    section: "requests",
    requestType: "farm_review",
    focus: "rev-1",
    listingStatus: null,
  });
});

test("adminConsoleHref is shareable and omits home query", () => {
  assert.equal(adminConsoleHref(), ADMIN_CONSOLE_PATH);
  assert.equal(adminConsoleHref({ section: "home" }), ADMIN_CONSOLE_PATH);
  assert.equal(
    adminConsoleHref({ section: "users" }),
    `${ADMIN_CONSOLE_PATH}?section=users`,
  );
  assert.equal(
    adminConsoleHref({
      section: "requests",
      type: "scam",
      focus: "ticket 1",
    }),
    `${ADMIN_CONSOLE_PATH}?section=requests&type=scam&focus=ticket+1`,
  );
  assert.equal(
    adminConsoleHref({ section: "listings", type: "post", focus: "x" }),
    `${ADMIN_CONSOLE_PATH}?section=listings`,
  );
});

test("adminGuestLoginHref preserves admin deep-link as next", () => {
  assert.equal(
    adminGuestLoginHref({
      section: "requests",
      type: "report",
      focus: "rep-3",
    }),
    "/login?next=%2Fapp%2Fadmin%3Fsection%3Drequests%26type%3Dreport%26focus%3Drep-3",
  );
  assert.equal(adminGuestLoginHref({}), "/login?next=%2Fapp%2Fadmin");
});

test("adminConsoleHref round-trips parsed search including request type", () => {
  const parsed = parseAdminConsoleSearch({
    section: "requests",
    type: "report",
    focus: "rep-3",
  });
  assert.equal(
    adminConsoleHref(parsed),
    `${ADMIN_CONSOLE_PATH}?section=requests&type=report&focus=rep-3`,
  );
});

test("nav labels and new home/auth copy exist in EN and VI", () => {
  for (const item of ADMIN_NAV_ITEMS) {
    assert.ok(en[item.labelKey], `missing EN ${item.labelKey}`);
    assert.ok(vi[item.labelKey], `missing VI ${item.labelKey}`);
  }
  assert.ok(en["admin.nav.menu"]);
  assert.ok(vi["admin.nav.menu"]);
  assert.ok(en["admin.loadPartialError"]);
  assert.ok(vi["admin.loadPartialError"]);
});

test("notification admin deep links parse back into the requests section", () => {
  const href = adminRequestHref({
    type: "admin_listing_pending",
    post_id: "post-9",
  });
  const qs = new URLSearchParams(href.split("?")[1] || "");
  assert.deepEqual(parseAdminConsoleSearch(qs), {
    section: "requests",
    requestType: "post",
    focus: "post-9",
    listingStatus: null,
  });
});

test("listings status query is shareable and ignored on other sections", () => {
  assert.deepEqual(
    parseAdminConsoleSearch({
      section: "listings",
      status: "pending_review",
    }),
    {
      section: "listings",
      requestType: null,
      focus: null,
      listingStatus: "pending_review",
    },
  );
  assert.equal(
    adminConsoleHref({
      section: "listings",
      listingStatus: "pending_review",
    }),
    `${ADMIN_CONSOLE_PATH}?section=listings&status=pending_review`,
  );
  assert.equal(
    adminConsoleHref({ section: "listings", listingStatus: "all" }),
    `${ADMIN_CONSOLE_PATH}?section=listings`,
  );
  assert.equal(
    parseAdminConsoleSearch({ section: "requests", status: "published" })
      .listingStatus,
    null,
  );
});

test("summarizeAdminLoadErrors prefers forbidden over partial zeros", () => {
  assert.equal(summarizeAdminLoadErrors([]), null);
  assert.equal(summarizeAdminLoadErrors(["Forbidden"]), "forbidden");
  assert.equal(
    summarizeAdminLoadErrors(["network", "Forbidden", "timeout"]),
    "forbidden",
  );
  assert.equal(summarizeAdminLoadErrors(["Admin request failed"]), "partial");
});
