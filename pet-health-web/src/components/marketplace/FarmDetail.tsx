"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { BreederProfile, Lang, Listing, WarrantyPolicy } from "@/lib/types";
import { isBlankDisplayValue } from "@/lib/formatPrice";
import { getBreederPublicTrustMetrics } from "@/lib/breederTrust";
import { DEFAULT_BREEDER_COVER_PATH } from "@/lib/breederProfileImages";
import {
  FARM_DETAIL_TABS,
  farmDetailHref,
  farmNameMarginClass,
  farmTabI18nKey,
  parseFarmDetailFrom,
  parseFarmDetailTab,
  warrantyLibraryEditHref,
  warrantyLibraryHref,
  type FarmDetailFrom,
  type FarmDetailTab,
} from "@/lib/farmTabs";
import {
  FARM_FACILITY_VIDEO_ASPECT,
  FARM_FACILITY_VIDEO_MAX_HEIGHT_PX,
  farmFacilityHasContent,
  farmFacilitySocialLinks,
} from "@/lib/farmFacility";
import {
  countFarmPetsByAvailability,
  countFarmPetsRehomed,
  farmPetTabCount,
  filterFarmPetsByAvailability,
  type FarmPetAvailability,
  type FarmPetAvailabilityCounts,
  type FarmPetAvailabilityFilter,
} from "@/lib/farmPets";
import { t } from "@/i18n";
import { farmTemplateHref } from "@/lib/siteBreadcrumbs";
import { SHOW_BREEDER_VERIFICATION_BADGES } from "@/lib/breederVerificationUi";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";
import {
  startChatAndOpenUi,
  startChatMessageKey,
} from "@/lib/startFarmChat";
import { ListingCard } from "./ListingCard";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { FarmHealth } from "./FarmHealth";
import { WarrantyPolicyViewer } from "./WarrantyPolicyViewer";
import { FarmReviewModal } from "./FarmReviewModal";
import type { BreederFarmReviewThread } from "@/lib/breederFarmReviews";
import { formatBreederReviewLabel } from "@/lib/breederFarmReviews";

const FALLBACK_COVER = DEFAULT_BREEDER_COVER_PATH;

const BREEDER_REPORT_REASONS = [
  "scam",
  "misleading_health_claims",
  "abusive_content",
  "fake_contact",
  "unsafe_transaction",
] as const;

function PhotoLoadingSpinner({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-[3px] border-white/35 border-t-white animate-spin"
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

function FarmWarrantyTab({
  lang,
  policies,
  isOwner,
  profileId,
  farmFrom = null,
  primarySpecies = [],
}: {
  lang: Lang;
  policies: WarrantyPolicy[];
  isOwner: boolean;
  profileId: string;
  farmFrom?: FarmDetailFrom | null;
  primarySpecies?: string[];
}) {
  const router = useRouter();
  const [viewing, setViewing] = useState<WarrantyPolicy | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const warrantyHrefOpts = {
    farm: profileId,
    from: farmFrom,
  } as const;

  useEffect(() => {
    if (!menuOpenId) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(`[data-warranty-menu="${menuOpenId}"]`)) return;
      setMenuOpenId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpenId]);

  const onDelete = async (policy: WarrantyPolicy) => {
    if (!window.confirm(t(lang, "farm.warranty.deleteConfirm"))) return;
    setMenuOpenId(null);
    setBusyId(policy.id);
    setActionError("");
    try {
      const res = await fetch(
        `/api/warranty-policies/${encodeURIComponent(policy.id)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || t(lang, "farm.warranty.deleteFailed"),
        );
      }
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : t(lang, "farm.warranty.deleteFailed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white border border-[#F3E2C8] rounded-2xl p-5 space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#2B1E19]">
            {t(lang, "farm.warranty.title")}
          </h3>
          {isOwner ? (
            <Link
              href={warrantyLibraryHref(warrantyHrefOpts)}
              className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-full bg-[#D97706] text-white text-xs font-semibold hover:bg-[#B45309] transition-colors"
            >
              {t(lang, "farm.warranty.createButton")}
            </Link>
          ) : null}
        </div>
        <p className="text-xs text-[#6E5A51] mt-1 leading-relaxed">
          {t(lang, "farm.warranty.note")}
        </p>
      </div>
      {actionError ? (
        <p className="text-xs text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}
      {policies.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {policies.map((p) => (
            <li key={p.id} className="relative">
              <div className="rounded-xl border border-[#F3E2C8] px-3.5 py-3 hover:bg-[#FFF8EF] transition-colors">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setViewing(p)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm font-semibold text-[#2B1E19] truncate">
                      🛡️ {p.title}
                    </p>
                    <p className="text-xs text-[#D97706] mt-1 font-medium">
                      {t(lang, "warranty.viewCta")}
                    </p>
                  </button>
                  {isOwner ? (
                    <div
                      className="relative shrink-0"
                      data-warranty-menu={p.id}
                    >
                      <button
                        type="button"
                        aria-label={t(lang, "farm.warranty.menu")}
                        aria-expanded={menuOpenId === p.id}
                        disabled={busyId === p.id}
                        onClick={() =>
                          setMenuOpenId((cur) => (cur === p.id ? null : p.id))
                        }
                        className="h-8 w-8 inline-flex items-center justify-center rounded-full text-[#6E5A51] hover:bg-[#F3E2C8]/70 disabled:opacity-50"
                      >
                        ⋮
                      </button>
                      {menuOpenId === p.id ? (
                        <div className="absolute right-0 top-9 z-20 min-w-[9.5rem] rounded-xl border border-[#F3E2C8] bg-white py-1 shadow-lg">
                          <Link
                            href={warrantyLibraryEditHref(p.id, warrantyHrefOpts)}
                            className="block w-full px-3 py-2 text-left text-sm text-[#2B1E19] hover:bg-[#FFF8EF]"
                            onClick={() => setMenuOpenId(null)}
                          >
                            {t(lang, "farm.warranty.update")}
                          </Link>
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={() => void onDelete(p)}
                          >
                            {t(lang, "farm.warranty.delete")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#6E5A51] leading-relaxed">
          {isOwner
            ? t(lang, "farm.warranty.createCta")
            : t(lang, "farm.warranty.fallback")}
        </p>
      )}
      <WarrantyPolicyViewer
        lang={lang}
        policy={viewing}
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        primarySpecies={primarySpecies}
      />
    </div>
  );
}

const FARM_PET_STATUS_ORDER: FarmPetAvailability[] = [
  "for_sale",
  "deposit_hold",
  "completed",
];

function farmPetStatusLabelKey(
  status: FarmPetAvailability,
): `farm.listings.status.${FarmPetAvailability}` {
  return `farm.listings.status.${status}`;
}

function FarmPetsToolbar({
  lang,
  isOwner,
  counts,
  filter,
  filterOpen,
  onFilterOpenChange,
  onFilterChange,
}: {
  lang: Lang;
  isOwner: boolean;
  counts: FarmPetAvailabilityCounts;
  filter: FarmPetAvailabilityFilter;
  filterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  onFilterChange: (filter: FarmPetAvailabilityFilter) => void;
}) {
  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-farm-pet-filter]")) return;
      onFilterOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen, onFilterOpenChange]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] leading-4 text-[#6E5A51]/80">
        {FARM_PET_STATUS_ORDER.map((status, index) => {
          const active = filter === status;
          return (
            <span key={status} className="inline-flex items-center gap-1">
              {index > 0 ? (
                <span className="text-[#D6C4B0]/80" aria-hidden>
                  |
                </span>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  onFilterChange(active ? "all" : status)
                }
                className={`rounded-md px-0.5 py-0.5 transition-colors ${
                  active
                    ? "bg-amber-50/80 text-[#B45309] font-semibold"
                    : "hover:text-[#2B1E19]"
                }`}
              >
                <span className="font-semibold tabular-nums">
                  {counts[status]}
                </span>{" "}
                {t(lang, farmPetStatusLabelKey(status))}
              </button>
            </span>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <div className="relative" data-farm-pet-filter>
          <button
            type="button"
            onClick={() => onFilterOpenChange(!filterOpen)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#F3E2C8] bg-white px-3 py-1.5 text-xs font-semibold text-[#2B1E19] hover:bg-[#FDFBF7]"
            aria-expanded={filterOpen}
            aria-haspopup="menu"
            aria-label={t(lang, "farm.listings.filter")}
          >
            {filter === "all"
              ? t(lang, "farm.listings.filterAll")
              : t(lang, farmPetStatusLabelKey(filter))}
            <span aria-hidden>▾</span>
          </button>
          {filterOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-9 z-20 min-w-[11rem] rounded-xl border border-[#F3E2C8] bg-white py-1 shadow-lg"
            >
              {(
                [
                  "all",
                  "for_sale",
                  "deposit_hold",
                  "completed",
                ] as FarmPetAvailabilityFilter[]
              ).map((option) => {
                const selected = filter === option;
                const label =
                  option === "all"
                    ? t(lang, "farm.listings.filterAll")
                    : t(lang, farmPetStatusLabelKey(option));
                return (
                  <button
                    key={option}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      onFilterChange(option);
                      onFilterOpenChange(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      selected
                        ? "bg-amber-50 font-semibold text-[#B45309]"
                        : "text-[#2B1E19] hover:bg-[#FDFBF7]"
                    }`}
                  >
                    <span>{label}</span>
                    {option !== "all" ? (
                      <span className="tabular-nums text-[#6E5A51]">
                        {counts[option]}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {isOwner ? (
          <Link
            href="/app/account/listings/new"
            className="inline-flex items-center justify-center rounded-full bg-[#D97706] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#B45309] transition-colors"
          >
            + {t(lang, "farm.listings.createPost")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function FarmDetail({
  breeder,
  lang,
  isOwner = false,
  isLoggedIn = false,
  allowTemplateChange = false,
  listings,
}: {
  breeder: BreederProfile;
  lang: Lang;
  isOwner?: boolean;
  isLoggedIn?: boolean;
  /** Owner-only: show Change template when feature flag (or admin) allows. */
  allowTemplateChange?: boolean;
  listings: Listing[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dock = useOptionalChatDock();
  const farmFrom = parseFarmDetailFrom(searchParams.get("from"));
  const [tab, setTab] = useState<FarmDetailTab>(
    () => parseFarmDetailTab(searchParams.get("tab")) ?? "overview",
  );
  useEffect(() => {
    setTab(parseFarmDetailTab(searchParams.get("tab")) ?? "overview");
  }, [searchParams]);

  const selectTab = (key: FarmDetailTab) => {
    setTab(key);
    router.replace(
      farmDetailHref(breeder.id, key, { from: farmFrom }),
      { scroll: false },
    );
  };
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(
    BREEDER_REPORT_REASONS[0],
  );
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [petFilter, setPetFilter] =
    useState<FarmPetAvailabilityFilter>("all");
  const [petFilterOpen, setPetFilterOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState(
    breeder.coverUrl || FALLBACK_COVER,
  );
  const [avatarUrl, setAvatarUrl] = useState(breeder.avatar);
  const [photoBusy, setPhotoBusy] = useState<"avatar" | "cover" | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewThreads, setReviewThreads] = useState<BreederFarmReviewThread[]>([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoRef = useRef<{ kind: "avatar" | "cover"; url: string } | null>(
    null,
  );

  const farmPetCount = farmPetTabCount(listings);
  const farmPetCounts = countFarmPetsByAvailability(listings);
  const visibleFarmPets = filterFarmPetsByAvailability(listings, petFilter);
  const forSaleCount = farmPetCounts.for_sale;
  const trustMetrics = getBreederPublicTrustMetrics(breeder, {
    listingCount: forSaleCount,
    petsRehomed: countFarmPetsRehomed(listings),
  });
  const trust = trustMetrics.qualityIndex;
  const reviewCount = trustMetrics.reviewCount;
  const cover = coverUrl || FALLBACK_COVER;
  const bioText = (lang === "VI" ? breeder.bioVI : breeder.bio).trim();
  const facilitySocials = farmFacilitySocialLinks(breeder.contact);

  useEffect(() => {
    if (tab !== "reviews" || reviewsLoaded || reviewsLoading) return;
    let cancelled = false;
    setReviewsLoading(true);
    void fetch(`/api/breeders/${encodeURIComponent(breeder.id)}/reviews`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const threads = Array.isArray(json?.data?.threads) ? json.data.threads : [];
        setReviewThreads(threads);
        setReviewsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setReviewThreads([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, breeder.id, reviewsLoaded, reviewsLoading]);

  const submitFarmReview = async (payload: {
    rating: number;
    body: string;
    photoUrls: string[];
  }) => {
    setReviewBusy(true);
    setReviewError("");
    try {
      const res = await fetch(
        `/api/breeders/${encodeURIComponent(breeder.id)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t(lang, "farm.review.failed"));
      }
      setReviewOpen(false);
      setReviewsLoaded(false);
      router.refresh();
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : t(lang, "farm.review.failed"),
      );
    } finally {
      setReviewBusy(false);
    }
  };

  const tabs: { key: FarmDetailTab; label: string }[] = FARM_DETAIL_TABS.map(
    (key) => ({
      key,
      label:
        key === "listings"
          ? `${t(lang, farmTabI18nKey(key))} (${farmPetCount})`
          : t(lang, farmTabI18nKey(key)),
    }),
  );

  const requireLogin = () => {
    router.push(`/login?next=/app/breeders/${breeder.id}`);
  };

  const finishPhotoLoad = (kind: "avatar" | "cover") => {
    if (pendingPhotoRef.current?.kind !== kind) return;
    pendingPhotoRef.current = null;
    setPhotoBusy(null);
  };

  const uploadAndPersistPhoto = async (
    kind: "avatar" | "cover",
    file: File,
  ) => {
    setPhotoError("");
    setPhotoBusy(kind);
    pendingPhotoRef.current = null;
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("persist", "1");
      fd.append("file", file, file.name || `${kind}.jpg`);
      const uploadRes = await fetch("/api/breeder/upload", {
        method: "POST",
        body: fd,
      });
      const uploadData = (await uploadRes.json().catch(() => ({}))) as {
        error?: string;
        data?: { publicUrl?: string };
      };
      const publicUrl = uploadData.data?.publicUrl;
      if (!uploadRes.ok || !publicUrl) {
        throw new Error(
          uploadData.error || t(lang, "farm.owner.photoUploadFailed"),
        );
      }
      if (
        publicUrl.startsWith("memory://") ||
        publicUrl.startsWith("storage://")
      ) {
        throw new Error(t(lang, "farm.owner.photoUploadFailed"));
      }

      pendingPhotoRef.current = { kind, url: publicUrl };
      if (kind === "avatar") setAvatarUrl(publicUrl);
      else setCoverUrl(publicUrl);
      // Keep photoBusy until the <img> onLoad/onError for the new URL.
      router.refresh();
    } catch (err) {
      pendingPhotoRef.current = null;
      setPhotoBusy(null);
      setPhotoError(
        err instanceof Error
          ? err.message
          : t(lang, "farm.owner.photoUploadFailed"),
      );
    }
  };

  const messageBreeder = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setMessageBusy(true);
    setMessageError("");
    try {
      const result = await startChatAndOpenUi({
        breederId: breeder.id,
        farmName: breeder.name,
        openChat: dock?.openChat,
        replaceChat: dock?.replaceChat,
        abortChat: dock?.abortChat,
        navigate: (next) => router.push(next),
      });
      if (!result.ok) {
        if (result.status === 401) {
          requireLogin();
          return;
        }
        setMessageError(t(lang, startChatMessageKey(result.status, result.code)));
        return;
      }
    } catch {
      setMessageError(t(lang, "messages.startChatFailed"));
    } finally {
      setMessageBusy(false);
    }
  };

  const submitReport = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setReportBusy(true);
    setReportError("");
    try {
      const res = await fetch(`/api/breeders/${breeder.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setReportDone(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportDone(false);
      }, 1200);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed");
    } finally {
      setReportBusy(false);
    }
  };

  const reasonLabels: Record<string, string> = {
    scam: lang === "VI" ? "Lừa đảo / đáng ngờ" : "Scam or suspicious",
    misleading_health_claims:
      lang === "VI"
        ? "Thông tin sức khỏe sai lệch"
        : "Misleading health claims",
    abusive_content:
      lang === "VI" ? "Nội dung không phù hợp" : "Abusive content",
    fake_contact:
      lang === "VI" ? "Liên hệ giả / không liên lạc được" : "Fake contact",
    unsafe_transaction:
      lang === "VI" ? "Giao dịch không an toàn" : "Unsafe transaction",
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Cover + identity */}
      <section className="max-w-[1200px] mx-auto px-5 lg:px-8 pt-6">
        <div className="relative h-44 sm:h-56 lg:h-64 overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={cover}
            src={cover}
            alt=""
            className="w-full h-full object-cover"
            onLoad={() => finishPhotoLoad("cover")}
            onError={() => {
              if (pendingPhotoRef.current?.kind === "cover") {
                pendingPhotoRef.current = null;
                setPhotoBusy(null);
                setPhotoError(t(lang, "farm.owner.photoUploadFailed"));
              }
            }}
          />
          {isOwner && photoBusy === "cover" ? (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/45"
              role="status"
              aria-live="polite"
              aria-label={t(lang, "farm.owner.photoUploading")}
            >
              <PhotoLoadingSpinner size={36} />
              <span className="text-white text-sm font-medium">
                {t(lang, "farm.owner.photoUploading")}
              </span>
            </div>
          ) : null}
          {isOwner ? (
            <>
              <button
                type="button"
                disabled={photoBusy !== null}
                onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-[#1C1E21] text-sm font-semibold shadow-md hover:bg-[#F0F2F5] transition-colors disabled:opacity-60"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M4 7.5h2.2l1.3-2h9l1.3 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="13"
                    r="3.2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                {t(lang, "farm.owner.editCover")}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadAndPersistPhoto("cover", file);
                }}
              />
            </>
          ) : null}
        </div>

        <div className="relative -mt-12 sm:-mt-14 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 pb-2">
          <div className="relative flex-shrink-0">
            {isOwner ? (
              <button
                type="button"
                disabled={photoBusy !== null}
                onClick={() => avatarInputRef.current?.click()}
                className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2 disabled:opacity-70"
                aria-label={t(lang, "farm.owner.editAvatar")}
                title={t(lang, "farm.owner.editAvatar")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={avatarUrl}
                  src={avatarUrl}
                  alt={breeder.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-[4px] border-white shadow-lg bg-white"
                  onLoad={() => finishPhotoLoad("avatar")}
                  onError={() => {
                    if (pendingPhotoRef.current?.kind === "avatar") {
                      pendingPhotoRef.current = null;
                      setPhotoBusy(null);
                      setPhotoError(t(lang, "farm.owner.photoUploadFailed"));
                    }
                  }}
                />
                {photoBusy === "avatar" ? (
                  <span
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"
                    role="status"
                    aria-live="polite"
                    aria-label={t(lang, "farm.owner.photoUploading")}
                  >
                    <PhotoLoadingSpinner size={28} />
                  </span>
                ) : (
                  <span className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/55 text-white">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M4 7.5h2.2l1.3-2h9l1.3 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="13"
                          r="3.2"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                    </span>
                  </span>
                )}
              </button>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={breeder.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-[4px] border-white shadow-lg bg-white"
              />
            )}
            {SHOW_BREEDER_VERIFICATION_BADGES && breeder.verified ? (
              <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-[3px] border-white flex items-center justify-center text-white text-sm shadow pointer-events-none">
                ✓
              </span>
            ) : null}
            {isOwner ? (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadAndPersistPhoto("avatar", file);
                }}
              />
            ) : null}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center sm:h-28 sm:py-1.5">
            <h1
              className={`text-2xl lg:text-[1.75rem] font-bold text-[#050505] tracking-tight truncate leading-tight [font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif] [text-shadow:0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(0,0,0,0.12)] ${farmNameMarginClass(isOwner)}`}
            >
              {breeder.name}
            </h1>
            <div className="mt-1 sm:mt-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="text-sm text-[#6E5A51]">
                {breeder.location
                  ? `📍 ${breeder.location}`
                  : lang === "VI"
                    ? "📍 Việt Nam"
                    : "📍 Vietnam"}
              </p>
              {isOwner ? (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    href="/app/account/breeder"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#1C1E21] text-xs sm:text-sm font-semibold shadow-sm border border-[#F3E2C8] hover:bg-[#F0F2F5] transition-colors"
                  >
                    ✏️ {t(lang, "farm.owner.editProfile")}
                  </Link>
                  {allowTemplateChange ? (
                    <Link
                      href={farmTemplateHref(breeder.id, { from: farmFrom })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#1C1E21] text-xs sm:text-sm font-semibold shadow-sm border border-[#F3E2C8] hover:bg-[#F0F2F5] transition-colors"
                    >
                      🎨 {t(lang, "farm.owner.template")}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
            {SHOW_BREEDER_VERIFICATION_BADGES ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {(breeder.verified || breeder.verificationTier >= 2) && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold border border-amber-200">
                    🛡️ {t(lang, "farm.badge.inspected")}
                  </span>
                )}
                {breeder.verified && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                    ✓ {t(lang, "farm.badge.idVerified")}
                  </span>
                )}
              </div>
            ) : null}
            {photoError ? (
              <p className="text-xs text-red-600 mt-2" role="alert">
                {photoError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6 space-y-5">
        <DisclaimerBanner lang={lang} />

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left 70% */}
          <div className="w-full lg:w-[70%] min-w-0 space-y-5">
            <div className="flex gap-1 overflow-x-auto border-b border-[#F3E2C8] pb-px">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectTab(item.key)}
                  className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    tab === item.key
                      ? "border-[#D97706] text-[#B45309]"
                      : "border-transparent text-[#6E5A51] hover:text-[#2B1E19]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="space-y-6">
                <section className="space-y-3">
                  <FarmHealth
                    breeder={breeder}
                    lang={lang}
                    embedded
                    isOwner={isOwner}
                  />
                </section>

                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-[#2B1E19]">
                    {t(lang, "farm.tab.facility")}
                  </h2>
                  <div className="bg-white border border-[#F3E2C8] rounded-2xl p-5 space-y-4">
                    {farmFacilityHasContent({
                      bio: bioText,
                      socialCount: facilitySocials.length,
                      videoUrl: breeder.facilityVideoUrl,
                    }) ? (
                      <>
                        {!isBlankDisplayValue(bioText) ? (
                          <div>
                            <h3 className="text-sm font-semibold text-[#2B1E19] mb-1">
                              {t(lang, "farm.facility.about")}
                            </h3>
                            <p className="text-sm text-[#6E5A51] leading-relaxed whitespace-pre-wrap">
                              {bioText}
                            </p>
                          </div>
                        ) : null}
                        {facilitySocials.length > 0 ? (
                          <div>
                            <h3 className="text-sm font-semibold text-[#2B1E19] mb-2">
                              {t(lang, "farm.facility.social")}
                            </h3>
                            <ul className="space-y-1.5">
                              {facilitySocials.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-baseline gap-2 text-sm min-w-0"
                                >
                                  <span className="shrink-0 font-medium text-[#2B1E19]">
                                    {t(lang, item.labelKey)}
                                  </span>
                                  {item.href ? (
                                    <a
                                      href={item.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-0 break-all text-[#B45309] hover:underline"
                                    >
                                      {item.display}
                                    </a>
                                  ) : (
                                    <span className="tabular-nums text-[#6E5A51]">
                                      {item.display}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {breeder.facilityVideoUrl ? (
                          <div>
                            <h3 className="text-sm font-semibold text-[#2B1E19] mb-2">
                              {t(lang, "farm.facility.video")}
                            </h3>
                            <div
                              className="w-full overflow-hidden rounded-xl bg-black"
                              style={{
                                aspectRatio: FARM_FACILITY_VIDEO_ASPECT,
                                maxHeight: FARM_FACILITY_VIDEO_MAX_HEIGHT_PX,
                              }}
                            >
                              <video
                                src={breeder.facilityVideoUrl}
                                controls
                                playsInline
                                preload="metadata"
                                className="h-full w-full object-contain"
                              />
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm text-[#6E5A51]">
                        {t(lang, "farm.facility.empty")}
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-[#2B1E19]">
                      {t(lang, "farm.tab.reviews")}
                    </h2>
                    <button
                      type="button"
                      onClick={() => selectTab("reviews")}
                      className="text-sm font-medium text-[#D97706] hover:text-[#B45309]"
                    >
                      {t(lang, "farm.review.viewAll")}
                    </button>
                  </div>
                  <div className="bg-white border border-[#F3E2C8] rounded-2xl p-5">
                    {reviewCount > 0 && trustMetrics.rating != null ? (
                      <p className="text-sm text-[#2B1E19]">
                        {formatBreederReviewLabel(
                          trustMetrics.rating,
                          reviewCount,
                          lang,
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-[#6E5A51] py-4 text-center">
                        {t(lang, "farm.reviews.empty")}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {tab === "listings" && (
              <div>
                <FarmPetsToolbar
                  lang={lang}
                  isOwner={isOwner}
                  counts={farmPetCounts}
                  filter={petFilter}
                  filterOpen={petFilterOpen}
                  onFilterOpenChange={setPetFilterOpen}
                  onFilterChange={setPetFilter}
                />
                {visibleFarmPets.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visibleFarmPets.map((l) => (
                      <ListingCard key={l.id} listing={l} lang={lang} />
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-3">
                    <p className="text-sm text-[#6E5A51]">
                      {t(
                        lang,
                        farmPetCount > 0
                          ? "farm.listings.filterEmpty"
                          : "farm.listings.empty",
                      )}
                    </p>
                    {isOwner && farmPetCount === 0 ? (
                      <Link
                        href="/app/account/listings/new"
                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] transition-colors"
                      >
                        {t(lang, "farm.listings.createPost")}
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-[#2B1E19]">
                    {t(lang, "farm.tab.reviews")}
                    {reviewCount > 0 ? ` (${reviewCount})` : ""}
                  </h2>
                  {!isOwner && isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => setReviewOpen(true)}
                      className="rounded-full bg-[#D97706] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B45309]"
                    >
                      {t(lang, "farm.review.open")}
                    </button>
                  ) : null}
                </div>
                {reviewsLoading ? (
                  <p className="text-sm text-[#6E5A51]">{t(lang, "common.loading")}</p>
                ) : reviewThreads.length > 0 ? (
                  <div className="space-y-3">
                    {reviewThreads.map((thread) => (
                      <article
                        key={thread.id}
                        className="rounded-2xl border border-[#F3E2C8] bg-white p-4"
                      >
                        <p className="text-sm font-semibold text-[#2B1E19]">
                          {"★".repeat(thread.rating)}
                          <span className="ml-2 font-normal text-[#6E5A51]">
                            {thread.rating}/5
                          </span>
                        </p>
                        {thread.body ? (
                          <p className="mt-2 text-sm text-[#2B1E19]">{thread.body}</p>
                        ) : null}
                        {thread.supplements?.length ? (
                          <div className="mt-3 space-y-2 border-l-2 border-[#F3E2C8] pl-3">
                            {thread.supplements.map((sup) => (
                              <div key={sup.id}>
                                <p className="text-xs font-semibold text-[#6E5A51]">
                                  {t(lang, "farm.review.supplement")} · {"★".repeat(sup.rating)}
                                </p>
                                {sup.body ? (
                                  <p className="text-sm text-[#2B1E19]">{sup.body}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6E5A51] py-8 text-center">
                    {t(lang, "farm.reviews.empty")}
                  </p>
                )}
              </div>
            )}

            {tab === "warranty" && (
              <FarmWarrantyTab
                lang={lang}
                policies={breeder.warrantyPolicies ?? []}
                isOwner={isOwner}
                profileId={breeder.id}
                farmFrom={farmFrom}
                primarySpecies={breeder.primarySpecies}
              />
            )}
          </div>

          {/* Right 30% sticky */}
          <aside className="w-full lg:w-[30%] lg:sticky lg:top-24 space-y-4">
            {!isOwner && (
              <div className="bg-white border border-[#F3E2C8] rounded-2xl p-4 space-y-2.5 shadow-[0_10px_30px_-24px_rgba(217,119,6,0.35)]">
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (tab !== "reviews") selectTab("reviews");
                      setReviewOpen(true);
                    }}
                    className="w-full py-2.5 border border-[#F3E2C8] text-[#2B1E19] text-sm font-semibold rounded-xl hover:bg-amber-50 transition-colors"
                  >
                    ⭐ {t(lang, "farm.review.open")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void messageBreeder()}
                  disabled={messageBusy}
                  className="w-full py-3 bg-[#D97706] text-white text-sm font-semibold rounded-xl hover:bg-[#B45309] transition-colors disabled:opacity-60"
                >
                  💬 {t(lang, "farm.cta.message")}
                </button>
                {messageError ? (
                  <p className="text-[11px] text-red-600">{messageError}</p>
                ) : null}
                <span
                  className="block w-full"
                  title={t(lang, "farm.cta.videoSoon")}
                >
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full py-2.5 border border-[#F3E2C8] text-[#2B1E19]/55 text-sm font-medium rounded-xl cursor-not-allowed opacity-60"
                  >
                    📹 {t(lang, "farm.cta.video")}
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      requireLogin();
                      return;
                    }
                    setReportOpen(true);
                  }}
                  className="w-full py-2 text-[#6E5A51] text-xs font-medium hover:text-red-600 transition-colors"
                >
                  {t(lang, "detail.report")}
                </button>
              </div>
            )}

            <div className="bg-white border border-[#F3E2C8] rounded-2xl p-4 space-y-4">
              <h2 className="text-xs font-semibold tracking-[0.12em] uppercase text-[#6E5A51]">
                {t(lang, "farm.trust.title")}
              </h2>
              <div>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-sm text-[#2B1E19]">
                    {t(lang, "farm.trust.quality")}
                  </span>
                  <span className="font-display text-xl font-semibold text-[#D97706]">
                    {trust}/100
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#F3E2C8] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#D97706]"
                    style={{ width: `${Math.min(100, trust)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-[#2B1E19]">
                {trustMetrics.rating != null && reviewCount > 0 ? (
                  <>
                    ⭐ {trustMetrics.rating.toFixed(1)} / 5.0{" "}
                    <span className="text-[#6E5A51]">
                      ({reviewCount} {t(lang, "breeders.card.reviews")})
                    </span>
                  </>
                ) : (
                  <>
                    ⭐{" "}
                    {formatBreederReviewLabel(
                      trustMetrics.rating ?? 0,
                      reviewCount,
                      lang,
                    ) || t(lang, "farm.trust.ratingEmpty")}
                  </>
                )}
              </p>
              <p className="text-sm text-[#2B1E19]">
                ⚡{" "}
                {trustMetrics.responseMinutes != null
                  ? t(lang, "farm.trust.response").replace(
                      "{minutes}",
                      String(trustMetrics.responseMinutes),
                    )
                  : t(lang, "farm.trust.responseEmpty")}
              </p>
              <p className="text-sm text-[#2B1E19]">
                📦 {trustMetrics.petsRehomed} {t(lang, "farm.trust.adopted")}
              </p>
            </div>
          </aside>
        </div>
      </div>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setReportOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-[#F3E2C8]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-[#2B1E19] mb-4">
              {t(lang, "farm.report.title")}
            </h2>
            {reportDone ? (
              <p className="text-sm text-emerald-700 mb-4">
                {t(lang, "detail.reportSuccess")}
              </p>
            ) : (
              <div className="space-y-2 mb-5">
                {BREEDER_REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#FDFBF7] cursor-pointer text-sm text-[#2B1E19]"
                  >
                    <input
                      type="radio"
                      name="reason"
                      className="accent-[#D97706]"
                      checked={reportReason === r}
                      onChange={() => setReportReason(r)}
                    />
                    {reasonLabels[r]}
                  </label>
                ))}
              </div>
            )}
            {reportError ? (
              <p className="text-xs text-red-600 mb-3">{reportError}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2.5 border border-[#F3E2C8] text-[#6E5A51] text-sm font-medium rounded-full"
              >
                {t(lang, "common.cancel")}
              </button>
              {!reportDone && (
                <button
                  type="button"
                  onClick={() => void submitReport()}
                  disabled={reportBusy}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {lang === "VI" ? "Gửi báo cáo" : "Submit"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <FarmReviewModal
        lang={lang}
        open={reviewOpen}
        busy={reviewBusy}
        error={reviewError}
        onClose={() => {
          if (!reviewBusy) setReviewOpen(false);
        }}
        onSubmit={(payload) => void submitFarmReview(payload)}
      />
    </div>
  );
}
