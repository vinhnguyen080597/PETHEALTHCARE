"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { CancelBreederButton } from "./CancelBreederButton";

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
  const known = ["draft", "pending_review", "published", "archived"] as const;
  const s = (known as readonly string[]).includes(status)
    ? status
    : "draft";
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

function roleBodyKey(role: string): EnKey {
  const known = ["sen", "breeder", "admin", "vet"];
  const r = known.includes(role) ? role : "sen";
  return `account.roles.${r}.body` as EnKey;
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
  adminMetrics,
}: {
  lang: Lang;
  displayName?: string;
  email?: string;
  role: string;
  isAdmin: boolean;
  savedCount: number;
  myListings: AccountListingItem[];
  breeder: AccountBreederInfo | null;
  adminMetrics?: {
    pendingRequests: number;
    activeBreeders: number;
    pendingListings: number;
  };
}) {
  const router = useRouter();
  const isSen = role === "sen";
  const isBreeder = role === "breeder";
  const breederStatus = breeder?.verificationStatus || "unverified";
  const pendingRequest = breederStatus === "pending_review";

  const publishedCount = myListings.filter((p) => p.status === "published").length;
  const pendingCount = myListings.filter(
    (p) => p.status === "pending_review",
  ).length;

  const subtitle = isAdmin
    ? t(lang, "account.adminSubtitle")
    : isBreeder
      ? t(lang, "account.breederSubtitle")
      : t(lang, "account.subtitle");

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const metrics = isAdmin
    ? [
        {
          key: "requests",
          label: t(lang, "account.adminMetrics.requests"),
          value: adminMetrics?.pendingRequests ?? 0,
          href: "/app/admin",
        },
        {
          key: "breeders",
          label: t(lang, "account.adminMetrics.breeders"),
          value: adminMetrics?.activeBreeders ?? 0,
          href: "/app/admin",
        },
        {
          key: "listings",
          label: t(lang, "account.adminMetrics.listings"),
          value: adminMetrics?.pendingListings ?? 0,
          href: "/app/admin",
        },
      ]
    : isBreeder
      ? [
          {
            key: "total",
            label: t(lang, "account.breederMetrics.total"),
            value: myListings.length,
          },
          {
            key: "published",
            label: t(lang, "account.breederMetrics.published"),
            value: publishedCount,
          },
          {
            key: "pending",
            label: t(lang, "account.breederMetrics.pending"),
            value: pendingCount,
          },
        ]
      : [
          {
            key: "saved",
            label: t(lang, "account.savedPosts"),
            value: savedCount,
          },
          {
            key: "posts",
            label: t(lang, "account.myPosts"),
            value: myListings.length,
          },
        ];

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#D97706] mb-1">
          {t(lang, roleTitleKey(role))}
        </p>
        <h1 className="text-2xl font-bold text-[#2B1E19]">
          {t(lang, "account.title")}
        </h1>
        {!isSen ? (
          <p className="mt-1 text-sm leading-relaxed text-[#5C4A3A]">
            {subtitle}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-stone-500">
          {displayName || email || "—"}
          {email && displayName ? (
            <span className="text-stone-400"> · {email}</span>
          ) : null}
        </p>
      </div>

      {isSen ? (
        <section className="mb-5 overflow-hidden rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-100/40">
          <div className="flex items-start gap-3">
            <div className="h-28 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center">
              <span className="text-3xl font-bold text-[#D97706]/70">M</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-[#2B1E19]">
                {t(lang, "account.senIntro.title")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#5C4A3A]">
                {t(lang, "account.senIntro.body")}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/app/pet-feed"
              className="min-w-[150px] flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-100 bg-amber-50 py-3 text-sm font-bold text-[#B45309] hover:bg-amber-100"
            >
              {t(lang, "account.senIntro.petFeedCta")}
            </Link>
            {pendingRequest ? (
              <CancelBreederButton lang={lang} />
            ) : (
              <Link
                href="/app/account/breeder/template"
                className="min-w-[150px] flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#D97706] py-3 text-sm font-bold text-white hover:bg-[#B45309] shadow-sm shadow-amber-200/60"
              >
                {t(lang, "account.senIntro.breederCta")}
              </Link>
            )}
          </div>
        </section>
      ) : null}

      {isBreeder ? (
        <section className="mb-5 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm shadow-amber-100/40">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full bg-amber-50 text-[#D97706]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5L12 14.8 7.5 16.7l.9-5L4.8 8.2l5-.7L12 3z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
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
              <p className="mt-1 text-sm leading-relaxed text-[#5C4A3A]">
                {[
                  breeder?.location,
                  breeder?.primarySpecies?.filter(Boolean).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ") || t(lang, "account.breederTrust.missingInfo")}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                {t(lang, "account.breederTrust.note")}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!isAdmin && !isSen && !isBreeder ? (
        <section className="mb-5 rounded-2xl border border-[#F0E6D8] bg-white p-4">
          <h2 className="text-base font-bold text-[#2B1E19]">
            {t(lang, "account.myRole")}
          </h2>
          <div className="mt-3 rounded-xl bg-[#FDFBF7] p-3">
            <p className="font-bold text-[#2B1E19]">
              {t(lang, roleTitleKey(role))}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#5C4A3A]">
              {t(lang, roleBodyKey(role))}
            </p>
          </div>
        </section>
      ) : null}

      <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((item) => {
          const inner = (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#2B1E19]">
                {item.value}
              </p>
            </>
          );
          if ("href" in item && item.href) {
            return (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-2xl border border-[#F0E6D8] bg-white p-4 hover:border-amber-300 transition-colors"
              >
                {inner}
              </Link>
            );
          }
          return (
            <div
              key={item.key}
              className="rounded-2xl border border-[#F0E6D8] bg-white p-4"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {isAdmin ? (
        <div className="mb-5 flex flex-col gap-3">
          <Link
            href="/app/account/listings/new"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#D97706] py-3.5 text-sm font-bold text-white hover:bg-[#B45309] shadow-sm shadow-amber-200/60"
          >
            {t(lang, "account.createPost")}
          </Link>
          <Link
            href="/app/admin"
            className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white py-3.5 text-sm font-bold text-[#B45309] hover:bg-amber-50"
          >
            {t(lang, "account.openAdminReview")}
          </Link>
        </div>
      ) : null}

      {isBreeder ? (
        <div className="mb-5 flex flex-col gap-3">
          {breeder &&
          (breederStatus === "verified" ||
            breederStatus === "pending_review") ? (
            <Link
              href={`/app/breeders/${breeder.id}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white py-3.5 text-sm font-bold text-[#B45309] hover:bg-amber-50"
            >
              {t(lang, "account.breederTrust.viewFarmProfile")}
            </Link>
          ) : null}
          {breederStatus === "verified" ? (
            <Link
              href="/app/account/listings/new"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#D97706] py-3.5 text-sm font-bold text-white hover:bg-[#B45309] shadow-sm shadow-amber-200/60"
            >
              {t(lang, "account.createPost")}
            </Link>
          ) : (
            <Link
              href="/app/account/breeder/template"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#D97706] py-3.5 text-sm font-bold text-white hover:bg-[#B45309] shadow-sm shadow-amber-200/60"
            >
              {t(lang, "account.breederTrust.updateProfile")}
            </Link>
          )}
          <Link
            href="/app/account/breeder/template"
            className="flex items-center justify-center gap-2 rounded-xl border border-amber-100 bg-amber-50 py-3 text-sm font-bold text-[#B45309] hover:bg-amber-100"
          >
            {t(lang, "account.breederTrust.editProfile")}
          </Link>
        </div>
      ) : null}

      {isBreeder ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-relaxed text-amber-900">
            {t(lang, "account.breederSafety")}
          </p>
        </div>
      ) : null}

      {!isAdmin && !isSen && !isBreeder ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-relaxed text-amber-900">
            {t(lang, "account.communitySafety")}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {isSen ? (
          <>
            <section className="rounded-2xl border border-amber-200 bg-white p-4">
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
            <section className="rounded-2xl border border-[#F0E6D8] bg-white p-4">
              <h2 className="text-base font-bold text-[#2B1E19]">
                {t(lang, "account.senQuickActions.title")}
              </h2>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center justify-between rounded-xl bg-[#FDFBF7] px-3 py-2.5 text-sm">
                  <span className="text-[#5C4A3A]">
                    {t(lang, "account.senQuickActions.savedPosts")}
                  </span>
                  <span className="font-bold text-[#2B1E19]">{savedCount}</span>
                </li>
                <li className="flex items-center justify-between rounded-xl bg-[#FDFBF7] px-3 py-2.5 text-sm">
                  <span className="text-[#5C4A3A]">
                    {t(lang, "account.myPosts")}
                  </span>
                  <span className="font-bold text-[#2B1E19]">
                    {myListings.length}
                  </span>
                </li>
                <li>
                  <Link
                    href="/app/messages"
                    className="flex items-center justify-between rounded-xl bg-[#FDFBF7] px-3 py-2.5 text-sm hover:bg-amber-50"
                  >
                    <span className="text-[#5C4A3A]">
                      {t(lang, "messages.title")}
                    </span>
                    <span className="text-[#D97706] font-semibold">→</span>
                  </Link>
                </li>
              </ul>
            </section>
          </>
        ) : null}

        {role === "vet" ? (
          <section className="rounded-2xl border border-[#F0E6D8] bg-white p-4">
            <p className="text-sm leading-relaxed text-[#5C4A3A]">
              {t(lang, "account.vetSummary")}
            </p>
          </section>
        ) : null}

        {isBreeder || isAdmin ? (
          <section className="rounded-2xl border border-[#F0E6D8] bg-white p-4">
            <h2 className="text-base font-bold text-[#2B1E19]">
              {t(lang, "account.breederPosts.title")}
            </h2>
            <div className="mt-3 space-y-3">
              {myListings.length === 0 ? (
                <p className="rounded-xl bg-[#FDFBF7] p-3 text-sm leading-relaxed text-stone-500">
                  {t(lang, "account.breederPosts.empty")}
                </p>
              ) : (
                myListings.map((post) => {
                  const subtitleParts = [post.breed, post.location]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <Link
                      key={post.id}
                      href={`/app/pet-feed/posts/${post.id}`}
                      className="flex items-center gap-3 rounded-xl bg-[#FDFBF7] p-2.5 hover:bg-amber-50/80 transition-colors"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-200">
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
                        {subtitleParts ? (
                          <p className="mt-0.5 truncate text-xs text-stone-500">
                            {subtitleParts}
                          </p>
                        ) : null}
                        <span
                          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(post.status)}`}
                        >
                          {t(lang, listingStatusKey(post.status))}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-[#F0E6D8] bg-white p-4">
          <h2 className="text-base font-bold text-[#2B1E19]">
            {t(lang, "legal.title")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-500">
            {t(lang, "legal.body")}
          </p>
          <div className="mt-3 space-y-1">
            {(
              [
                ["legal.privacy", "/privacy-policy"],
                ["legal.terms", "/terms-of-service"],
                ["legal.guidelines", "/marketplace-guidelines"],
                ["legal.support", "/support"],
              ] as const
            ).map(([key, href]) => (
              <Link
                key={href}
                href={href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[#2B1E19] hover:bg-amber-50"
              >
                {t(lang, key)}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#F0E6D8] bg-white divide-y divide-[#F0E6D8]">
          {!isBreeder && !isAdmin ? (
            <Link
              href="/app/account/listings/new"
              className="block px-5 py-4 text-sm font-medium text-[#2B1E19] hover:bg-amber-50/60"
            >
              + {t(lang, "account.newListing")}
            </Link>
          ) : null}
          {breeder?.id && !isBreeder ? (
            <Link
              href={`/app/breeders/${breeder.id}`}
              className="block px-5 py-4 text-sm font-medium text-[#2B1E19] hover:bg-amber-50/60"
            >
              {t(lang, "account.breederProfile")}
            </Link>
          ) : null}
          <Link
            href="/app/account/breeder/template"
            className="block px-5 py-4 text-sm font-medium text-[#2B1E19] hover:bg-amber-50/60"
          >
            {t(lang, "account.template")}
          </Link>
          <Link
            href="/app/messages"
            className="block px-5 py-4 text-sm font-medium text-[#2B1E19] hover:bg-amber-50/60"
          >
            {t(lang, "messages.title")}
          </Link>
        </section>
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        className="mt-8 w-full py-3 border border-[#F0E6D8] text-[#5C4A3A] text-sm font-medium rounded-full hover:bg-white"
      >
        {t(lang, "auth.logout")}
      </button>
    </div>
  );
}
