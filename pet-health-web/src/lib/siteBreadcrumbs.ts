import type { EnKey } from "@/i18n";
import {
  farmDetailHref,
  parseFarmDetailFrom,
  parseWarrantyLibraryFrom,
  type FarmDetailFrom,
  type WarrantyLibraryFrom,
} from "./farmTabs";

export type SiteBreadcrumbCrumb = {
  href: string;
  /** i18n key, or raw label when `rawLabel` is set */
  labelKey?: EnKey;
  rawLabel?: string;
};

export type SiteBreadcrumbFrom = FarmDetailFrom | WarrantyLibraryFrom;

const SEGMENT_LABEL: Record<string, EnKey> = {
  app: "nav.brand",
  "pet-feed": "nav.browse",
  posts: "breadcrumb.listing",
  breeders: "nav.breeders",
  health: "breadcrumb.farmHealth",
  trust: "breadcrumb.farmTrust",
  account: "nav.account",
  saved: "account.savedPage.title",
  breeder: "breadcrumb.breederProfile",
  template: "account.template",
  listings: "account.myListings",
  new: "account.newListing",
  messages: "nav.messages",
  notifications: "nav.notifications",
  admin: "nav.admin",
  login: "nav.login",
  signup: "breadcrumb.signup",
  "privacy-policy": "legal.privacy",
  "terms-of-service": "legal.terms",
  "marketplace-guidelines": "legal.guidelines",
  support: "legal.support",
};

/**
 * Path segments that exist only as nesting folders — no page at that href.
 * Keep building the path, but do not emit a clickable crumb.
 */
const NON_PAGE_SEGMENTS = new Set(["posts", "listings"]);

export function isBreadcrumbIdSegment(segment: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment,
    ) || /^[0-9a-f]{16,}$/i.test(segment)
  );
}

/** Safe farm profile id from `?farm=` for template breadcrumbs. */
export function parseFarmBreadcrumbId(value: unknown): string | null {
  const s = String(value || "").trim();
  if (!s || !isBreadcrumbIdSegment(s)) return null;
  return s;
}

export function farmTemplateHref(
  farmProfileId: string,
  options?: { from?: FarmDetailFrom | null },
): string {
  const params = new URLSearchParams();
  params.set("farm", farmProfileId);
  if (options?.from === "account") params.set("from", "account");
  return `/app/account/breeder/template?${params.toString()}`;
}

export function shouldHideSiteBreadcrumbs(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/")
  );
}

function labelForSegment(
  segment: string,
  prev: string | undefined,
): Pick<SiteBreadcrumbCrumb, "labelKey" | "rawLabel"> {
  if (SEGMENT_LABEL[segment]) {
    return { labelKey: SEGMENT_LABEL[segment] };
  }
  if (isBreadcrumbIdSegment(segment)) {
    if (prev === "posts") return { labelKey: "breadcrumb.listingDetail" };
    if (prev === "breeders") return { labelKey: "breadcrumb.farmProfile" };
    return { labelKey: "breadcrumb.detail" };
  }
  return { rawLabel: segment.replace(/-/g, " ") };
}

function defaultTrail(pathname: string): SiteBreadcrumbCrumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: SiteBreadcrumbCrumb[] = [
    { href: "/", labelKey: "breadcrumb.home" },
  ];

  let href = "";
  parts.forEach((segment, index) => {
    href += `/${segment}`;
    // Skip bare "app" in the trail — jump to marketplace sections
    if (segment === "app" && parts.length > 1) return;
    // Skip folder-only segments that 404 if clicked
    if (NON_PAGE_SEGMENTS.has(segment)) return;

    crumbs.push({
      href,
      ...labelForSegment(segment, parts[index - 1]),
    });
  });

  return crumbs;
}

/**
 * Build breadcrumb trail for the current path.
 * Every non-last href must resolve to a real page route.
 */
export function buildSiteBreadcrumbs(
  pathname: string,
  options?: {
    farmProfileId?: string | null;
    from?: SiteBreadcrumbFrom | null;
  },
): SiteBreadcrumbCrumb[] | null {
  if (shouldHideSiteBreadcrumbs(pathname)) return null;

  const path = pathname.split("?")[0] || pathname;
  const farmId = parseFarmBreadcrumbId(options?.farmProfileId);
  const fromAccount = parseFarmDetailFrom(options?.from) === "account";
  const fromNewListing =
    parseWarrantyLibraryFrom(options?.from) === "new-listing";

  // Farm profile opened from Account (owner shortcut)
  {
    const farmMatch = path.match(/^\/app\/breeders\/([^/]+)\/?$/);
    if (farmMatch && fromAccount) {
      const id = parseFarmBreadcrumbId(farmMatch[1]) || farmMatch[1];
      return [
        { href: "/", labelKey: "breadcrumb.home" },
        { href: "/app/account", labelKey: "nav.account" },
        {
          href: farmDetailHref(id, "overview", { from: "account" }),
          labelKey: "breadcrumb.farmProfile",
        },
      ];
    }
  }

  // Owner trust guide: Home / Top Breeders / Farm / Trust
  {
    const trustMatch = path.match(/^\/app\/breeders\/([^/]+)\/trust\/?$/);
    if (trustMatch) {
      const id = parseFarmBreadcrumbId(trustMatch[1]) || trustMatch[1];
      if (fromAccount) {
        return [
          { href: "/", labelKey: "breadcrumb.home" },
          { href: "/app/account", labelKey: "nav.account" },
          {
            href: farmDetailHref(id, "overview", { from: "account" }),
            labelKey: "breadcrumb.farmProfile",
          },
          {
            href: `/app/breeders/${id}/trust`,
            labelKey: "breadcrumb.farmTrust",
          },
        ];
      }
      return [
        { href: "/", labelKey: "breadcrumb.home" },
        { href: "/app/breeders", labelKey: "nav.breeders" },
        { href: `/app/breeders/${id}`, labelKey: "breadcrumb.farmProfile" },
        {
          href: `/app/breeders/${id}/trust`,
          labelKey: "breadcrumb.farmTrust",
        },
      ];
    }
  }

  // Legacy /health redirects to /trust — same trail if briefly matched
  {
    const healthMatch = path.match(/^\/app\/breeders\/([^/]+)\/health\/?$/);
    if (healthMatch) {
      const id = parseFarmBreadcrumbId(healthMatch[1]) || healthMatch[1];
      return [
        { href: "/", labelKey: "breadcrumb.home" },
        { href: "/app/breeders", labelKey: "nav.breeders" },
        { href: `/app/breeders/${id}`, labelKey: "breadcrumb.farmProfile" },
        {
          href: `/app/breeders/${id}/trust`,
          labelKey: "breadcrumb.farmTrust",
        },
      ];
    }
  }

  // Listing detail: Home / New Pets / Listing (skip /posts folder)
  // From Account → My listings: Home / Account / Listing
  {
    const postMatch = path.match(/^\/app\/pet-feed\/posts\/([^/]+)\/?$/);
    if (postMatch) {
      const postId = postMatch[1];
      if (fromAccount) {
        return [
          { href: "/", labelKey: "breadcrumb.home" },
          { href: "/app/account", labelKey: "nav.account" },
          {
            href: `/app/pet-feed/posts/${postId}?from=account`,
            labelKey: "breadcrumb.listingDetail",
          },
        ];
      }
      return [
        { href: "/", labelKey: "breadcrumb.home" },
        { href: "/app/pet-feed", labelKey: "nav.browse" },
        {
          href: `/app/pet-feed/posts/${postId}`,
          labelKey: "breadcrumb.listingDetail",
        },
      ];
    }
  }

  // New listing: Home / Account / Create listing (skip /listings folder)
  if (path === "/app/account/listings/new") {
    return [
      { href: "/", labelKey: "breadcrumb.home" },
      { href: "/app/account", labelKey: "nav.account" },
      { href: "/app/account/listings/new", labelKey: "account.newListing" },
    ];
  }

  const editListingMatch = path.match(
    /^\/app\/account\/listings\/([^/]+)\/edit$/,
  );
  if (editListingMatch) {
    const postId = decodeURIComponent(editListingMatch[1]);
    return [
      { href: "/", labelKey: "breadcrumb.home" },
      { href: "/app/account", labelKey: "nav.account" },
      {
        href: `/app/pet-feed/posts/${postId}?from=account`,
        labelKey: "breadcrumb.listingDetail",
      },
      {
        href: `/app/account/listings/${postId}/edit`,
        labelKey: "detail.updateDetails",
      },
    ];
  }

  if (path === "/app/account/warranty") {
    if (fromNewListing) {
      return [
        { href: "/", labelKey: "breadcrumb.home" },
        {
          href: "/app/account/listings/new",
          labelKey: "account.newListing",
        },
        {
          href: "/app/account/warranty?from=new-listing",
          labelKey: "listing.new.warrantyManage",
        },
      ];
    }
    if (farmId) {
      if (fromAccount) {
        return [
          { href: "/", labelKey: "breadcrumb.home" },
          { href: "/app/account", labelKey: "nav.account" },
          {
            href: farmDetailHref(farmId, "warranty", { from: "account" }),
            labelKey: "breadcrumb.farmProfile",
          },
          {
            href: `/app/account/warranty?from=account&farm=${encodeURIComponent(farmId)}`,
            labelKey: "account.breederTrust.warrantyLibrary",
          },
        ];
      }
      return [
        { href: "/", labelKey: "breadcrumb.home" },
        { href: "/app/breeders", labelKey: "nav.breeders" },
        {
          href: farmDetailHref(farmId, "warranty"),
          labelKey: "breadcrumb.farmProfile",
        },
        {
          href: `/app/account/warranty?farm=${encodeURIComponent(farmId)}`,
          labelKey: "account.breederTrust.warrantyLibrary",
        },
      ];
    }
    return [
      { href: "/", labelKey: "breadcrumb.home" },
      { href: "/app/account", labelKey: "nav.account" },
      {
        href: "/app/account/warranty",
        labelKey: "account.breederTrust.warrantyLibrary",
      },
    ];
  }

  // Template from farm profile
  if (path === "/app/account/breeder/template" && farmId) {
    if (fromAccount) {
      return [
        { href: "/", labelKey: "breadcrumb.home" },
        { href: "/app/account", labelKey: "nav.account" },
        {
          href: farmDetailHref(farmId, "overview", { from: "account" }),
          labelKey: "breadcrumb.farmProfile",
        },
        {
          href: farmTemplateHref(farmId),
          labelKey: "account.template",
        },
      ];
    }
    return [
      { href: "/", labelKey: "breadcrumb.home" },
      { href: "/app/breeders", labelKey: "nav.breeders" },
      { href: `/app/breeders/${farmId}`, labelKey: "breadcrumb.farmProfile" },
      {
        href: farmTemplateHref(farmId),
        labelKey: "account.template",
      },
    ];
  }

  // Template from account (avoid dead-end "breeder form" middle crumb confusion)
  if (path === "/app/account/breeder/template") {
    return [
      { href: "/", labelKey: "breadcrumb.home" },
      { href: "/app/account", labelKey: "nav.account" },
      { href: "/app/account/breeder/template", labelKey: "account.template" },
    ];
  }

  const crumbs = defaultTrail(path);
  return crumbs.length > 1 ? crumbs : null;
}

/** All non-terminal hrefs in a trail (for tests / audits). */
export function breadcrumbLinkHrefs(
  crumbs: SiteBreadcrumbCrumb[] | null,
): string[] {
  if (!crumbs || crumbs.length <= 1) return [];
  return crumbs.slice(0, -1).map((c) => c.href.split("?")[0] || c.href);
}
