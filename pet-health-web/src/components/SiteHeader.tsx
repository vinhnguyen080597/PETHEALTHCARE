"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

export function SiteHeader({
  lang,
  isAdmin = false,
  isLoggedIn = false,
  unreadCount = 0,
}: {
  lang: Lang;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  unreadCount?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const toggleLang = async () => {
    const next = lang === "VI" ? "EN" : "VI";
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: next }),
    });
    router.refresh();
  };

  const navCls = (href: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-blue-50 text-[#1E6FE8]"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 h-16 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-[#1E6FE8] rounded-lg flex items-center justify-center">
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
            <span className="font-bold text-slate-900 text-sm">
              {t(lang, "nav.brand")}
            </span>
            {isAdmin && (
              <span className="ml-1.5 text-[10px] font-semibold text-[#1E6FE8] bg-blue-50 px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          <Link href="/app/pet-feed" className={navCls("/app/pet-feed")}>
            {t(lang, "nav.browse")}
          </Link>
          <Link href="/app/breeders" className={navCls("/app/breeders")}>
            {t(lang, "nav.breeders")}
          </Link>
        </nav>

        <div className="hidden lg:flex flex-1 max-w-xs">
          <form action="/app/pet-feed" className="w-full relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="6" cy="6" r="4" />
              <path d="m9.5 9.5 2.5 2.5" strokeLinecap="round" />
            </svg>
            <input
              name="q"
              type="text"
              placeholder={t(lang, "nav.search")}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6FE8]/20 focus:border-[#1E6FE8] transition-all"
            />
          </form>
        </div>

        <div className="flex items-center gap-1 ml-auto md:ml-0">
          <Link
            href="/app/messages"
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
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
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#EF4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleLang}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors border border-slate-200"
          >
            {lang === "VI" ? "EN" : "VI"}
          </button>

          {isAdmin && (
            <Link
              href="/app/admin"
              className="hidden md:flex items-center gap-2 ml-1 px-3.5 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-colors"
            >
              {t(lang, "nav.admin")}
            </Link>
          )}

          {isLoggedIn ? (
            <Link
              href="/app/account"
              className="hidden md:flex items-center gap-2 ml-1 px-3.5 py-1.5 bg-[#1E6FE8] text-white text-sm font-medium rounded-full hover:bg-[#1D4ED8] transition-colors"
            >
              {t(lang, "nav.account")}
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden md:flex items-center gap-2 ml-1 px-3.5 py-1.5 bg-[#1E6FE8] text-white text-sm font-medium rounded-full hover:bg-[#1D4ED8] transition-colors"
            >
              {t(lang, "nav.login")}
            </Link>
          )}

          <button
            type="button"
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-50"
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
        <div className="md:hidden border-t border-slate-100 bg-white px-5 py-3 flex flex-col gap-1">
          <Link
            href="/app/pet-feed"
            onClick={() => setMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t(lang, "nav.browse")}
          </Link>
          <Link
            href="/app/breeders"
            onClick={() => setMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t(lang, "nav.breeders")}
          </Link>
          <Link
            href="/app/messages"
            onClick={() => setMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t(lang, "nav.messages")}
          </Link>
          <Link
            href={isLoggedIn ? "/app/account" : "/login"}
            onClick={() => setMenuOpen(false)}
            className="text-left px-3 py-2 rounded-lg text-sm font-medium text-[#1E6FE8] hover:bg-blue-50"
          >
            {isLoggedIn ? t(lang, "nav.account") : t(lang, "nav.login")}
          </Link>
          {isAdmin && (
            <Link
              href="/app/admin"
              onClick={() => setMenuOpen(false)}
              className="text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t(lang, "nav.admin")}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
