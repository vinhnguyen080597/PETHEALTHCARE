import type { TrustLevel } from "@/lib/types";

export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "xs" }) {
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
}: {
  level: TrustLevel;
  label: string;
}) {
  const colorMap: Record<TrustLevel, string> = {
    L0: "bg-slate-100 text-slate-500 border-slate-200",
    L1: "bg-blue-50 text-blue-600 border-blue-200",
    L2: "bg-emerald-50 text-emerald-700 border-emerald-200",
    L3: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${colorMap[level]}`}
    >
      {level} · {label}
    </span>
  );
}
