"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationBell } from "@/components/NotificationBell";

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
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/");

  const browseHref = "/app/pet-feed";
  const breedersHref = "/app/breeders";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const navCls = (href: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-amber-50 text-amber-800"
        : "text-stone-600 hover:bg-amber-50/60 hover:text-stone-900"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#F0E6D8]">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 h-16 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-[#D97706] rounded-lg flex items-center justify-center shadow-sm shadow-amber-200/50">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 2C5.13 2 2 5.13 2 9c0 3.87 3.13 7 7 7s7-3.13 7-7c0-3.87-3.13-7-7-7Z"
                fill="white"
                opacity=".25"
              />
              <circle cx="6.5" cy="8" r="1.5" fill="white" />
              <circle cx="11.5" cy="8" r="1.5" fill="white" />
              <path
                d="M7 11.5c.5.5 1 .75 2 .75s1.5-.25 2-.75"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-stone-900 text-sm tracking-tight">
              {t(lang, "nav.brand")}
            </span>
            {isAdmin && (
              <span className="ml-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </div>
        </Link>

        {!isAuthRoute && (
          <nav className="hidden md:flex items-center gap-1 flex-1">
            <Link href={browseHref} className={navCls("/app/pet-feed")}>
              {t(lang, "nav.browse")}
            </Link>
            <Link href={breedersHref} className={navCls("/app/breeders")}>
              {t(lang, "nav.breeders")}
            </Link>
          </nav>
        )}
        {isAuthRoute && <div className="flex-1" />}

        <div className="flex items-center gap-1 ml-auto">
          {isLoggedIn && (
            <>
              <Link
                href="/app/messages"
                className="relative w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-amber-50 hover:text-stone-900 transition-colors"
                aria-label={t(lang, "nav.messages")}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M15.5 11.5c0 .83-.67 1.5-1.5 1.5H5.5L2.5 15.5v-12C2.5 2.67 3.17 2 4 2h10c.83 0 1.5.67 1.5 1.5v8Z" />
                </svg>
              </Link>
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
              <Link
                href={browseHref}
                onClick={() => setMenuOpen(false)}
                className="text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-amber-50"
              >
                {t(lang, "nav.browse")}
              </Link>
              <Link
                href={breedersHref}
                onClick={() => setMenuOpen(false)}
                className="text-left px-3 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-amber-50"
              >
                {t(lang, "nav.breeders")}
              </Link>
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
