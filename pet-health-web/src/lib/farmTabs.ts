/** Tabs on the public farm profile (`FarmDetail`). */
export const FARM_DETAIL_TABS = ["overview", "listings", "warranty"] as const;

export type FarmDetailTab = (typeof FARM_DETAIL_TABS)[number];

export type FarmDetailFrom = "account";

/** Opened warranty library from “Đăng tin mới” — breadcrumb + return path. */
export type WarrantyLibraryFrom = "new-listing";

/** `from` on warranty library URLs (listing flow or farm profile / account). */
export type WarrantyLibraryNavFrom = WarrantyLibraryFrom | FarmDetailFrom;

export type FarmDetailHrefOptions = {
  from?: FarmDetailFrom | null;
};

export type WarrantyLibraryHrefOptions = {
  from?: WarrantyLibraryNavFrom | null;
  /** Farm profile id — parents breadcrumbs when opened from Hồ sơ trại. */
  farm?: string | null;
  edit?: string | null;
};

export const NEW_LISTING_HREF = "/app/account/listings/new";
export const WARRANTY_LIBRARY_HREF = "/app/account/warranty";

export function farmTabI18nKey(tab: FarmDetailTab): `farm.tab.${FarmDetailTab}` {
  return `farm.tab.${tab}`;
}

export function parseFarmDetailTab(
  value: string | null | undefined,
): FarmDetailTab | null {
  if (!value) return null;
  return (FARM_DETAIL_TABS as readonly string[]).includes(value)
    ? (value as FarmDetailTab)
    : null;
}

export function parseFarmDetailFrom(
  value: string | null | undefined,
): FarmDetailFrom | null {
  return value === "account" ? "account" : null;
}

export function parseWarrantyLibraryFrom(
  value: string | null | undefined,
): WarrantyLibraryFrom | null {
  return value === "new-listing" ? "new-listing" : null;
}

export function parseWarrantyLibraryNavFrom(
  value: string | null | undefined,
): WarrantyLibraryNavFrom | null {
  return parseWarrantyLibraryFrom(value) ?? parseFarmDetailFrom(value);
}

/** Extra space under farm name for visitors (owner keeps tighter header with CTAs). */
export function farmNameMarginClass(isOwner: boolean): string {
  return isOwner ? "" : "mb-1.5";
}

/** Deep link into a farm profile tab (optional `from=account` for breadcrumbs). */
export function farmDetailHref(
  profileId: string,
  tab: FarmDetailTab = "overview",
  options?: FarmDetailHrefOptions,
): string {
  const base = `/app/breeders/${encodeURIComponent(profileId)}`;
  const params = new URLSearchParams();
  if (tab !== "overview") params.set("tab", tab);
  if (options?.from === "account") params.set("from", "account");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Account → “Xem hồ sơ trại” (breadcrumb parent = Account, not Top Breeders). */
export function farmProfileFromAccountHref(profileId: string): string {
  return farmDetailHref(profileId, "overview", { from: "account" });
}

/**
 * After save success: create-another stays on form.
 * From new listing → back to Đăng tin mới; otherwise farm warranty tab.
 */
export function warrantySaveNextHref(
  createAnother: boolean,
  profileId: string,
  options?: FarmDetailHrefOptions & {
    from?: WarrantyLibraryNavFrom | null;
  },
): string | null {
  if (createAnother) return null;
  if (options?.from === "new-listing") return NEW_LISTING_HREF;
  return farmDetailHref(profileId, "warranty", {
    from: options?.from === "account" ? "account" : null,
  });
}

/**
 * Warranty library URL.
 * - `from=new-listing` — opened from Đăng tin mới
 * - `from=account` + `farm` — opened from Hồ sơ trại (Account trail)
 * - `farm` alone — opened from public farm profile (Top Breeders trail)
 */
export function warrantyLibraryHref(
  options?: WarrantyLibraryHrefOptions,
): string {
  const params = new URLSearchParams();
  if (options?.from === "new-listing" || options?.from === "account") {
    params.set("from", options.from);
  }
  const farm = String(options?.farm || "").trim();
  if (farm) params.set("farm", farm);
  const edit = String(options?.edit || "").trim();
  if (edit) params.set("edit", edit);
  const qs = params.toString();
  return qs ? `${WARRANTY_LIBRARY_HREF}?${qs}` : WARRANTY_LIBRARY_HREF;
}

/** Open warranty library prefilled for editing a policy. */
export function warrantyLibraryEditHref(
  policyId: string,
  options?: Omit<WarrantyLibraryHrefOptions, "edit">,
): string {
  return warrantyLibraryHref({ ...options, edit: policyId });
}
