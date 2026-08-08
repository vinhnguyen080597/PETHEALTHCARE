/** Tabs on the public farm profile (`FarmDetail`). */
export const FARM_DETAIL_TABS = ["overview", "listings", "warranty"] as const;

export type FarmDetailTab = (typeof FARM_DETAIL_TABS)[number];

export function farmTabI18nKey(tab: FarmDetailTab): `farm.tab.${FarmDetailTab}` {
  return `farm.tab.${tab}`;
}
