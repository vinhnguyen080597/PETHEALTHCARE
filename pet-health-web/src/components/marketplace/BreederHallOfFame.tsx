"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Lang } from "@/lib/types";
import {
  breederCardSpecialtyLabel,
  getBreederCardMetrics,
} from "@/lib/breederCardMetrics";
import {
  hallOfFameMonthKey,
  type HallOfFameEntry,
} from "@/lib/marketplaceFeedSections";
import { hallOfFameFarmDetailHref } from "@/lib/listingOwnerActions";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";
import { t, type EnKey } from "@/i18n";

const MEDAL_EMOJI = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
} as const;

const MEDAL_RING = {
  gold: "border-amber-400 ring-amber-300/80 bg-gradient-to-br from-[#FFFBEB] to-white",
  silver: "border-slate-300 ring-slate-200/80 bg-gradient-to-br from-slate-50 to-white",
  bronze: "border-orange-300 ring-orange-200/70 bg-gradient-to-br from-[#FFF7ED] to-white",
} as const;

const MEDAL_I18N: Record<HallOfFameEntry["medal"], EnKey> = {
  gold: "breeders.hall.medal.gold",
  silver: "breeders.hall.medal.silver",
  bronze: "breeders.hall.medal.bronze",
};

function HallOfFameCardBody({
  lang,
  entry,
}: {
  lang: Lang;
  entry: HallOfFameEntry;
}) {
  const { breeder, medal } = entry;
  const metrics = getBreederCardMetrics(breeder);
  return (
    <>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={breeder.avatar}
          alt={breeder.name}
          className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-md bg-white"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#9A3412]">
            {MEDAL_EMOJI[medal]} {t(lang, MEDAL_I18N[medal])}
          </p>
          <h3 className="mt-0.5 font-bold text-[#2B1E19] truncate">
            {breeder.name}
          </h3>
          <p className="text-xs text-[#6E5A51] truncate mt-0.5">
            {breederCardSpecialtyLabel(breeder, lang)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#2B1E19]/80">
        {metrics.rating != null && metrics.reviewCount > 0 ? (
          <span>
            ⭐ {metrics.rating.toFixed(1)}/5 ({metrics.reviewCount})
          </span>
        ) : null}
        <span>🛡️ {metrics.trustScore}/100</span>
        <span>⚖️ {metrics.complianceScore}/100</span>
      </div>
    </>
  );
}

function HallOfFameCardShell({
  medal,
  href,
  children,
}: {
  medal: HallOfFameEntry["medal"];
  href: string | null;
  children: ReactNode;
}) {
  const baseClassName = `w-[280px] sm:w-[300px] shrink-0 snap-start rounded-2xl border-2 ring-1 p-4 ${MEDAL_RING[medal]}`;
  if (!href) {
    return <div className={baseClassName}>{children}</div>;
  }
  return (
    <Link
      href={href}
      className={`${baseClassName} transition-transform hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-22px_rgba(217,119,6,0.45)]`}
    >
      {children}
    </Link>
  );
}

export function BreederHallOfFame({
  lang,
  entries,
}: {
  lang: Lang;
  entries: HallOfFameEntry[];
}) {
  const dock = useOptionalChatDock();
  if (!entries.length) return null;
  const month = hallOfFameMonthKey();
  const title = t(lang, "breeders.hall.title").replaceAll("{{month}}", month);

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="font-display text-xl font-semibold text-[#2B1E19] tracking-tight">
          👑 {title}
        </h2>
        <p className="mt-1 text-sm text-[#6E5A51]">
          {t(lang, "breeders.hall.subtitle")}
        </p>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {entries.map((entry) => (
          <HallOfFameCardShell
            key={entry.breeder.id}
            medal={entry.medal}
            href={hallOfFameFarmDetailHref(
              dock?.currentUserId,
              entry.breeder.userId,
              entry.breeder.id,
            )}
          >
            <HallOfFameCardBody lang={lang} entry={entry} />
          </HallOfFameCardShell>
        ))}
      </div>
    </section>
  );
}
