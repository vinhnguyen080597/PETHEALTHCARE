"use client";

import Link from "next/link";
import type { Lang } from "@/lib/types";
import { MarketplaceSearchBar } from "./MarketplaceSearchBar";
import { loginHref } from "@/lib/loginHref";

export function HomeSearchSection({
  lang,
  requireLogin = false,
}: {
  lang: Lang;
  requireLogin?: boolean;
}) {
  return (
    <div className="hero-rise hero-rise-delay-3 max-w-xl mx-auto lg:mx-0">
      <MarketplaceSearchBar
        lang={lang}
        variant="hero"
        requireLogin={requireLogin}
      />
      <div className="flex flex-wrap gap-2 mt-4 justify-center lg:justify-start">
        {(
          [
            ["cat", lang === "VI" ? "Mèo" : "Cat"],
            ["dog", lang === "VI" ? "Chó" : "Dog"],
            ["bird", lang === "VI" ? "Chim" : "Bird"],
          ] as const
        ).map(([species, label]) => {
          const feedHref = `/app/pet-feed?species=${species}&from=home`;
          return (
            <Link
              key={species}
              href={requireLogin ? loginHref(feedHref) : feedHref}
              className="px-3.5 py-1.5 bg-white/70 border border-[#F0E6D8] hover:border-amber-300 hover:text-amber-800 text-stone-600 text-xs font-medium rounded-full transition-colors"
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
