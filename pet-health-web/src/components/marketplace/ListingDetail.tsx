"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Lang, Listing } from "@/lib/types";
import { genderLabel, t } from "@/i18n";
import { formatPriceVnd, isBlankDisplayValue } from "@/lib/formatPrice";
import { listingShareUrl } from "@/lib/config";
import type { PublicComment } from "@/lib/api/public";
import { VerifiedBadge } from "./Badges";
import { showBreederVerifiedBadge } from "@/lib/breederVerificationUi";
import { WarrantyPolicyViewer } from "./WarrantyPolicyViewer";
import { mapApiPost } from "@/lib/mappers";
import type { ApiPetFeedPost } from "@/lib/types";
import {
  canShowListingStatusUpdate,
  canShowListingUpdateDetails,
  canShowWarrantyUpdateCta,
  isListingOwner,
  isListingOwnerActionsLocked,
  listingDetailBackHref,
  listingEditHref,
  listingVisitorActions,
  parseListingDetailFrom,
} from "@/lib/listingOwnerActions";
import { parseSaleReviewQuery } from "@/lib/breederFarmReviews";
import { ListingStatusModal, type ListingStatusSubmitPayload } from "./ListingStatusModal";
import { SaleReviewModal } from "./SaleReviewModal";
import {
  mergeListingAfterWarrantyAttach,
  normalizeWarrantyPolicyOptions,
  warrantyPolicyIdForApi,
  type WarrantyPolicyOption,
} from "@/lib/listingWarrantyAttach";
import { buildListingGalleryItems } from "@/lib/listingGallery";
import {
  canDownloadPostMedia,
  listingMediaDownloadFallback,
  mediaDownloadFileName,
  shouldBlockMediaSave,
} from "@/lib/mediaDownload";
import { LISTING_ACTION_MODAL_Z_CLASS } from "@/lib/listingModalLayers";
import {
  listingDealStatusTone,
  listingPersonalityTagClass,
  listingWarrantyCardTone,
} from "@/lib/listingDetailCardTones";
import { startChatAndOpenUi, startChatMessageKey } from "@/lib/startFarmChat";
import { useOptionalChatDock } from "@/components/messages/ChatDockProvider";
import {
  ListingMediaAvailabilityBadge,
  ListingMediaOverlayTags,
} from "./ListingMediaOverlayTags";

const REPORT_REASONS = [
  "stock_photo_spam",
  "wrong_category_species",
  "inaccurate_listing",
  "abusive_communication",
  "concealed_illness",
  "forged_documents",
  "confirmed_scam",
  "prohibited_wildlife",
] as const;

type UiComment = {
  id: string;
  author: string;
  text: string;
  time: string;
  isBreeder: boolean;
};

function SpecCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  if (isBlankDisplayValue(value)) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
      <span className="text-lg leading-none mt-0.5" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-900 leading-snug break-words [overflow-wrap:anywhere]">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatCommentTime(iso: string, lang: Lang): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "VI" ? "Vừa xong" : "Just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function mapApiComment(
  c: PublicComment,
  breederUserId: string | undefined,
  lang: Lang,
): UiComment {
  return {
    id: c.id,
    author: c.author_display_name || (lang === "VI" ? "Người dùng" : "User"),
    text: c.body,
    time: formatCommentTime(c.created_at, lang),
                    isBreeder: Boolean(breederUserId && c.user_id === breederUserId),
  };
}

export function ListingDetail({
  listing: initialListing,
  lang,
  isLoggedIn = false,
  isAdmin = false,
  currentUserId = null,
  initialComments = [],
}: {
  listing: Listing;
  lang: Lang;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  currentUserId?: string | null;
  initialComments?: PublicComment[];
}) {
  const router = useRouter();
  const dock = useOptionalChatDock();
  const searchParams = useSearchParams();
  const listingFrom = parseListingDetailFrom(searchParams.get("from"));
  const backHref = listingDetailBackHref(listingFrom);
  const [listing, setListing] = useState(initialListing);
  const ownerUserId = listing.ownerUserId || listing.breeder.userId;
  const isOwner = isListingOwner(currentUserId, ownerUserId);
  const { showMessage, showReport } = listingVisitorActions(isOwner);
  const showUpdateDetails = canShowListingUpdateDetails({
    isOwner,
    status: listing.status,
  });
  const showWarrantyUpdate = canShowWarrantyUpdateCta({
    isOwner,
    status: listing.status,
    frozen: Boolean(listing.warrantyPolicy?.frozen),
  });
  const showStatusUpdate = canShowListingStatusUpdate({
    isOwner,
    status: listing.status,
  });
  const warrantyTone = listingWarrantyCardTone(Boolean(listing.warrantyPolicy));
  const soldTone = listingDealStatusTone("sold");
  const cancelledTone = listingDealStatusTone("cancelled");
  const allowMediaDownload = canDownloadPostMedia(isAdmin);
  const blockMediaSave = shouldBlockMediaSave(isAdmin);
  const breederUserId = ownerUserId;
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<UiComment[]>(() =>
    initialComments.map((c) => mapApiComment(c, breederUserId, lang)),
  );
  const [policyOpen, setPolicyOpen] = useState(false);
  const [attachWarrantyOpen, setAttachWarrantyOpen] = useState(false);
  const [attachWarrantyId, setAttachWarrantyId] = useState("");
  const [attachWarrantyOptions, setAttachWarrantyOptions] = useState<
    WarrantyPolicyOption[]
  >([]);
  const [attachWarrantyLoading, setAttachWarrantyLoading] = useState(false);
  const [attachWarrantyBusy, setAttachWarrantyBusy] = useState(false);
  const [attachWarrantyError, setAttachWarrantyError] = useState("");
  const [activeMedia, setActiveMedia] = useState(0);
  const [saved, setSaved] = useState(Boolean(listing.saved));
  const [favCount, setFavCount] = useState(
    Math.max(0, Math.floor(Number(listing.favoriteCount) || 0)),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [saleReviewOpen, setSaleReviewOpen] = useState(false);
  const [saleReviewBusy, setSaleReviewBusy] = useState(false);
  const [saleReviewError, setSaleReviewError] = useState("");
  const [saleReviewNotice, setSaleReviewNotice] = useState("");
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reportNote, setReportNote] = useState("");
  const [reportDone, setReportDone] = useState(false);

  const title = lang === "VI" ? listing.titleVI : listing.title;
  const description =
    lang === "VI" ? listing.descriptionVI : listing.description;
  const personality =
    lang === "VI" ? listing.personalityVI : listing.personality;
  const gallery = buildListingGalleryItems({
    mediaUrls: listing.mediaUrls,
    mediaUrl: listing.mediaUrl,
    videoUrl: listing.videoUrl,
  });
  const activeItem = gallery[Math.min(activeMedia, Math.max(gallery.length - 1, 0))] || gallery[0] || null;
  const price = formatPriceVnd(listing.price) || listing.price;
  const isSoldListing =
    String(listing.status || "").trim().toLowerCase() === "sold";
  const isSoldVisitorView = isSoldListing && !isOwner;
  const isOwnerLockedView =
    isOwner && isListingOwnerActionsLocked(listing.status);
  const isReadOnlyEngagement = isSoldVisitorView || isOwnerLockedView;

  const clearSaleReviewFromUrl = () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("saleReview")) return;
    url.searchParams.delete("saleReview");
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", qs ? `${url.pathname}?${qs}` : url.pathname);
  };

  useEffect(() => {
    setSaved(Boolean(listing.saved));
    setFavCount(Math.max(0, Math.floor(Number(listing.favoriteCount) || 0)));
  }, [listing.id, listing.saved, listing.favoriteCount]);

  useEffect(() => {
    if (!isLoggedIn || !isSoldVisitorView) return;
    const fromSaleReviewPrompt = parseSaleReviewQuery(searchParams.get("saleReview"));
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/listings/${encodeURIComponent(listing.id)}/sale-review`,
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (fromSaleReviewPrompt) clearSaleReviewFromUrl();
        if (data?.data?.hasReviewed) {
          setSaleReviewNotice(t(lang, "farm.review.alreadyReviewed"));
          return;
        }
        if (fromSaleReviewPrompt) setSaleReviewOpen(true);
      } catch {
        if (!cancelled && fromSaleReviewPrompt) {
          clearSaleReviewFromUrl();
          setSaleReviewOpen(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, isSoldVisitorView, listing.id, lang, searchParams, router]);

  useEffect(() => {
    if (!parseSaleReviewQuery(searchParams.get("saleReview"))) return;
    if (!isLoggedIn) {
      router.push(`/login?next=/app/pet-feed/posts/${listing.id}?saleReview=1`);
    }
  }, [searchParams, isLoggedIn, listing.id, router]);

  const submitListingStatus = async (payload: ListingStatusSubmitPayload) => {
    setStatusBusy(true);
    setStatusError("");
    try {
      const body =
        payload.type === "sold"
          ? {
              status: "sold" as const,
              saleChannel: payload.saleChannel,
              buyerEmail: payload.buyerEmail,
            }
          : { status: payload.type };
      const res = await fetch(
        `/api/listings/${encodeURIComponent(listing.id)}/listing-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t(lang, "listing.statusModal.failed"));
      }
      if (data.data) {
        setListing(mapApiPost(data.data as ApiPetFeedPost));
      }
      setStatusModalOpen(false);
      router.refresh();
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : t(lang, "listing.statusModal.failed"),
      );
    } finally {
      setStatusBusy(false);
    }
  };

  const submitSaleReview = async (payload: {
    rating: number;
    body: string;
    photoUrls: string[];
  }) => {
    setSaleReviewBusy(true);
    setSaleReviewError("");
    try {
      const res = await fetch(
        `/api/listings/${encodeURIComponent(listing.id)}/sale-review`,
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
      setSaleReviewOpen(false);
      setSaleReviewNotice(t(lang, "farm.review.pendingSubmitted"));
      router.refresh();
    } catch (err) {
      setSaleReviewError(
        err instanceof Error ? err.message : t(lang, "farm.review.failed"),
      );
    } finally {
      setSaleReviewBusy(false);
    }
  };

  const downloadActiveMedia = () => {
    if (!allowMediaDownload || !activeItem?.url) return;
    const filename = mediaDownloadFileName(
      activeItem.url,
      listingMediaDownloadFallback(
        listing.id,
        activeItem.type,
        activeMedia,
      ).replace(/\.[^.]+$/, ""),
    );
    const anchor = document.createElement("a");
    anchor.href = activeItem.url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const blockMediaContextMenu = (e: React.MouseEvent) => {
    if (blockMediaSave) e.preventDefault();
  };

  const reasonLabels = useMemo(
    () => ({
      stock_photo_spam:
        lang === "VI" ? "Ảnh mạng / spam bài trùng" : "Stock photos / spam",
      wrong_category_species:
        lang === "VI" ? "Sai danh mục / giống loài" : "Wrong category / species",
      inaccurate_listing:
        lang === "VI" ? "Sai thông tin tin đăng" : "Inaccurate listing info",
      abusive_communication:
        lang === "VI" ? "Thái độ độc hại / quấy rối" : "Abusive communication",
      concealed_illness:
        lang === "VI" ? "Che giấu bệnh truyền nhiễm" : "Concealed illness",
      forged_documents:
        lang === "VI" ? "Giả mạo giấy tờ" : "Forged documents",
      confirmed_scam:
        lang === "VI" ? "Lừa đảo cọc / tráo bé" : "Scam / bait-and-switch",
      prohibited_wildlife:
        lang === "VI" ? "Động vật hoang dã / cấm" : "Prohibited wildlife",
    }),
    [lang],
  );

  useEffect(() => {
    setListing(initialListing);
  }, [initialListing]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const postId = initialListing.id;
    if (!postId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/listings/${encodeURIComponent(postId)}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data?.data) {
          setListing(mapApiPost(data.data as ApiPetFeedPost));
        }
      } catch {
        // Keep SSR listing if live fetch fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, initialListing.id]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/listings/${listing.id}/favorite`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setSaved(Boolean(data?.data?.favorited));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, listing.id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/listings/${encodeURIComponent(listing.id)}/comments`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const rows = Array.isArray(data?.data) ? data.data : [];
        setComments(
          rows.map((c: PublicComment) => mapApiComment(c, breederUserId, lang)),
        );
      } catch {
        // Keep SSR comments when refresh fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listing.id, breederUserId, lang]);

  const requireLogin = () => {
    router.push(`/login?next=/app/pet-feed/posts/${listing.id}`);
  };

  const openAttachWarranty = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setAttachWarrantyOpen(true);
    setAttachWarrantyError("");
    setAttachWarrantyId(listing.warrantyPolicy?.id || "");
    setAttachWarrantyLoading(true);
    try {
      const res = await fetch("/api/warranty-policies");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed");
      }
      const options = normalizeWarrantyPolicyOptions(
        Array.isArray(data?.data) ? data.data : [],
      );
      setAttachWarrantyOptions(options);
    } catch (err) {
      setAttachWarrantyOptions([]);
      setAttachWarrantyError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAttachWarrantyLoading(false);
    }
  };

  const saveAttachWarranty = async () => {
    setAttachWarrantyBusy(true);
    setAttachWarrantyError("");
    setActionError("");
    try {
      const res = await fetch(`/api/listings/${listing.id}/warranty`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyPolicyId: warrantyPolicyIdForApi(attachWarrantyId),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed");
      }
      if (data?.data) {
        setListing((prev) =>
          mergeListingAfterWarrantyAttach(
            prev,
            mapApiPost(data.data as ApiPetFeedPost),
          ),
        );
      }
      setAttachWarrantyOpen(false);
    } catch (err) {
      setAttachWarrantyError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAttachWarrantyBusy(false);
    }
  };

  const sendComment = async () => {
    if (isReadOnlyEngagement) return;
    if (!comment.trim()) return;
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setBusy("comment");
    setActionError("");
    try {
      const res = await fetch(`/api/listings/${listing.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      const created = data.data as PublicComment | undefined;
      if (created?.id) {
        setComments((prev) => [
          ...prev,
          mapApiComment(created, breederUserId, lang),
        ]);
      }
      setComment("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const messageSeller = async () => {
    if (!showMessage) return;
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setBusy("message");
    setActionError("");
    try {
      const result = await startChatAndOpenUi({
        listingId: listing.id,
        farmName: listing.breeder.name,
        listingTitle: title,
        openChat: dock?.openChat,
        replaceChat: dock?.replaceChat,
        abortChat: dock?.abortChat,
        navigate: (href) => router.push(href),
      });
      if (!result.ok) {
        if (result.status === 401) {
          requireLogin();
          return;
        }
        setActionError(t(lang, startChatMessageKey(result.status, result.code)));
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const toggleFavorite = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    const next = !saved;
    const nextCount = Math.max(0, favCount + (next ? 1 : -1));
    setSaved(next);
    setFavCount(nextCount);
    setBusy("favorite");
    setActionError("");
    try {
      const res = await fetch(`/api/listings/${listing.id}/favorite`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
    } catch (err) {
      setSaved(!next);
      setFavCount(favCount);
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const submitReport = async () => {
    if (!showReport) return;
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setBusy("report");
    setActionError("");
    try {
      const res = await fetch(`/api/listings/${listing.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reportReason,
          note: reportNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setReportDone(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportDone(false);
        setReportNote("");
      }, 1200);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const shareListing = async () => {
    const url = listingShareUrl(listing.id);
    const shareTitle = title || "PetCare: Pet Marketplace";
    const shareData: ShareData = {
      title: shareTitle,
      text: shareTitle,
      url,
    };

    setShareNotice("");
    setActionError("");

    const preferNativeShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      (navigator.maxTouchPoints > 0 ||
        /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent));

    if (preferNativeShare) {
      try {
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Fall through to clipboard on desktop/share errors.
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareNotice(t(lang, "detail.shareCopied"));
        window.setTimeout(() => setShareNotice(""), 2500);
        return;
      }
    } catch {
      // Fall through to legacy copy.
    }

    try {
      const input = document.createElement("textarea");
      input.value = url;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(input);
      if (ok) {
        setShareNotice(t(lang, "detail.shareCopied"));
        window.setTimeout(() => setShareNotice(""), 2500);
        return;
      }
    } catch {
      // ignore
    }

    setActionError(t(lang, "detail.shareFailed"));
  };

  return (
    <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-slate-500 text-sm hover:text-slate-900 transition-colors mb-5"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            d="M10 12 6 8l4-4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t(lang, "detail.back")}
      </Link>
      {saleReviewNotice ? (
        <div
          role="status"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {saleReviewNotice}
        </div>
      ) : null}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <div
            className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[4/3] mb-3"
            onContextMenu={blockMediaContextMenu}
          >
            {activeItem?.type === "video" ? (
              <video
                key={activeItem.url}
                src={activeItem.url}
                className="w-full h-full object-contain bg-black"
                controls
                playsInline
                preload="metadata"
                controlsList={blockMediaSave ? "nodownload" : undefined}
                disablePictureInPicture={blockMediaSave}
                onContextMenu={blockMediaContextMenu}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeItem?.url || listing.mediaUrl}
                alt={listing.breed}
                className="w-full h-full object-cover"
                draggable={!blockMediaSave}
                onContextMenu={blockMediaContextMenu}
              />
            )}
            {allowMediaDownload && activeItem?.url ? (
              <button
                type="button"
                onClick={downloadActiveMedia}
                title={t(lang, "detail.downloadMediaHint")}
                className="absolute bottom-3 right-3 z-10 rounded-full bg-white/95 border border-[#E8DFD0] px-3 py-1.5 text-xs font-semibold text-[#2B1E19] shadow-sm hover:bg-white"
              >
                {t(lang, "detail.downloadMedia")}
              </button>
            ) : null}
            <ListingMediaAvailabilityBadge listing={listing} lang={lang} />
            <ListingMediaOverlayTags
              listing={listing}
              lang={lang}
              favoriteCount={favCount}
            />
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {gallery.map((item, i) => (
              <button
                key={`${item.type}-${item.url}-${i}`}
                type="button"
                onClick={() => setActiveMedia(i)}
                onContextMenu={blockMediaContextMenu}
                className={`relative rounded-lg overflow-hidden aspect-square bg-slate-100 ${
                  i === activeMedia
                    ? "ring-2 ring-[#D97706]"
                    : "opacity-60 hover:opacity-100 transition-opacity"
                }`}
              >
                {item.type === "video" ? (
                  <>
                    <video
                      src={item.url}
                      className="w-full h-full object-contain bg-black"
                      muted
                      playsInline
                      preload="metadata"
                      controlsList={blockMediaSave ? "nodownload" : undefined}
                      onContextMenu={blockMediaContextMenu}
                    />
                    <span className="absolute inset-x-1 bottom-1 z-10 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {t(lang, "detail.video")}
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={!blockMediaSave}
                    onContextMenu={blockMediaContextMenu}
                  />
                )}
              </button>
            ))}
          </div>
          {listing.evidenceUrls && listing.evidenceUrls.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">
                {t(lang, "detail.evidence")}
              </p>
              <div className="flex gap-2">
                {listing.evidenceUrls.map((url, i) => (
                  <div
                    key={i}
                    className="w-20 h-16 rounded-lg overflow-hidden bg-amber-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Vaccine evidence"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-slate-900 mb-1 leading-snug break-words [overflow-wrap:anywhere]">
                  {title}
                </h1>
                {price ? (
                  <p className="text-2xl font-bold text-[#D97706] break-words">
                    {price}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isReadOnlyEngagement ? (
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                      saved
                        ? "border-rose-200 bg-rose-50 text-rose-600"
                        : "border-slate-200 text-slate-400"
                    }`}
                    aria-hidden
                  >
                    {saved ? "♥" : "♡"}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    disabled={busy === "favorite"}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                      saved
                        ? "border-rose-200 bg-rose-50 text-rose-600"
                        : "border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500"
                    }`}
                    aria-label={t(lang, "detail.save")}
                  >
                    {saved ? "♥" : "♡"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void shareListing()}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                    shareNotice
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                  aria-label={shareNotice || t(lang, "detail.share")}
                  title={shareNotice || t(lang, "detail.share")}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <path d="m16 6-4-4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 2v13" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <SpecCard
                icon="🧬"
                label={t(lang, "detail.breed")}
                value={listing.breed}
              />
              <SpecCard
                icon="📅"
                label={t(lang, "detail.age")}
                value={
                  listing.ageMonths > 0
                    ? `${listing.ageMonths} ${t(lang, "detail.months")}`
                    : ""
                }
              />
              <SpecCard
                icon="⚥"
                label={t(lang, "detail.gender")}
                value={genderLabel(lang, listing.gender)}
              />
              <SpecCard
                icon="📍"
                label={t(lang, "detail.location")}
                value={listing.location}
              />
              <SpecCard
                icon="💉"
                label="Vaccine"
                value={listing.vaccineStatus}
              />
              <SpecCard
                icon="💊"
                label={t(lang, "detail.deworming")}
                value={listing.dewormingStatus}
              />
            </div>
            {personality.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {personality.map((tag) => (
                  <span key={tag} className={listingPersonalityTagClass()}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {!isBlankDisplayValue(description) ? (
              <p className="mb-5 text-sm text-slate-600 leading-relaxed break-words [overflow-wrap:anywhere]">
                {description}
              </p>
            ) : null}
            <Link
              href={`/app/breeders/${listing.breeder.id}`}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-5 hover:bg-slate-100 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={listing.breeder.avatar}
                alt={listing.breeder.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {listing.breeder.name}
                  </p>
                  {showBreederVerifiedBadge(listing.breeder.verified, {
                    complianceStripped: listing.breeder.complianceVerifiedStripped,
                    gated: false,
                  }) && <VerifiedBadge />}
                </div>
                <p className="text-xs text-slate-400">
                  {listing.breeder.location}
                </p>
              </div>
            </Link>

            {actionError ? (
              <p className="mb-3 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                {actionError}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              {listing.warrantyPolicy ? (
                <div className={warrantyTone.shell}>
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setPolicyOpen(true)}
                      className="min-w-0 flex-1 text-left hover:opacity-90 transition-opacity"
                    >
                      <p className={warrantyTone.title}>
                        🛡️ {listing.warrantyPolicy.title}
                      </p>
                      <p className={warrantyTone.hint}>
                        {listing.warrantyPolicy.frozen
                          ? t(lang, "warranty.frozenHint")
                          : t(lang, "warranty.viewCta")}
                      </p>
                    </button>
                    {showWarrantyUpdate ? (
                      <button
                        type="button"
                        onClick={() => void openAttachWarranty()}
                        className={warrantyTone.updateBtn}
                      >
                        {t(lang, "warranty.updateCta")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className={warrantyTone.shell}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={warrantyTone.title}>
                        {t(lang, "warranty.noneTitle")}
                      </p>
                      <p className={warrantyTone.hint}>
                        {t(lang, "warranty.noneHint")}
                      </p>
                    </div>
                    {showWarrantyUpdate ? (
                      <button
                        type="button"
                        onClick={() => void openAttachWarranty()}
                        className={warrantyTone.updateBtn}
                      >
                        {t(lang, "warranty.updateCta")}
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {isOwner && listing.status === "sold" ? (
                <p className={soldTone.shell}>{t(lang, "deal.completed")}</p>
              ) : null}
              {isOwner && listing.status === "cancelled" ? (
                <p className={cancelledTone.shell}>{t(lang, "deal.cancelledClosed")}</p>
              ) : null}

              {isSoldVisitorView ? null : showMessage ? (
                <button
                  type="button"
                  onClick={messageSeller}
                  disabled={busy === "message"}
                  className="w-full py-3 bg-[#D97706] text-white text-sm font-semibold rounded-full hover:bg-[#B45309] transition-colors disabled:opacity-60"
                >
                  💬 {t(lang, "detail.message")}
                </button>
              ) : null}
              {showUpdateDetails || showStatusUpdate ? (
                <div className="flex gap-2">
                  {showUpdateDetails ? (
                    <Link
                      href={listingEditHref(listing.id)}
                      className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#D97706] px-3 py-2.5 text-xs font-semibold text-white shadow-sm shadow-amber-200/60 transition-colors hover:bg-[#B45309]"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M12 20h9" strokeLinecap="round" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinejoin="round" />
                      </svg>
                      <span className="truncate">{t(lang, "detail.updateDetails")}</span>
                    </Link>
                  ) : null}
                  {showStatusUpdate ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusError("");
                        setStatusModalOpen(true);
                      }}
                      className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-semibold transition-colors ${
                        showUpdateDetails
                          ? "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          : "bg-[#D97706] text-white shadow-sm shadow-amber-200/60 hover:bg-[#B45309]"
                      }`}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" strokeLinejoin="round" />
                        <path d="M4 22v-7" strokeLinecap="round" />
                      </svg>
                      <span className="truncate">{t(lang, "listing.statusModal.open")}</span>
                    </button>
                  ) : null}
                </div>
              ) : isSoldVisitorView ? null : showReport ? (
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      requireLogin();
                      return;
                    }
                    setReportOpen(true);
                  }}
                  className="py-2.5 border border-slate-200 text-slate-500 text-sm font-medium rounded-full hover:border-red-200 hover:text-red-500 transition-colors"
                >
                  {t(lang, "detail.report")}
                </button>
              </div>
              ) : null}
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-900 mb-5">
          {t(lang, "detail.comments")} ({comments.length})
        </h2>
        <div className={`space-y-4 ${isReadOnlyEngagement ? "" : "mb-6"}`}>
          {comments.length === 0 ? (
            <p className="text-sm text-slate-400">
              {lang === "VI"
                ? "Chưa có bình luận nào."
                : "No comments yet."}
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                    c.isBreeder
                      ? "bg-[#D97706] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {(c.author[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-slate-900">
                      {c.author}
                    </p>
                    {c.isBreeder &&
                      showBreederVerifiedBadge(true, {
                        complianceStripped: listing.breeder.complianceVerifiedStripped,
                        gated: false,
                      }) && <VerifiedBadge size="xs" />}
                    <p className="text-[10px] text-slate-400">{c.time}</p>
                  </div>
                  <p className="text-sm text-slate-600">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {!isReadOnlyEngagement ? (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#D97706] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {isLoggedIn ? "Y" : "?"}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendComment();
              }}
              placeholder={
                isLoggedIn
                  ? t(lang, "detail.writeComment")
                  : t(lang, "detail.loginToComment")
              }
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#D97706]/20 focus:border-[#D97706] transition-all"
            />
            <button
              type="button"
              onClick={() => void sendComment()}
              disabled={busy === "comment"}
              className="px-4 py-2 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309] transition-colors disabled:opacity-60"
            >
              {t(lang, "detail.send")}
            </button>
          </div>
        </div>
        ) : null}
      </div>

      {attachWarrantyOpen && (
        <div
          className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
          onClick={() => setAttachWarrantyOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-slate-900">
              {t(lang, "warranty.attachTitle")}
            </h2>
            <p className="text-sm text-slate-600">
              {listing.title} · {listing.breeder.name}
            </p>
            {attachWarrantyLoading ? (
              <p className="text-sm text-slate-500">…</p>
            ) : (
              <>
                <label className="block text-xs font-medium text-slate-500">
                  {t(lang, "listing.new.warranty")}
                  <select
                    value={attachWarrantyId}
                    onChange={(e) => {
                      setAttachWarrantyId(e.target.value);
                      setAttachWarrantyError("");
                    }}
                    className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                  >
                    <option value="">
                      {t(lang, "listing.new.warrantyNone")}
                    </option>
                    {attachWarrantyOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                {attachWarrantyOptions.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    {t(lang, "warranty.attachEmpty")}{" "}
                    <Link
                      href="/app/account/warranty"
                      className="underline font-medium"
                    >
                      {t(lang, "listing.new.warrantyManage")}
                    </Link>
                  </p>
                ) : null}
              </>
            )}
            {attachWarrantyError ? (
              <p className="text-xs text-red-600">{attachWarrantyError}</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAttachWarrantyOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 text-sm rounded-full"
              >
                {t(lang, "common.cancel")}
              </button>
              <button
                type="button"
                disabled={attachWarrantyBusy || attachWarrantyLoading}
                onClick={() => void saveAttachWarranty()}
                className="flex-1 py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-full disabled:opacity-60"
              >
                {t(lang, "warranty.attachSave")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ListingStatusModal
        lang={lang}
        open={statusModalOpen}
        currentStatus={listing.status}
        busy={statusBusy}
        error={statusError}
        onClose={() => {
          if (!statusBusy) setStatusModalOpen(false);
        }}
        onSubmit={(payload) => void submitListingStatus(payload)}
      />

      <SaleReviewModal
        lang={lang}
        open={saleReviewOpen}
        busy={saleReviewBusy}
        error={saleReviewError}
        onClose={() => {
          if (!saleReviewBusy) setSaleReviewOpen(false);
        }}
        onSubmit={(payload) => void submitSaleReview(payload)}
      />

      {reportOpen && (
        <div
          className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
          onClick={() => setReportOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-slate-900 mb-4">
              {t(lang, "detail.report")}
            </h2>
            {reportDone ? (
              <p className="text-sm text-emerald-700 mb-4">
                {t(lang, "detail.reportSuccess")}
              </p>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
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
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder={
                    lang === "VI"
                      ? "Ghi chú thêm (tuỳ chọn)"
                      : "Optional note"
                  }
                  rows={2}
                  className="w-full mb-4 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-full"
              >
                {t(lang, "common.cancel")}
              </button>
              {!reportDone && (
                <button
                  type="button"
                  onClick={() => void submitReport()}
                  disabled={busy === "report"}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {lang === "VI" ? "Gửi báo cáo" : "Submit"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <WarrantyPolicyViewer
        lang={lang}
        policy={listing.warrantyPolicy ?? null}
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
        listingSpecies={listing.species}
      />

    </div>
  );
}
