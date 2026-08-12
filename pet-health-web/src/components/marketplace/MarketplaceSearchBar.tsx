"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { resolveProvinceSelection } from "@/lib/vietnamProvinceSelection";
import { VIETNAM_PROVINCES } from "@/constants/vietnamProvinces";
import { loginHref } from "@/lib/loginHref";
import { LISTING_SPECIES } from "@/lib/listingFormOptions";

export const SEARCH_MORPH_KEY = "phc-search-morph";

export type SearchMorphPayload = {
  rect: { top: number; left: number; width: number; height: number };
  scrollY: number;
};

export function saveSearchMorph(el: HTMLElement | null) {
  if (!el || typeof window === "undefined") return;
  const rect = el.getBoundingClientRect();
  const payload: SearchMorphPayload = {
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    scrollY: window.scrollY,
  };
  try {
    sessionStorage.setItem(SEARCH_MORPH_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function consumeSearchMorph(): SearchMorphPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SEARCH_MORPH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SEARCH_MORPH_KEY);
    return JSON.parse(raw) as SearchMorphPayload;
  } catch {
    return null;
  }
}

type Props = {
  lang: Lang;
  variant: "hero" | "feed";
  q?: string;
  species?: string;
  province?: string;
  onQChange?: (value: string) => void;
  onSpeciesChange?: (value: string) => void;
  onProvinceChange?: (value: string) => void;
  /** Controlled mode for feed (no navigate on submit). */
  controlled?: boolean;
  /** Guests on homepage: submit → /login?next=feed url. */
  requireLogin?: boolean;
};

export function MarketplaceSearchBar({
  lang,
  variant,
  q = "",
  species = "",
  province = "",
  onQChange,
  onSpeciesChange,
  onProvinceChange,
  controlled = false,
  requireLogin = false,
}: Props) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [localQ, setLocalQ] = useState(q);
  const [localSpecies, setLocalSpecies] = useState(species === "all" ? "" : species);
  const [localProvince, setLocalProvince] = useState(resolveProvinceSelection(province));
  const [morphing, setMorphing] = useState(false);

  useEffect(() => {
    setLocalQ(q);
  }, [q]);
  useEffect(() => {
    setLocalSpecies(species === "all" ? "" : species);
  }, [species]);
  useEffect(() => {
    setLocalProvince(resolveProvinceSelection(province));
  }, [province]);

  useEffect(() => {
    if (variant !== "feed" || !panelRef.current) return;
    const payload = consumeSearchMorph();
    if (!payload) return;

    const el = panelRef.current;
    const first = payload.rect;
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const sx = first.width / Math.max(last.width, 1);
    const sy = first.height / Math.max(last.height, 1);

    el.style.transformOrigin = "top left";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    el.style.opacity = "0.92";
    el.style.transition = "none";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition =
          "transform 480ms cubic-bezier(0.22, 1, 0.36, 1), opacity 360ms ease";
        el.style.transform = "translate(0, 0) scale(1, 1)";
        el.style.opacity = "1";
      });
    });

    const clear = () => {
      el.style.transition = "";
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.style.opacity = "";
    };
    el.addEventListener("transitionend", clear, { once: true });
    return () => el.removeEventListener("transitionend", clear);
  }, [variant]);

  const buildUrl = () => {
    const params = new URLSearchParams();
    const query = controlled ? q : localQ;
    const sp = controlled ? (species === "all" ? "" : species) : localSpecies;
    const pv = controlled ? province : localProvince;
    if (query.trim()) params.set("q", query.trim());
    if (sp) params.set("species", sp);
    if (pv) params.set("province", pv);
    params.set("from", "home");
    const qs = params.toString();
    return `/app/pet-feed${qs ? `?${qs}` : ""}`;
  };

  const navigateWithMorph = () => {
    const url = buildUrl();
    if (requireLogin) {
      router.push(loginHref(url));
      return;
    }
    saveSearchMorph(panelRef.current);
    setMorphing(true);
    const go = () => router.push(url);
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (typeof doc.startViewTransition === "function") {
      doc.startViewTransition(go);
    } else {
      go();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (controlled) {
      // Feed page: filters already live-update via controlled state
      return;
    }
    navigateWithMorph();
  };

  const selectCls =
    "appearance-none w-full pl-3 pr-10 py-2.5 bg-[#FDFBF7] border border-[#F0E6D8] rounded-xl text-sm text-[#2B1E19] focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]";

  return (
    <div
      ref={panelRef}
      className={`rounded-2xl bg-white/95 border border-[#F0E6D8] shadow-[0_12px_40px_-18px_rgba(180,83,9,0.35)] p-2 sm:p-2.5 ${
        morphing ? "opacity-90" : ""
      }`}
      style={{ viewTransitionName: "marketplace-search" } as CSSProperties}
    >
      <form onSubmit={onSubmit}>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D97706]/80"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m11 11 2.5 2.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={controlled ? q : localQ}
              onChange={(e) => {
                const v = e.target.value;
                if (controlled) onQChange?.(v);
                else setLocalQ(v);
              }}
              placeholder={t(lang, "landing.searchPlaceholder")}
              className="w-full pl-10 pr-3 py-3 bg-transparent text-sm text-[#2B1E19] placeholder:text-stone-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-[#D97706] text-white text-sm font-semibold rounded-xl hover:bg-[#B45309] transition-colors shadow-md shadow-amber-200/70 whitespace-nowrap"
          >
            {t(lang, "landing.search")}
          </button>
        </div>
        <div className="mt-2 pt-2 border-t border-[#F5EDE3]">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-2 w-full ${
              variant === "feed" ? "sm:w-1/2 sm:ml-auto" : ""
            }`}
          >
          <label className="sr-only" htmlFor={`search-species-${variant}`}>
            {t(lang, "landing.species")}
          </label>
          <select
            id={`search-species-${variant}`}
            value={controlled ? (species === "all" ? "" : species) : localSpecies}
            onChange={(e) => {
              const v = e.target.value;
              if (controlled) onSpeciesChange?.(v || "all");
              else setLocalSpecies(v);
            }}
            className={selectCls}
          >
            <option value="">{t(lang, "landing.species.all")}</option>
            {LISTING_SPECIES.map((id) => (
              <option key={id} value={id}>
                {t(lang, `listing.new.species.${id}`)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`search-province-${variant}`}>
            {t(lang, "landing.province")}
          </label>
          <select
            id={`search-province-${variant}`}
            value={controlled ? province : localProvince}
            onChange={(e) => {
              const v = resolveProvinceSelection(e.target.value);
              if (controlled) onProvinceChange?.(v);
              else setLocalProvince(v);
            }}
            className={selectCls}
          >
            <option value="">{t(lang, "landing.province.all")}</option>
            {VIETNAM_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          </div>
        </div>
      </form>
    </div>
  );
}
