import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

function ShieldIcon() {
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

function VerifiedHealthIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8.5 12.2 11 14.7 15.5 9.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.8 8.2 12 3.8l8.2 4.4v8.8L12 21.4 3.8 17V8.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 12v9.2M3.8 8.2 12 12l8.2-3.8" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

const ICONS = [ShieldIcon, VerifiedHealthIcon, PackageIcon] as const;

export function HomeValueProps({ lang }: { lang: Lang }) {
  const items = [
    {
      titleKey: "landing.value1.title" as const,
      descKey: "landing.value1.desc" as const,
      comingSoon: true,
    },
    {
      titleKey: "landing.value2.title" as const,
      descKey: "landing.value2.desc" as const,
      comingSoon: false,
    },
    {
      titleKey: "landing.value3.title" as const,
      descKey: "landing.value3.desc" as const,
      comingSoon: true,
    },
  ];

  return (
    <section className="bg-[#FDFBF7] max-w-[1200px] mx-auto px-5 lg:px-8 py-16">
      <h2 className="font-display text-2xl lg:text-3xl font-semibold text-[#2B1E19] text-center mb-3 tracking-tight">
        {t(lang, "landing.why")}
      </h2>
      <p className="text-[#2B1E19]/55 text-center mb-10 text-sm max-w-xl mx-auto">
        {t(lang, "landing.whySub")}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <article
              key={item.titleKey}
              className="relative group bg-white border border-[#F3E2C8] rounded-2xl p-6 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(217,119,6,0.45)] transition-all duration-300"
            >
              {item.comingSoon && (
                <span className="absolute top-3 right-3 inline-flex items-center px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] text-[10px] font-semibold border border-[#FDE68A]">
                  {t(lang, "landing.value.comingSoon")}
                </span>
              )}
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center mb-4 border border-amber-100 group-hover:bg-[#D97706] group-hover:text-white transition-colors">
                <Icon />
              </div>
              <h3 className="font-semibold text-[#2B1E19] text-base mb-2 leading-snug">
                {t(lang, item.titleKey)}
              </h3>
              <p className="text-[#2B1E19]/55 text-sm leading-relaxed">
                {t(lang, item.descKey)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
