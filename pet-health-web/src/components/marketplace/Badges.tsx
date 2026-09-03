import type { TrustLevel, VerificationTier } from "@/lib/types";
import { SHOW_BREEDER_VERIFICATION_BADGES } from "@/lib/breederVerificationUi";

export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "xs" }) {
  if (!SHOW_BREEDER_VERIFICATION_BADGES) return null;
  const cls =
    size === "sm" ? "text-xs px-2 py-0.5" : "text-[10px] px-1.5 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-200 ${cls}`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="5" fill="#059669" />
        <path
          d="M3 5l1.5 1.5L7 3.5"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified
    </span>
  );
}

export function PendingBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium border border-amber-200">
      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
      Chờ duyệt
    </span>
  );
}

export function TrustLevelChip({
  level,
  label,
  showLevelPrefix = true,
}: {
  level: TrustLevel;
  showLevelPrefix?: boolean;
  label: string;
}) {
  const colorMap: Record<TrustLevel, string> = {
    L0: "bg-red-100 text-red-800 border-red-300",
    L1: "bg-red-50 text-red-700 border-red-200",
    L2: "bg-orange-50 text-orange-700 border-orange-200",
    L3: "bg-amber-50 text-amber-800 border-amber-200",
    L4: "bg-emerald-50 text-emerald-700 border-emerald-200",
    L5: "bg-emerald-100 text-emerald-900 border-emerald-300",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${colorMap[level]}`}
    >
      {showLevelPrefix ? `${level} · ${label}` : label}
    </span>
  );
}

const TIER_STYLES: Record<VerificationTier, string> = {
  1: "bg-slate-100 text-slate-700 border-slate-200",
  2: "bg-blue-50 text-[#1E6FE8] border-blue-200",
  3: "bg-amber-50 text-amber-800 border-amber-200",
};

const TIER_LABEL: Record<VerificationTier, { vi: string; en: string }> = {
  1: { vi: "Tier 1 · Danh tính", en: "Tier 1 · Identity" },
  2: { vi: "Tier 2 · Trại đã xác minh", en: "Tier 2 · Kennel verified" },
  3: { vi: "Tier 3 · Ưu tú", en: "Tier 3 · Elite" },
};

export function VerificationTierBadge({
  tier,
  lang = "VI",
  size = "sm",
}: {
  tier: VerificationTier;
  lang?: "VI" | "EN";
  size?: "sm" | "xs";
}) {
  const cls =
    size === "sm" ? "text-xs px-2.5 py-1" : "text-[10px] px-1.5 py-0.5";
  const label = lang === "VI" ? TIER_LABEL[tier].vi : TIER_LABEL[tier].en;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border ${TIER_STYLES[tier]} ${cls}`}
    >
      {tier === 3 ? "👑" : tier === 2 ? "🏡" : "🪪"} {label}
    </span>
  );
}

/** Escrow deposit chip — terms-based hold, not a medical warranty. */
export function EscrowBadge({
  lang = "VI",
  size = "sm",
  days = 7,
}: {
  lang?: "VI" | "EN";
  size?: "sm" | "xs";
  days?: number;
}) {
  const cls =
    size === "sm" ? "text-xs px-2.5 py-1" : "text-[10px] px-1.5 py-0.5";
  const label =
    lang === "VI"
      ? `Cọc Escrow · ${days} ngày`
      : `Escrow · ${days} days`;
  return (
    <span
      className={`inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 rounded-full font-semibold border border-emerald-200 shadow-sm ${cls}`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
        <path
          d="M6 1.2 9.5 2.7v2.6c0 2.4-1.6 3.9-3.5 4.5-1.9-.6-3.5-2.1-3.5-4.5V2.7L6 1.2Z"
          stroke="#059669"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M4.3 6.1 5.5 7.3 7.8 4.8"
          stroke="#059669"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  );
}
