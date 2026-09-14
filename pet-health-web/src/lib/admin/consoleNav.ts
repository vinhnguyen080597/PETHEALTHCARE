import type { EnKey } from "../../i18n";
import { loginHref } from "../loginHref";
import type { AdminSection } from "../types";

export const ADMIN_CONSOLE_PATH = "/app/admin";

export const ADMIN_SECTIONS = [
  "home",
  "requests",
  "listings",
  "breeders",
  "reports",
  "history",
  "users",
  "features",
  "news",
] as const satisfies readonly AdminSection[];

export const ADMIN_REQUEST_TYPES = [
  "breeder",
  "post",
  "report",
  "detail",
  "appeal",
  "feedback",
  "scam",
  "farm_review",
] as const;

export type AdminRequestType = (typeof ADMIN_REQUEST_TYPES)[number];

export const ADMIN_LISTING_STATUS_FILTERS = [
  "all",
  "pending_review",
  "published",
  "deposit_hold",
  "sold",
  "archived",
] as const;

export type AdminListingStatusFilter = (typeof ADMIN_LISTING_STATUS_FILTERS)[number];

export type AdminConsoleSearch = {
  section: AdminSection;
  requestType: AdminRequestType | null;
  focus: string | null;
  listingStatus: AdminListingStatusFilter | null;
};

export type AdminConsoleSearchInput =
  | Pick<URLSearchParams, "get">
  | {
      section?: string | string[];
      type?: string | string[];
      focus?: string | string[];
      status?: string | string[];
    };

const NAV_META: Record<AdminSection, { labelKey: EnKey; icon: string }> = {
  home: { labelKey: "admin.nav.home", icon: "⌂" },
  requests: { labelKey: "admin.nav.requests", icon: "↓" },
  listings: { labelKey: "admin.nav.listings", icon: "◆" },
  breeders: { labelKey: "admin.nav.breeders", icon: "◎" },
  reports: { labelKey: "admin.nav.reports", icon: "!" },
  history: { labelKey: "admin.nav.history", icon: "☰" },
  users: { labelKey: "admin.nav.users", icon: "◉" },
  features: { labelKey: "admin.nav.features", icon: "⚑" },
  news: { labelKey: "admin.nav.news", icon: "✎" },
};

export const ADMIN_NAV_ITEMS: {
  key: AdminSection;
  labelKey: EnKey;
  icon: string;
}[] = ADMIN_SECTIONS.map((key) => ({ key, ...NAV_META[key] }));

function firstString(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) {
    const item = value.find((entry) => typeof entry === "string" && entry.trim());
    return item ? item.trim() : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
}

function readParam(
  input: AdminConsoleSearchInput,
  key: "section" | "type" | "focus" | "status",
): string | null {
  if (typeof (input as URLSearchParams).get === "function") {
    return firstString((input as URLSearchParams).get(key));
  }
  const rec = input as {
    section?: string | string[];
    type?: string | string[];
    focus?: string | string[];
    status?: string | string[];
  };
  return firstString(rec[key]);
}

export function isAdminSection(value: string | null | undefined): value is AdminSection {
  return (ADMIN_SECTIONS as readonly string[]).includes(String(value || ""));
}

export function isAdminRequestType(
  value: string | null | undefined,
): value is AdminRequestType {
  return (ADMIN_REQUEST_TYPES as readonly string[]).includes(String(value || ""));
}

export function isAdminListingStatus(
  value: string | null | undefined,
): value is AdminListingStatusFilter {
  return (ADMIN_LISTING_STATUS_FILTERS as readonly string[]).includes(String(value || ""));
}

/** Parse /app/admin?section=&type=&focus=&status= — invalid values are ignored. */
export function parseAdminConsoleSearch(
  input: AdminConsoleSearchInput,
): AdminConsoleSearch {
  const sectionParam = readParam(input, "section");
  const typeParam = readParam(input, "type");
  const focusParam = readParam(input, "focus");
  const statusParam = readParam(input, "status");
  const requestType = isAdminRequestType(typeParam) ? typeParam : null;

  const section: AdminSection = isAdminSection(sectionParam)
    ? sectionParam
    : requestType
      ? "requests"
      : "home";

  const listingStatus =
    section === "listings" && isAdminListingStatus(statusParam) && statusParam !== "all"
      ? statusParam
      : section === "listings"
        ? "all"
        : null;

  return {
    section,
    requestType: section === "requests" ? requestType : null,
    focus: section === "requests" ? focusParam : null,
    listingStatus,
  };
}

export function adminConsoleHref(opts?: {
  section?: AdminSection;
  type?: AdminRequestType | null;
  requestType?: AdminRequestType | null;
  focus?: string | null;
  listingStatus?: AdminListingStatusFilter | null;
  status?: AdminListingStatusFilter | null;
}): string {
  const section = opts?.section ?? "home";
  const typeCandidate = opts?.type ?? opts?.requestType ?? null;
  const type =
    section === "requests" && isAdminRequestType(typeCandidate) ? typeCandidate : null;
  const focus =
    section === "requests" && opts?.focus?.trim() ? opts.focus.trim() : null;
  const listingStatusCandidate = opts?.listingStatus ?? opts?.status ?? null;
  const listingStatus =
    section === "listings" &&
    isAdminListingStatus(listingStatusCandidate) &&
    listingStatusCandidate !== "all"
      ? listingStatusCandidate
      : null;

  if (section === "home" && !type && !focus && !listingStatus) return ADMIN_CONSOLE_PATH;

  const qs = new URLSearchParams();
  qs.set("section", section);
  if (type) qs.set("type", type);
  if (focus) qs.set("focus", focus);
  if (listingStatus) qs.set("status", listingStatus);
  return `${ADMIN_CONSOLE_PATH}?${qs.toString()}`;
}

/** Guest login must return to the same admin deep link (section/type/focus). */
export function adminGuestLoginHref(input: AdminConsoleSearchInput): string {
  return loginHref(adminConsoleHref(parseAdminConsoleSearch(input)));
}

export function summarizeAdminLoadErrors(
  messages: string[],
): "forbidden" | "partial" | null {
  if (!messages.length) return null;
  if (messages.some((message) => /forbidden/i.test(message))) return "forbidden";
  return "partial";
}
