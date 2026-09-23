import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3.25 3.25 0 0 1 0 6.26"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 19 6v5.5c0 4.4-2.9 7.4-7 8.5-4.1-1.1-7-4.1-7-8.5V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.1 11 14l3.8-4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchCheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m15 15 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8.2 10.6 9.8 12.2 13 9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CARDS = [
  {
    Icon: UsersIcon,
    titleKey: "landing.value1.title" as const,
    descKey: "landing.value1.desc" as const,
    badgeKey: "landing.value1.badge" as const,
  },
  {
    Icon: ShieldCheckIcon,
    titleKey: "landing.value2.title" as const,
    descKey: "landing.value2.desc" as const,
    badgeKey: "landing.value2.badge" as const,
  },
  {
    Icon: SearchCheckIcon,
    titleKey: "landing.value3.title" as const,
    descKey: "landing.value3.desc" as const,
    badgeKey: "landing.value3.badge" as const,
  },
] as const;

export function HomeValueProps({ lang }: { lang: Lang }) {
  return (
    <section className="bg-[#FDFBF7] max-w-[1200px] mx-auto px-5 lg:px-8 py-16">
      <h2 className="font-display text-2xl lg:text-3xl font-semibold text-[#2B1E19] text-center mb-3 tracking-tight">
        {t(lang, "landing.why")}
      </h2>
      <p className="text-[#2B1E19]/55 text-center mb-10 text-sm max-w-3xl mx-auto">
        {t(lang, "landing.whySub")}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {CARDS.map(({ Icon, titleKey, descKey, badgeKey }) => (
          <article
            key={titleKey}
            className="relative group bg-white border border-[#F3E2C8] rounded-2xl p-6 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(217,119,6,0.45)] transition-all duration-300"
          >
            <span className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] text-[10px] font-semibold border border-[#FDE68A]">
              {t(lang, badgeKey)}
            </span>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center mb-4 border border-amber-100 group-hover:bg-[#D97706] group-hover:text-white transition-colors">
              <Icon />
            </div>
            <h3 className="font-semibold text-[#2B1E19] text-base mb-2 leading-snug pr-16">
              {t(lang, titleKey)}
            </h3>
            <p className="text-[#2B1E19]/55 text-sm leading-relaxed">{t(lang, descKey)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
