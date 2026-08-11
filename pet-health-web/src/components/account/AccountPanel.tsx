"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lang, Listing } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { CancelBreederButton } from "./CancelBreederButton";
import { farmProfileFromAccountHref } from "@/lib/farmTabs";
import {
  listingDetailHref,
  opensMyListingReviewPopup,
} from "@/lib/listingOwnerActions";
import {
  evaluateOwnerDeleteListing,
  listingDeleteClickAction,
  ownerDeleteBlockedMessage,
} from "@/lib/listingOwnerDelete";
import { ListingDeleteConfirmModal } from "@/components/marketplace/ListingDeleteConfirmModal";
import { shouldShowSenDepositedSection } from "@/lib/senDepositedListings";
import { ListingCard } from "@/components/marketplace/ListingCard";

export type AccountListingItem = {
  id: string;
  title: string;
  breed?: string;
  location?: string;
  status: string;
  thumbUrl?: string | null;
  /** Mapped listing for owner review preview popup. */
  listing?: Listing | null;
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
  if (status === "pending_review" || status === "deposit_hold") {
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
  depositedListings = [],
  breeder,
}: {
  lang: Lang;
  displayName?: string;
  email?: string;
  role: string;
  isAdmin: boolean;
  savedCount: number;
  myListings: AccountListingItem[];
  depositedListings?: AccountListingItem[];
  breeder: AccountBreederInfo | null;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reviewListing, setReviewListing] = useState<Listing | null>(null);
  const [listingDeleteBusyId, setListingDeleteBusyId] = useState<string | null>(
    null,
  );
  const [listingDeleteError, setListingDeleteError] = useState("");
  const [listingToDelete, setListingToDelete] =
    useState<AccountListingItem | null>(null);
  const [listingDeleteModalMode, setListingDeleteModalMode] = useState<
    "confirm" | "blocked"
  >("confirm");
  const [cancelBusyId, setCancelBusyId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState("");

  const isSen = role === "sen" || (!isAdmin && role !== "breeder" && role !== "vet");
  const isBreeder = role === "breeder";
  const showSenDeposits = shouldShowSenDepositedSection({ role, isAdmin });
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

  const confirmSenCancelDeposit = async (postId: string) => {
    setCancelBusyId(postId);
    setCancelError("");
    try {
      const res = await fetch(
        `/api/listings/${encodeURIComponent(postId)}/deposit/cancel/confirm`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : t(lang, "common.error"),
        );
      }
      router.refresh();
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : t(lang, "common.error"),
      );
    } finally {
      setCancelBusyId(null);
    }
  };

  const listingDeleteDecision = (item: AccountListingItem) =>
    evaluateOwnerDeleteListing({
      isOwner: true,
      status: item.listing?.status || item.status,
      metadataSold: item.listing?.metadataSold,
      ownerDeleted: item.listing?.ownerDeleted,
      completedAt: item.listing?.deal?.completedAt,
      senConfirmedCompleteAt: item.listing?.deal?.senConfirmedCompleteAt,
    });

  const deleteOwnListing = async (item: AccountListingItem) => {
    const decision = listingDeleteDecision(item);
    if (!decision.allowed) return;
    setListingDeleteBusyId(item.id);
    setListingDeleteError("");
    try {
      const res = await fetch(`/api/listings/${item.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          String((data as { error?: string }).error || t(lang, "detail.deleteFailed")),
        );
      }
      setListingToDelete(null);
      router.refresh();
    } catch (err) {
      setListingToDelete(null);
      setListingDeleteError(
        err instanceof Error ? err.message : t(lang, "detail.deleteFailed"),
      );
    } finally {
      setListingDeleteBusyId(null);
    }
  };

  return (
    <>
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

            {showSenDeposits ? (
              <section className="rounded-2xl border border-[#F0E6D8] bg-white p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-[#2B1E19]">
                    {t(lang, "account.senDeposited.title")}
                  </h2>
                  {depositedListings.length > 0 ? (
                    <span className="text-xs font-semibold text-stone-500">
                      {depositedListings.length}
                    </span>
                  ) : null}
                </div>
                {depositedListings.length === 0 ? (
                  <p className="rounded-xl bg-[#FDFBF7] p-3 text-sm text-stone-500">
                    {t(lang, "account.senDeposited.empty")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cancelError ? (
                      <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                        {cancelError}
                      </p>
                    ) : null}
                    {depositedListings.map((post) => {
                      const needsCancelConfirm =
                        post.listing?.deal?.status === "pending_cancel_confirm";
                      return (
                        <div
                          key={post.id}
                          className="rounded-xl bg-[#FDFBF7] p-2.5"
                        >
                          <Link
                            href={listingDetailHref(post.id, {
                              from: "account",
                              dealAction: needsCancelConfirm
                                ? "confirm-cancel"
                                : undefined,
                            })}
                            className="flex w-full items-center gap-3 text-left hover:opacity-90"
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
                          {needsCancelConfirm ? (
                            <button
                              type="button"
                              disabled={cancelBusyId === post.id}
                              onClick={() =>
                                void confirmSenCancelDeposit(post.id)
                              }
                              className="mt-2 w-full rounded-full border border-red-200 py-2 text-xs font-semibold text-red-600 disabled:opacity-60"
                            >
                              {cancelBusyId === post.id
                                ? t(lang, "common.loading")
                                : t(lang, "deal.senConfirmCancel")}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                    {listingDeleteError ? (
                      <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {listingDeleteError}
                      </p>
                    ) : null}
                    {myListings.map((post) => {
                      const deleteDecision = listingDeleteDecision(post);
                      const showListingDelete =
                        deleteDecision.reason !== "already_deleted";
                      const rowClass =
                        "flex min-w-0 flex-1 items-center gap-3 p-2.5 text-left hover:bg-amber-50/80";
                      const rowBody = (
                        <>
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
                        </>
                      );

                      return (
                        <div
                          key={post.id}
                          className="flex items-stretch rounded-xl bg-[#FDFBF7]"
                        >
                          {opensMyListingReviewPopup(post.status) &&
                          post.listing ? (
                            <button
                              type="button"
                              className={rowClass}
                              onClick={() => setReviewListing(post.listing!)}
                            >
                              {rowBody}
                            </button>
                          ) : (
                            <Link
                              href={listingDetailHref(post.id, {
                                from: "account",
                              })}
                              className={rowClass}
                            >
                              {rowBody}
                            </Link>
                          )}
                          {showListingDelete ? (
                            <button
                              type="button"
                              aria-label={t(lang, "detail.delete")}
                              disabled={listingDeleteBusyId === post.id}
                              title={t(lang, "detail.delete")}
                              onClick={() => {
                                const action =
                                  listingDeleteClickAction(deleteDecision);
                                if (action === "hidden") return;
                                setListingDeleteError("");
                                setListingDeleteModalMode(
                                  action === "blocked" ? "blocked" : "confirm",
                                );
                                setListingToDelete(post);
                              }}
                              className="shrink-0 px-3 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              {listingDeleteBusyId === post.id ? "…" : "✕"}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
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

    {reviewListing ? (
      <div
        className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-[#2B1E19]/45 backdrop-blur-[2px] p-0 sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-listing-review-title"
        onClick={() => setReviewListing(null)}
      >
        <div
          className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[#F0E6D8] bg-[#FDFBF7] shadow-[0_24px_60px_-20px_rgba(43,30,25,0.5)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200/80 bg-white shrink-0">
            <div className="min-w-0">
              <h2
                id="my-listing-review-title"
                className="text-base font-bold text-slate-900"
              >
                {t(lang, "account.breederPosts.pendingReviewTitle")}
              </h2>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone("pending_review")}`}
              >
                {t(lang, "listing.status.pending_review")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReviewListing(null)}
              className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 text-lg leading-none"
              aria-label={t(lang, "account.breederPosts.closePreview")}
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              {t(lang, "account.breederPosts.pendingReviewBody")}
            </p>
            <ListingCard listing={reviewListing} lang={lang} interactive={false} />
          </div>

          <footer className="shrink-0 border-t border-slate-200/80 bg-white px-5 py-4">
            <button
              type="button"
              onClick={() => setReviewListing(null)}
              className="w-full py-3 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t(lang, "account.breederPosts.closePreview")}
            </button>
          </footer>
        </div>
      </div>
    ) : null}

    <ListingDeleteConfirmModal
      lang={lang}
      open={Boolean(listingToDelete)}
      mode={listingDeleteModalMode}
      blockedMessage={
        listingToDelete
          ? ownerDeleteBlockedMessage(listingDeleteDecision(listingToDelete), {
              deposit: t(lang, "detail.deleteBlockedDeposit"),
              cooldown: t(lang, "detail.deleteBlockedSoldCooldown"),
              generic: t(lang, "detail.deleteFailed"),
            })
          : ""
      }
      busy={Boolean(listingToDelete && listingDeleteBusyId === listingToDelete.id)}
      onCancel={() => {
        if (!listingDeleteBusyId) setListingToDelete(null);
      }}
      onConfirm={() => {
        if (listingToDelete) void deleteOwnListing(listingToDelete);
      }}
    />
    </>
  );
}
