/** Directory cards keep a reserved pets strip + a 2-column action row. */

export const BREEDER_CARD_PETS_PREVIEW_CLASS = "mt-4 min-h-[5.25rem]";
export const BREEDER_CARD_ACTIONS_CLASS = "mt-auto pt-5 grid grid-cols-2 gap-2";
export const BREEDER_CARD_ACTION_BTN_CLASS = "inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold";

export function breederCardHasPetPreview(thumbCount: number): boolean {
  return Number(thumbCount) > 0;
}

export function breederCardPetsPreviewTitleKey(
  thumbCount: number,
): "breeders.card.petsPreviewCount" | "breeders.card.petsPreviewEmpty" {
  return breederCardHasPetPreview(thumbCount)
    ? "breeders.card.petsPreviewCount"
    : "breeders.card.petsPreviewEmpty";
}

/** Visit stays half-width in column 2 so owner/visitor cards share one footer. */
export function breederCardVisitCtaClass(): "w-full" {
  return "w-full";
}
