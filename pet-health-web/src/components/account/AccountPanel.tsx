"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t } from "@/i18n";

export function AccountPanel({
  lang,
  displayName,
  email,
  savedCount,
  myListingsCount,
  breederProfileId,
}: {
  lang: Lang;
  displayName?: string;
  email?: string;
  savedCount: number;
  myListingsCount: number;
  breederProfileId?: string | null;
}) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        {t(lang, "account.title")}
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        {displayName || email || "—"}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <p className="text-3xl font-bold text-[#1E6FE8]">{savedCount}</p>
          <p className="text-xs text-slate-500 mt-1">{t(lang, "account.saved")}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <p className="text-3xl font-bold text-slate-900">{myListingsCount}</p>
          <p className="text-xs text-slate-500 mt-1">
            {t(lang, "account.myListings")}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
        <Link
          href="/app/account/listings/new"
          className="block px-5 py-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          + {t(lang, "account.newListing")}
        </Link>
        {breederProfileId ? (
          <Link
            href={`/app/breeders/${breederProfileId}`}
            className="block px-5 py-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            {t(lang, "account.breederProfile")}
          </Link>
        ) : null}
        <Link
          href="/app/account/breeder/template"
          className="block px-5 py-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {t(lang, "account.template")}
        </Link>
        <Link
          href="/app/messages"
          className="block px-5 py-4 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {t(lang, "messages.title")}
        </Link>
      </div>

      <button
        type="button"
        onClick={logout}
        className="mt-8 w-full py-3 border border-slate-200 text-slate-600 text-sm font-medium rounded-full hover:bg-white"
      >
        {t(lang, "auth.logout")}
      </button>
    </div>
  );
}
