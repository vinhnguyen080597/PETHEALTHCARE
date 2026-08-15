import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  breadcrumbLinkHrefs,
  buildSiteBreadcrumbs,
  farmTemplateHref,
  parseFarmBreadcrumbId,
  shouldHideSiteBreadcrumbs,
} from "../src/lib/siteBreadcrumbs";

const FARM_ID = "11111111-2222-4333-8444-555555555555";
const POST_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

/** Real pages that non-terminal crumbs may link to. */
const REAL_PAGE_PREFIXES = [
  "/",
  "/app/news",
  "/app/pet-feed",
  "/app/breeders",
  "/app/account",
  "/app/account/saved",
  "/app/account/breeder",
  "/app/account/breeder/template",
  "/app/account/listings/new",
  "/app/account/warranty",
  "/app/messages",
  "/app/notifications",
  "/app/admin",
  "/support",
  "/privacy-policy",
  "/terms-of-service",
  "/marketplace-guidelines",
];

function assertLinksAreRealPages(path: string, farmId?: string) {
  const crumbs = buildSiteBreadcrumbs(path, { farmProfileId: farmId });
  const links = breadcrumbLinkHrefs(crumbs);
  for (const href of links) {
    const pathOnly = href.split("?")[0] || href;
    const ok =
      REAL_PAGE_PREFIXES.includes(pathOnly) ||
      /^\/app\/breeders\/[^/]+$/.test(pathOnly) ||
      /^\/app\/pet-feed\/posts\/[^/]+$/.test(pathOnly);
    assert.ok(ok, `dead breadcrumb link on ${path}: ${href}`);
  }
  // Never link to folder-only paths
  for (const href of links) {
    assert.notEqual(href, "/app/pet-feed/posts");
    assert.notEqual(href, "/app/account/listings");
  }
}

test("farmTemplateHref includes farm query", () => {
  assert.equal(
    farmTemplateHref(FARM_ID),
    `/app/account/breeder/template?farm=${FARM_ID}`,
  );
});

test("parseFarmBreadcrumbId accepts uuid only", () => {
  assert.equal(parseFarmBreadcrumbId(FARM_ID), FARM_ID);
  assert.equal(parseFarmBreadcrumbId("../account"), null);
  assert.equal(parseFarmBreadcrumbId(""), null);
});

test("hides breadcrumbs on home and auth", () => {
  assert.equal(shouldHideSiteBreadcrumbs("/"), true);
  assert.equal(shouldHideSiteBreadcrumbs("/login"), true);
  assert.equal(shouldHideSiteBreadcrumbs("/signup"), true);
  assert.equal(shouldHideSiteBreadcrumbs("/app/breeders"), false);
});

test("template from farm uses Top Breeders trail", () => {
  const crumbs = buildSiteBreadcrumbs("/app/account/breeder/template", {
    farmProfileId: FARM_ID,
  });
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    [
      "/",
      "/app/breeders",
      `/app/breeders/${FARM_ID}`,
      farmTemplateHref(FARM_ID),
    ],
  );
});

test("template from account skips misleading breeder form crumb", () => {
  const crumbs = buildSiteBreadcrumbs("/app/account/breeder/template");
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    ["/", "/app/account", "/app/account/breeder/template"],
  );
});

test("breeders detail trail stays under Top Breeders", () => {
  const crumbs = buildSiteBreadcrumbs(`/app/breeders/${FARM_ID}`);
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    ["/", "/app/breeders", `/app/breeders/${FARM_ID}`],
  );
});

test("farm profile from Account uses Account parent not Top Breeders", () => {
  const crumbs = buildSiteBreadcrumbs(`/app/breeders/${FARM_ID}`, {
    from: "account",
  });
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    [
      "/",
      "/app/account",
      `/app/breeders/${FARM_ID}?from=account`,
    ],
  );
  assert.equal(crumbs[1]?.labelKey, "nav.account");
  assert.equal(crumbs[2]?.labelKey, "breadcrumb.farmProfile");
});

test("listing detail skips /posts folder link", () => {
  const crumbs = buildSiteBreadcrumbs(`/app/pet-feed/posts/${POST_ID}`);
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    ["/", "/app/pet-feed", `/app/pet-feed/posts/${POST_ID}`],
  );
  assert.equal(crumbs[2]?.labelKey, "breadcrumb.listingDetail");
});

test("listing detail from Account uses Account parent not New Pets", () => {
  const crumbs = buildSiteBreadcrumbs(`/app/pet-feed/posts/${POST_ID}`, {
    from: "account",
  });
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    [
      "/",
      "/app/account",
      `/app/pet-feed/posts/${POST_ID}?from=account`,
    ],
  );
  assert.equal(crumbs[1]?.labelKey, "nav.account");
  assert.equal(crumbs[2]?.labelKey, "breadcrumb.listingDetail");
});

test("new listing skips /listings folder link", () => {
  const crumbs = buildSiteBreadcrumbs("/app/account/listings/new");
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    ["/", "/app/account", "/app/account/listings/new"],
  );
});

test("warranty library from new listing parents Đăng tin mới", () => {
  const crumbs = buildSiteBreadcrumbs("/app/account/warranty", {
    from: "new-listing",
  });
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    [
      "/",
      "/app/account/listings/new",
      "/app/account/warranty?from=new-listing",
    ],
  );
  assert.equal(crumbs[1]?.labelKey, "account.newListing");
  assert.equal(crumbs[2]?.labelKey, "listing.new.warrantyManage");
});

test("warranty library from farm Account trail includes Hồ sơ trại", () => {
  const crumbs = buildSiteBreadcrumbs("/app/account/warranty", {
    from: "account",
    farmProfileId: FARM_ID,
  });
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    [
      "/",
      "/app/account",
      `/app/breeders/${FARM_ID}?tab=warranty&from=account`,
      `/app/account/warranty?from=account&farm=${FARM_ID}`,
    ],
  );
  assert.equal(crumbs[2]?.labelKey, "breadcrumb.farmProfile");
  assert.equal(crumbs[3]?.labelKey, "account.breederTrust.warrantyLibrary");
});

test("warranty library from farm public trail parents Top Breeders", () => {
  const crumbs = buildSiteBreadcrumbs("/app/account/warranty", {
    farmProfileId: FARM_ID,
  });
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    [
      "/",
      "/app/breeders",
      `/app/breeders/${FARM_ID}?tab=warranty`,
      `/app/account/warranty?farm=${FARM_ID}`,
    ],
  );
  assert.equal(crumbs[2]?.labelKey, "breadcrumb.farmProfile");
});

test("warranty library default trail stays under Account", () => {
  const crumbs = buildSiteBreadcrumbs("/app/account/warranty");
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    ["/", "/app/account", "/app/account/warranty"],
  );
  assert.equal(crumbs[2]?.labelKey, "account.breederTrust.warrantyLibrary");
});

test("edit listing trail links detail then edit", () => {
  const path = `/app/account/listings/${POST_ID}/edit`;
  const crumbs = buildSiteBreadcrumbs(path);
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    [
      "/",
      "/app/account",
      `/app/pet-feed/posts/${POST_ID}?from=account`,
      `/app/account/listings/${POST_ID}/edit`,
    ],
  );
  assert.equal(crumbs.at(-1)?.labelKey, "detail.updateDetails");
  assertLinksAreRealPages(path);
});

test("trust guide trail parents are breeders + farm", () => {
  const crumbs = buildSiteBreadcrumbs(`/app/breeders/${FARM_ID}/trust`);
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    [
      "/",
      "/app/breeders",
      `/app/breeders/${FARM_ID}`,
      `/app/breeders/${FARM_ID}/trust`,
    ],
  );
  assert.equal(crumbs[3]?.labelKey, "breadcrumb.farmTrust");
});

test("health path maps trust trail hrefs", () => {
  const crumbs = buildSiteBreadcrumbs(`/app/breeders/${FARM_ID}/health`);
  assert.ok(crumbs);
  assert.equal(crumbs.at(-1)?.href, `/app/breeders/${FARM_ID}/trust`);
});

test("account subpages link only to real parents", () => {
  assertLinksAreRealPages("/app/account");
  assertLinksAreRealPages("/app/account/saved");
  assertLinksAreRealPages("/app/account/breeder");
  assertLinksAreRealPages("/app/account/listings/new");
  assertLinksAreRealPages("/app/account/breeder/template");
  assertLinksAreRealPages("/app/account/breeder/template", FARM_ID);
});

test("marketplace and legal trails have real parent links", () => {
  assertLinksAreRealPages("/app/news");
  assertLinksAreRealPages("/app/pet-feed");
  assertLinksAreRealPages(`/app/pet-feed/posts/${POST_ID}`);
  assertLinksAreRealPages("/app/breeders");
  assertLinksAreRealPages(`/app/breeders/${FARM_ID}`);
  assertLinksAreRealPages(`/app/breeders/${FARM_ID}/trust`);
  assertLinksAreRealPages("/app/messages");
  assertLinksAreRealPages("/app/notifications");
  assertLinksAreRealPages("/app/admin");
  assertLinksAreRealPages("/support");
  assertLinksAreRealPages("/privacy-policy");
  assertLinksAreRealPages("/terms-of-service");
  assertLinksAreRealPages("/marketplace-guidelines");
});

test("news trail is Home / Tin tức", () => {
  const crumbs = buildSiteBreadcrumbs("/app/news");
  assert.ok(crumbs);
  assert.deepEqual(
    crumbs.map((c) => c.href),
    ["/", "/app/news"],
  );
  assert.equal(crumbs[1]?.labelKey, "nav.news");
});

test("breadcrumb.farmTrust i18n exists EN/VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.ok(enDict["breadcrumb.farmTrust"]);
  assert.ok(viDict["breadcrumb.farmTrust"]);
});
