"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { CancelBreederButton } from "./CancelBreederButton";
import { farmProfileFromAccountHref } from "@/lib/farmTabs";

export type AccountListingItem = {
  id: string;
  title: string;
  breed?: string;
  location?: string;
  status: string;
  thumbUrl?: string | null;
};

export type AccountBreederInfo = {
  id: string;
  displayName?: string;
  location?: string;
  primarySpecies?: string[];
  verificationStatus: string;
};

function statusTone(status: string) {
  if (status === "published" || status === "verified") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "pending_review") {
    return "bg-amber-50 text-amber-800";
  }
  if (status === "suspended" || status === "rejected" || status === "archived") {
    return "bg-red-50 text-red-700";
  }
  return "bg-stone-100 text-stone-600";
}

function listingStatusKey(status: string): EnKey {
  const known = [
    "draft",
    "pending_review",
    "published",
    "deposit_hold",
    "archived",
    "sold",
  ] as const;
  const s = (known as readonly string[]).includes(status) ? status : "draft";
  return `listing.status.${s}` as EnKey;
}

function breederStatusKey(status: string): EnKey {
  const known = [
    "unverified",
    "pending_review",
    "verified",
    "rejected",
    "suspended",
  ];
  const s = known.includes(status) ? status : "unverified";
  return `account.breederRequestStatus.${s}` as EnKey;
}

function senHelperKey(status: string): EnKey {
  const known = [
    "unverified",
    "pending_review",
    "verified",
    "rejected",
    "suspended",
  ];
  const s = known.includes(status) ? status : "unverified";
  return `account.senStatus.helper.${s}` as EnKey;
}

function roleTitleKey(role: string): EnKey {
  const known = ["sen", "breeder", "admin", "vet"];
  const r = known.includes(role) ? role : "sen";
  return `account.roles.${r}.title` as EnKey;
}

export function AccountPanel({
  lang,
  displayName,
  email,
  role,
  isAdmin,
  savedCount,
  myListings,
  breeder,
}: {
  lang: Lang;
  displayName?: string;
  email?: string;
  role: string;
  isAdmin: boolean;
  savedCount: number;
  myListings: AccountListingItem[];
  breeder: AccountBreederInfo | null;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isSen = role === "sen" || (!isAdmin && role !== "breeder" && role !== "vet");
  const isBreeder = role === "breeder";
  const breederStatus = breeder?.verificationStatus || "unverified";
  const pendingRequest = breederStatus === "pending_review";
  const verifiedBreeder = isBreeder && breederStatus === "verified";
  const canManageListings = verifiedBreeder || isAdmin;

  const publishedCount = myListings.filter((p) => p.status === "published").length;
  const pendingCount = myListings.filter(
    (p) => p.status === "pending_review",
  ).length;

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/auth/me", { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setDeleteError(json.error || t(lang, "account.deleteAccount.failed"));
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setDeleteError(t(lang, "account.deleteAccount.failed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-10">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#D97706] mb-1">
            {t(lang, roleTitleKey(isAdmin ? "admin" : role))}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#2B1E19]">
            {t(lang, "account.title")}
          </h1>
          <p className="mt-1 text-sm text-[#5C4A3A]">
            {isAdmin
              ? t(lang, "account.adminSubtitle")
              : isBreeder
                ? t(lang, "account.breederSubtitle")
                : t(lang, "account.subtitle")}
          </p>
          <p className="mt-2 text-sm text-stone-500">
            {displayName || email || "—"}
            {email && displayName ? (
              <span className="text-stone-400"> · {email}</span>
            ) : null}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="space-y-5">
            {isSen && !isAdmin ? (
              <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm shadow-amber-100/40">
                <h2 className="text-base font-bold text-[#2B1E19]">
                  {t(lang, "account.senIntro.title")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#5C4A3A]">
                  {t(lang, "account.senIntro.body")}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/app/pet-feed"
                    className="min-w-[140px] flex-1 text-center rounded-xl border border-amber-100 bg-amber-50 py-3 text-sm font-bold text-[#B45309] hover:bg-amber-100"
                  >
                    {t(lang, "account.senIntro.petFeedCta")}
                  </Link>
                  {pendingRequest ? (
                    <CancelBreederButton lang={lang} />
                  ) : (
                    <Link
                      href="/app/account/breeder"
                      className="min-w-[140px] flex-1 text-center rounded-xl bg-[#D97706] py-3 text-sm font-bold text-white hover:bg-[#B45309] shadow-sm shadow-amber-200/60"
                    >
                      {breederStatus === "rejected" ||
                      breederStatus === "unverified"
                        ? t(lang, "account.senIntro.breederCta")
                        : t(lang, "account.breederTrust.editProfile")}
                    </Link>
                  )}
                </div>
              </section>
            ) : null}

            {isBreeder ? (
              <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm shadow-amber-100/40">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-[#2B1E19]">
                    {breeder?.displayName ||
                      displayName ||
                      t(lang, "account.breederTrust.untitled")}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(breederStatus)}`}
                  >
                    {t(lang, breederStatusKey(breederStatus))}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#5C4A3A]">
                  {[
                    breeder?.location,
                    breeder?.primarySpecies?.filter(Boolean).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ") || t(lang, "account.breederTrust.missingInfo")}
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  {t(lang, "account.breederTrust.note")}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-[#FDFBF7] border border-[#F0E6D8] p-3 text-center">
                    <p className="text-lg font-bold text-[#2B1E19]">
                      {myListings.length}
                    </p>
                    <p className="text-[10px] font-semibold uppercase text-stone-500">
                      {t(lang, "account.breederMetrics.total")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#FDFBF7] border border-[#F0E6D8] p-3 text-center">
                    <p className="text-lg font-bold text-[#2B1E19]">
                      {publishedCount}
                    </p>
                    <p className="text-[10px] font-semibold uppercase text-stone-500">
                      {t(lang, "account.breederMetrics.published")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#FDFBF7] border border-[#F0E6D8] p-3 text-center">
                    <p className="text-lg font-bold text-[#2B1E19]">
                      {pendingCount}
                    </p>
                    <p className="text-[10px] font-semibold uppercase text-stone-500">
                      {t(lang, "account.breederMetrics.pending")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {breeder?.id ? (
                    <Link
                      href={farmProfileFromAccountHref(breeder.id)}
                      className="text-center rounded-xl border border-amber-200 bg-white py-3 text-sm font-bold text-[#B45309] hover:bg-amber-50"
                    >
                      {t(lang, "account.breederTrust.viewFarmProfile")}
                    </Link>
                  ) : null}
                  {verifiedBreeder ? (
                    <Link
                      href="/app/account/listings/new"
                      className="text-center rounded-xl bg-[#D97706] py-3 text-sm font-bold text-white hover:bg-[#B45309]"
                    >
                      {t(lang, "account.createPost")}
                    </Link>
                  ) : (
                    <Link
                      href="/app/account/breeder"
                      className="text-center rounded-xl bg-[#D97706] py-3 text-sm font-bold text-white hover:bg-[#B45309]"
                    >
                      {t(lang, "account.breederTrust.updateProfile")}
                    </Link>
                  )}
                </div>

                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
                  {t(lang, "account.breederSafety")}
                </p>
              </section>
            ) : null}

            {isAdmin ? (
              <section className="rounded-2xl border border-amber-100 bg-white p-5">
                <h2 className="text-base font-bold text-[#2B1E19]">
                  {t(lang, "account.roles.admin.title")}
                </h2>
                <p className="mt-1 text-sm text-[#5C4A3A]">
                  {t(lang, "account.adminSubtitle")}
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <Link
                    href="/app/admin"
                    className="flex-1 text-center rounded-xl bg-[#D97706] py-3 text-sm font-bold text-white hover:bg-[#B45309]"
                  >
                    {t(lang, "account.openAdminReview")}
                  </Link>
                  <Link
                    href="/app/account/listings/new"
                    className="flex-1 text-center rounded-xl border border-amber-200 py-3 text-sm font-bold text-[#B45309] hover:bg-amber-50"
                  >
                    {t(lang, "account.createPost")}
                  </Link>
                </div>
              </section>
            ) : null}

            {isSen && !isAdmin ? (
              <section className="rounded-2xl border border-amber-200 bg-white p-5">
                <h2 className="text-base font-bold text-amber-950">
                  {t(lang, "account.senStatus.title")}
                </h2>
                <div className="mt-3 rounded-xl bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-950">
                    {t(lang, breederStatusKey(breederStatus))}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900">
                    {t(lang, senHelperKey(breederStatus))}
                  </p>
                </div>
              </section>
            ) : null}

            {canManageListings ? (
              <section className="rounded-2xl border border-[#F0E6D8] bg-white p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-[#2B1E19]">
                    {t(lang, "account.breederPosts.title")}
                  </h2>
                  {verifiedBreeder || isAdmin ? (
                    <Link
                      href="/app/account/listings/new"
                      className="text-xs font-semibold text-[#D97706] hover:text-[#B45309]"
                    >
                      + {t(lang, "account.newListing")}
                    </Link>
                  ) : null}
                </div>
                {myListings.length === 0 ? (
                  <p className="rounded-xl bg-[#FDFBF7] p-3 text-sm text-stone-500">
                    {t(lang, "account.breederPosts.empty")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {myListings.map((post) => (
                      <Link
                        key={post.id}
                        href={`/app/pet-feed/posts/${post.id}`}
                        className="flex items-center gap-3 rounded-xl bg-[#FDFBF7] p-2.5 hover:bg-amber-50/80"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-200">
                          {post.thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.thumbUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#2B1E19]">
                            {post.title || "—"}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(post.status)}`}
                          >
                            {t(lang, listingStatusKey(post.status))}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#F0E6D8] bg-white p-5">
              <h2 className="text-base font-bold text-[#2B1E19] mb-3">
                {t(lang, "account.shortcuts")}
              </h2>
              <div className="space-y-2">
                <Link
                  href="/app/account/saved"
                  className="flex items-center justify-between rounded-xl bg-[#FDFBF7] px-3 py-3 text-sm hover:bg-amber-50"
                >
                  <span className="text-[#5C4A3A]">
                    {t(lang, "account.senQuickActions.savedPosts")}
                  </span>
                  <span className="font-bold text-[#2B1E19]">{savedCount}</span>
                </Link>
                <Link
                  href="/app/messages"
                  className="flex items-center justify-between rounded-xl bg-[#FDFBF7] px-3 py-3 text-sm hover:bg-amber-50"
                >
                  <span className="text-[#5C4A3A]">
                    {t(lang, "messages.title")}
                  </span>
                  <span className="text-[#D97706] font-semibold">→</span>
                </Link>
                {isAdmin ? (
                  <Link
                    href="/app/admin"
                    className="flex items-center justify-between rounded-xl bg-[#FDFBF7] px-3 py-3 text-sm hover:bg-amber-50"
                  >
                    <span className="text-[#5C4A3A]">
                      {t(lang, "nav.admin")}
                    </span>
                    <span className="text-[#D97706] font-semibold">→</span>
                  </Link>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-[#F0E6D8] bg-white p-5">
              <h2 className="text-base font-bold text-[#2B1E19]">
                {t(lang, "legal.title")}
              </h2>
              <p className="mt-1 text-xs text-stone-500 mb-3">
                {t(lang, "legal.body")}
              </p>
              <Link
                href="/marketplace-guidelines"
                className="block text-sm font-medium text-[#D97706] hover:text-[#B45309]"
              >
                {t(lang, "legal.guidelines")} →
              </Link>
              <Link
                href="/support"
                className="mt-2 block text-sm font-medium text-[#D97706] hover:text-[#B45309]"
              >
                {t(lang, "legal.support")} →
              </Link>
            </section>

            <button
              type="button"
              onClick={() => void logout()}
              className="w-full py-3 border border-[#F0E6D8] text-[#5C4A3A] text-sm font-medium rounded-full hover:bg-white"
            >
              {t(lang, "auth.logout")}
            </button>

            <section className="rounded-2xl border border-red-100 bg-red-50/80 p-5">
              <h2 className="text-base font-bold text-red-900">
                {t(lang, "account.deleteAccount.cardTitle")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-red-800">
                {t(lang, "account.deleteAccount.cardBody")}
              </p>
              {!deleteOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteOpen(true);
                  }}
                  className="mt-4 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700"
                >
                  {t(lang, "account.deleteAccount.cta")}
                </button>
              ) : (
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void deleteAccount()}
                    className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleting
                      ? t(lang, "account.deleteAccount.busy")
                      : t(lang, "account.deleteAccount.confirm")}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => {
                      setDeleteOpen(false);
                      setDeleteError(null);
                    }}
                    className="w-full rounded-xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {t(lang, "common.cancel")}
                  </button>
                </div>
              )}
              {deleteError ? (
                <p className="mt-2 text-xs text-red-700">{deleteError}</p>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
