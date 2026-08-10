/** Tabs on the public farm profile (`FarmDetail`). */
export const FARM_DETAIL_TABS = ["overview", "listings", "warranty"] as const;

export type FarmDetailTab = (typeof FARM_DETAIL_TABS)[number];

export type FarmDetailFrom = "account";

export type FarmDetailHrefOptions = {
  from?: FarmDetailFrom | null;
};

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

/** After save success: Có stays on form; Không returns to farm warranty tab. */
export function warrantySaveNextHref(
  createAnother: boolean,
  profileId: string,
  options?: FarmDetailHrefOptions,
): string | null {
  if (createAnother) return null;
  return farmDetailHref(profileId, "warranty", options);
}

/** Open warranty library prefilled for editing a policy. */
export function warrantyLibraryEditHref(policyId: string): string {
  return `/app/account/warranty?edit=${encodeURIComponent(policyId)}`;
}
