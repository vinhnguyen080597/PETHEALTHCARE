/** Shared brand mark for header, footer, and tab favicon. */
export const BRAND_AVATAR_PATH = "/images/PetMarketAvatar.png";

/** Marketplace amber — primary CTAs, focus rings, message bubbles. */
export const BRAND_PRIMARY = "#D97706";
export const BRAND_PRIMARY_HOVER = "#B45309";

/** Tailwind-friendly class snippets for brand accents (Messages, CTAs). */
export const brandUi = {
  primaryBg: "bg-[#D97706]",
  primaryBgHover: "hover:bg-[#B45309]",
  primaryText: "text-[#D97706]",
  primarySoftBg: "bg-amber-50",
  primaryFocusRing: "focus:ring-[#D97706]/20",
  primaryDot: "bg-[#D97706]",
} as const;
