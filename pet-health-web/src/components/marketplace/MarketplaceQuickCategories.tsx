"use client";

import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import {
  MARKETPLACE_QUICK_CATEGORIES,
  type QuickCategoryId,
} from "@/lib/marketplaceQuickCategories";

const LABEL_KEYS: Record<QuickCategoryId, EnKey> = {
  all: "feed.quick.all",
  british_shorthair: "feed.quick.british_shorthair",
  corgi: "feed.quick.corgi",
  poodle: "feed.quick.poodle",
  munchkin: "feed.quick.munchkin",
  just_arrived: "feed.quick.just_arrived",
};

export function MarketplaceQuickCategories({
  lang,
  value,
  onChange,
}: {
  lang: Lang;
  value: QuickCategoryId;
  onChange: (id: QuickCategoryId) => void;
}) {
  return (
    <div className="mb-5 -mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2 px-1">
        {MARKETPLACE_QUICK_CATEGORIES.map((cat) => {
          const active = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all ${
                active
                  ? "border-[#EA580C] bg-[#FFF7ED] text-[#9A3412] shadow-sm shadow-orange-200/70"
                  : "border-[#F3E2C8] bg-white text-[#2B1E19]/80 hover:border-amber-300 hover:bg-[#FDFBF7]"
              }`}
              aria-pressed={active}
            >
              <span aria-hidden>{cat.emoji}</span>
              {t(lang, LABEL_KEYS[cat.id])}
            </button>
          );
        })}
      </div>
    </div>
  );
}
