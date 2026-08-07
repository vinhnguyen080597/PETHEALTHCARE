"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";

const SEGMENT_LABEL: Record<string, EnKey> = {
  app: "nav.brand",
  "pet-feed": "nav.browse",
  posts: "breadcrumb.listing",
  breeders: "nav.breeders",
  health: "breadcrumb.farmHealth",
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

function isIdSegment(segment: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment,
    ) || /^[0-9a-f]{16,}$/i.test(segment)
  );
}

function labelFor(
  lang: Lang,
  segment: string,
  prev: string | undefined,
): string {
  if (SEGMENT_LABEL[segment]) {
    return t(lang, SEGMENT_LABEL[segment]);
  }
  if (isIdSegment(segment)) {
    if (prev === "posts") return t(lang, "breadcrumb.listingDetail");
    if (prev === "breeders") return t(lang, "breadcrumb.farmProfile");
    return t(lang, "breadcrumb.detail");
  }
  return segment.replace(/-/g, " ");
}

export function SiteBreadcrumbs({ lang }: { lang: Lang }) {
  const pathname = usePathname() || "/";

  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/")
  ) {
    return null;
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const crumbs: { href: string; label: string }[] = [
    { href: "/", label: t(lang, "breadcrumb.home") },
  ];

  let href = "";
  parts.forEach((segment, index) => {
    href += `/${segment}`;
    // Skip bare "app" in the trail — jump to marketplace sections
    if (segment === "app" && parts.length > 1) return;
    crumbs.push({
      href,
      label: labelFor(lang, segment, parts[index - 1]),
    });
  });

  return (
    <div className="bg-[#FDFBF7]">
      <nav
        aria-label="Breadcrumb"
        className="max-w-[1200px] mx-auto px-5 lg:px-8 py-2.5"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-[#6E5A51]">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1.5 min-w-0">
                {index > 0 ? (
                  <span aria-hidden className="text-[#D6C4B0]">
                    /
                  </span>
                ) : null}
                {isLast ? (
                  <span
                    aria-current="page"
                    className="truncate font-medium text-[#2B1E19]"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="truncate hover:text-[#D97706] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
