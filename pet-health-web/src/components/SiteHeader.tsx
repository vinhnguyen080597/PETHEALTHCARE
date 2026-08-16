"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { BRAND_AVATAR_PATH } from "@/lib/brand";
import { BrandWordmark } from "@/components/BrandWordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { MessagesUnreadBadge } from "@/components/MessagesUnreadBadge";
import { SITE_MAIN_NAV } from "@/lib/siteNav";

export function SiteHeader({
  lang,
  isAdmin = false,
  isLoggedIn = false,
  unreadNotificationCount = 0,
}: {
  lang: Lang;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  unreadNotificationCount?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [headerQ, setHeaderQ] = useState("");
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/");

  useEffect(() => {
    if (pathname.startsWith("/app/pet-feed")) {
      setHeaderQ(searchParams.get("q") || "");
    }
  }, [pathname, searchParams]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navCls = (href: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-amber-50 text-amber-800"
        : "text-stone-600 hover:bg-amber-50/60 hover:text-stone-900"
    }`;

  const submitHeaderSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = headerQ.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const qs = params.toString();
    router.push(qs ? `/app/pet-feed?${qs}` : "/app/pet-feed");
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#F0E6D8]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 h-16 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_AVATAR_PATH}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg object-cover shadow-sm shadow-amber-200/50"
          />
          <div className="hidden sm:block">
            <BrandWordmark text={t(lang, "nav.brand")} />
            {isAdmin && (
              <span className="ml-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </div>
        </Link>

        {!isAuthRoute && (
          <nav className="hidden md:flex items-center gap-1 flex-1 min-w-0">
            {SITE_MAIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navCls(item.matchHref)}
              >
                {t(lang, item.labelKey)}
              </Link>
            ))}
          </nav>
        )}
        {isAuthRoute && <div className="flex-1" />}

        <div className="flex items-center gap-1 ml-auto">
          {!isAuthRoute ? (
            <form
              onSubmit={submitHeaderSearch}
              className="hidden md:flex items-center mr-1"
              role="search"
            >
              <label htmlFor="header-pet-search" className="sr-only">
                {t(lang, "feed.search")}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6E5A51]/70 text-xs">
                  🔍
                </span>
                <input
                  id="header-pet-search"
                  type="search"
                  value={headerQ}
                  onChange={(e) => setHeaderQ(e.target.value)}
                  placeholder={t(lang, "feed.search")}
                  className="w-[180px] xl:w-[220px] h-9 rounded-full border border-[#F3E2C8] bg-white pl-8 pr-3 text-sm text-[#2B1E19] placeholder:text-[#6E5A51]/55 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]"
                />
              </div>
            </form>
          ) : null}

          {isLoggedIn && (
            <>
              <MessagesUnreadBadge label={t(lang, "nav.messages")} />
              <NotificationBell
                initialCount={unreadNotificationCount}
                label={t(lang, "nav.notifications")}
              />
            </>
          )}

          <div className="hidden sm:block">
            <LanguageSwitcher lang={lang} />
          </div>

          {isAdmin && (
            <Link
              href="/app/admin"
              className="hidden md:flex items-center gap-2 ml-1 px-3.5 py-1.5 bg-stone-900 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-colors"
            >
              {t(lang, "nav.admin")}
            </Link>
          )}

          {isLoggedIn ? (
            <Link
              href="/app/account"
              className="hidden md:flex items-center gap-2 ml-1 px-3.5 py-1.5 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309] transition-colors shadow-sm shadow-amber-200/60"
            >
              {t(lang, "nav.account")}
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden md:flex items-center gap-2 ml-1 px-3.5 py-1.5 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309] transition-colors shadow-sm shadow-amber-200/60"
            >
              {t(lang, "nav.login")}
            </Link>
          )}

          <button
            type="button"
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-amber-50"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M2 4.5h14M2 9h14M2 13.5h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-[#F0E6D8] bg-[#FDFBF7] px-5 py-3 flex flex-col gap-1">
          {!isAuthRoute && (
            <>
              <form
                onSubmit={(e) => {
                  submitHeaderSearch(e);
                  setMenuOpen(false);
                }}
                className="px-1 pb-2"
                role="search"
              >
                <input
                  type="search"
                  value={headerQ}
                  onChange={(e) => setHeaderQ(e.target.value)}
                  placeholder={t(lang, "feed.search")}
                  className="w-full h-10 rounded-xl border border-[#F3E2C8] bg-white px-3 text-sm text-[#2B1E19] placeholder:text-[#6E5A51]/55 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-[#D97706]"
                />
              </form>
              {SITE_MAIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-amber-50"
                >
                  {t(lang, item.labelKey)}
                </Link>
              ))}
            </>
          )}
          {isLoggedIn && (
            <>
              <Link
                href="/app/messages"
                onClick={() => setMenuOpen(false)}
                className="text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-amber-50"
              >
                {t(lang, "nav.messages")}
              </Link>
              <Link
                href="/app/notifications"
                onClick={() => setMenuOpen(false)}
                className="text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-amber-50"
              >
                {t(lang, "nav.notifications")}
              </Link>
            </>
          )}
          <Link
            href={isLoggedIn ? "/app/account" : "/login"}
            onClick={() => setMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            {isLoggedIn ? t(lang, "nav.account") : t(lang, "nav.login")}
          </Link>
          {isAdmin && (
            <Link
              href="/app/admin"
              onClick={() => setMenuOpen(false)}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-amber-50"
            >
              {t(lang, "nav.admin")}
            </Link>
          )}
          <LanguageSwitcher lang={lang} compact />
        </div>
      )}
    </header>
  );
}
