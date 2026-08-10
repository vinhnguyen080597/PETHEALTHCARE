"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Lang, Listing } from "@/lib/types";
import { genderLabel, t, type EnKey } from "@/i18n";
import { formatPriceVnd, isBlankDisplayValue } from "@/lib/formatPrice";
import { listingShareUrl } from "@/lib/config";
import type { PublicComment } from "@/lib/api/public";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { EscrowBadge, VerifiedBadge } from "./Badges";
import { WarrantyPolicyViewer } from "./WarrantyPolicyViewer";
import { mapApiPost } from "@/lib/mappers";
import type { ApiPetFeedPost } from "@/lib/types";
import {
  canShowDepositRequest,
  canShowListingUpdateDetails,
  canShowWarrantyUpdateCta,
  isListingOwner,
  listingDetailBackHref,
  listingEditHref,
  listingVisitorActions,
  parseListingDetailFrom,
} from "@/lib/listingOwnerActions";
import {
  depositHoldSenLabel,
  filterSenUserOptions,
  formatSenOptionLabel,
  normalizeSenUserOptions,
  type SenUserOption,
} from "@/lib/listingDepositSen";
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
import {
  resolveWarrantyFarmSpecies,
  warrantyInfectiousFieldKey,
} from "@/lib/warrantySpeciesCopy";
import { LISTING_ACTION_MODAL_Z_CLASS } from "@/lib/listingModalLayers";
import {
  listingDealStatusTone,
  listingPersonalityTagClass,
  listingWarrantyCardTone,
} from "@/lib/listingDetailCardTones";
import {
  buildCancelDepositReasonText,
  canBreederCancelDeposit,
  canBreederRequestHandoff,
  canSenConfirmCancel,
  canSenConfirmHandoff,
  canSenOpenDispute,
  CANCEL_DEPOSIT_MAX_PHOTOS,
  CANCEL_DEPOSIT_REASON_KEYS,
  COMPLETE_HANDOFF_MAX_PHOTOS,
  DEAL_DISPUTE_MAX_PHOTOS,
  daysLeftUntilDeadline,
  dealPhotosDropHint,
  isDealDisputeOpen,
  validateCancelDepositRequest,
  validateDisputeRequest,
  validateHandoffPhotos,
  waitingForSenMessage,
  type CancelDepositReasonKey,
} from "@/lib/listingDealHandoff";
import { DealPhotoPicker } from "./DealPhotoPicker";

const REPORT_REASONS = [
  "scam",
  "misleading_health_claims",
  "abusive_content",
  "fake_contact",
  "unsafe_transaction",
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
        <p className="text-sm font-semibold text-slate-900 leading-snug">
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
  const searchParams = useSearchParams();
  const listingFrom = parseListingDetailFrom(searchParams.get("from"));
  const backHref = listingDetailBackHref(listingFrom);
  const [listing, setListing] = useState(initialListing);
  const ownerUserId = listing.ownerUserId || listing.breeder.userId;
  const isOwner = isListingOwner(currentUserId, ownerUserId);
  const { showMessage, showReport } = listingVisitorActions(isOwner);
  const showDepositRequest = canShowDepositRequest({
    status: listing.status,
  });
  const showUpdateDetails = canShowListingUpdateDetails({
    isOwner,
    status: listing.status,
  });
  const showWarrantyUpdate = canShowWarrantyUpdateCta({
    isOwner,
    status: listing.status,
    frozen: Boolean(listing.warrantyPolicy?.frozen),
  });
  const warrantyTone = listingWarrantyCardTone(Boolean(listing.warrantyPolicy));
  const depositHoldTone = listingDealStatusTone("deposit_hold");
  const soldTone = listingDealStatusTone("sold");
  const isDealSen = Boolean(
    currentUserId && listing.deal?.senUserId && currentUserId === listing.deal.senUserId,
  );
  const showBreederHandoff = canBreederRequestHandoff({
    isOwner,
    listingStatus: listing.status,
    dealStatus: listing.deal?.status,
  });
  const showBreederCancel = canBreederCancelDeposit({
    isOwner,
    listingStatus: listing.status,
    dealStatus: listing.deal?.status,
  });
  const showSenConfirmHandoff = canSenConfirmHandoff({
    isDealSen,
    listingStatus: listing.status,
    dealStatus: listing.deal?.status,
  });
  const showSenConfirmCancel = canSenConfirmCancel({
    isDealSen,
    listingStatus: listing.status,
    dealStatus: listing.deal?.status,
  });
  const showSenOpenDispute = canSenOpenDispute({
    isDealSen,
    listingStatus: listing.status,
    dealStatus: listing.deal?.status,
  });
  const showDisputeOpen = isDealDisputeOpen({
    listingStatus: listing.status,
    dealStatus: listing.deal?.status,
  });
  const handoffDaysLeft = daysLeftUntilDeadline(listing.deal?.completeDeadlineAt);
  const allowMediaDownload = canDownloadPostMedia(isAdmin);
  const blockMediaSave = shouldBlockMediaSave(isAdmin);
  const breederUserId = ownerUserId;
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<UiComment[]>(() =>
    initialComments.map((c) => mapApiComment(c, breederUserId, lang)),
  );
  const [policyOpen, setPolicyOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAck, setDepositAck] = useState(false);
  const [senUserIdInput, setSenUserIdInput] = useState("");
  const [senSearch, setSenSearch] = useState("");
  const [senOptions, setSenOptions] = useState<SenUserOption[]>([]);
  const [senOptionsLoading, setSenOptionsLoading] = useState(false);
  const [senPickerOpen, setSenPickerOpen] = useState(false);
  const [dealBusy, setDealBusy] = useState(false);
  const [dealMenuOpen, setDealMenuOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completePhotos, setCompletePhotos] = useState<File[]>([]);
  const [completeWaitingOpen, setCompleteWaitingOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReasonKey, setCancelReasonKey] =
    useState<CancelDepositReasonKey>("no_contact");
  const [cancelNote, setCancelNote] = useState("");
  const [cancelPhotos, setCancelPhotos] = useState<File[]>([]);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState("");
  const [disputePhotos, setDisputePhotos] = useState<File[]>([]);
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
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
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
    }),
    [lang],
  );

  useEffect(() => {
    setListing(initialListing);
  }, [initialListing]);

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
    if (!dealMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-deal-menu]")) return;
      setDealMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [dealMenuOpen]);

  const filteredSenOptions = useMemo(
    () => filterSenUserOptions(senOptions, senSearch),
    [senOptions, senSearch],
  );
  const selectedSen = useMemo(
    () => senOptions.find((u) => u.user_id === senUserIdInput) || null,
    [senOptions, senUserIdInput],
  );

  const requireLogin = () => {
    router.push(`/login?next=/app/pet-feed/posts/${listing.id}`);
  };

  const openDepositModal = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setActionError("");
    setDepositAck(false);
    setDepositOpen(true);
    setSenPickerOpen(false);
    if (!isOwner) return;
    setSenOptionsLoading(true);
    try {
      const res = await fetch("/api/sen-users?limit=100");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      const options = normalizeSenUserOptions(
        Array.isArray(data?.data) ? data.data : [],
      );
      setSenOptions(options);
      if (listing.deal?.senUserId) {
        setSenUserIdInput(listing.deal.senUserId);
        const existing = options.find((u) => u.user_id === listing.deal?.senUserId);
        setSenSearch(existing ? formatSenOptionLabel(existing) : "");
      } else {
        setSenUserIdInput("");
        setSenSearch("");
      }
    } catch (err) {
      setSenOptions([]);
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSenOptionsLoading(false);
    }
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
      const res = await fetch(`/api/listings/${listing.id}/conversations`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      const conversationId = data?.data?.id;
      router.push(
        conversationId
          ? `/app/messages?c=${encodeURIComponent(conversationId)}`
          : "/app/messages",
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const runDealAction = async (kind: "deposit" | "complete" | "cancel_confirm") => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    setDealBusy(true);
    setActionError("");
    try {
      let url = "";
      let body: Record<string, unknown> | undefined;
      if (kind === "deposit") {
        if (!depositAck) {
          throw new Error(t(lang, "deal.ackRequired"));
        }
        let senId = senUserIdInput.trim();
        if (isOwner && !senId) {
          const match = senOptions.find(
            (u) => formatSenOptionLabel(u).toLowerCase() === senSearch.trim().toLowerCase(),
          );
          if (match) senId = match.user_id;
        }
        if (isOwner && !senId) {
          throw new Error(t(lang, "deal.senRequired"));
        }
        url = `/api/listings/${listing.id}/deposit/confirm`;
        body = {
          acknowledge: true,
          ...(isOwner && senId ? { senUserId: senId } : {}),
        };
      } else if (kind === "cancel_confirm") {
        url = `/api/listings/${listing.id}/deposit/cancel/confirm`;
      } else {
        url = `/api/listings/${listing.id}/complete/confirm`;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data?.data) {
        setListing(mapApiPost(data.data as ApiPetFeedPost));
      }
      setDepositOpen(false);
      setDepositAck(false);
      setSenPickerOpen(false);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDealBusy(false);
    }
  };

  const submitHandoffRequest = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    const photoError = validateHandoffPhotos(completePhotos);
    if (photoError === "photos_required") {
      setActionError(t(lang, "deal.completePhotosRequired"));
      return;
    }
    if (photoError === "photos_too_many") {
      setActionError(t(lang, "deal.completePhotosTooMany"));
      return;
    }
    setDealBusy(true);
    setActionError("");
    try {
      const fd = new FormData();
      for (const photo of completePhotos) fd.append("photos", photo);
      const res = await fetch(`/api/listings/${listing.id}/complete/request`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data?.data) {
        setListing(mapApiPost(data.data as ApiPetFeedPost));
      }
      setCompleteOpen(false);
      setCompletePhotos([]);
      setCompleteWaitingOpen(true);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDealBusy(false);
    }
  };

  const submitCancelRequest = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    const errCode = validateCancelDepositRequest({
      reasonKey: cancelReasonKey,
      note: cancelNote,
      photos: cancelPhotos,
    });
    if (errCode === "reason_required") {
      setActionError(t(lang, "deal.cancelReasonRequired"));
      return;
    }
    if (errCode === "photos_too_many") {
      setActionError(t(lang, "deal.cancelPhotosTooMany"));
      return;
    }
    setDealBusy(true);
    setActionError("");
    try {
      const reasonLabel = t(
        lang,
        `deal.cancelReason.${cancelReasonKey}` as EnKey,
      );
      const reason = buildCancelDepositReasonText({
        reasonKey: cancelReasonKey,
        reasonLabel,
        note: cancelNote,
      });
      const fd = new FormData();
      fd.set("reason", reason);
      for (const photo of cancelPhotos) fd.append("photos", photo);
      const res = await fetch(`/api/listings/${listing.id}/deposit/cancel`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data?.data) {
        setListing(mapApiPost(data.data as ApiPetFeedPost));
      }
      setCancelOpen(false);
      setCancelNote("");
      setCancelPhotos([]);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDealBusy(false);
    }
  };

  const submitDisputeRequest = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    const errCode = validateDisputeRequest({
      message: disputeMessage,
      photos: disputePhotos,
    });
    if (errCode === "message_required") {
      setActionError(t(lang, "deal.disputeMessageRequired"));
      return;
    }
    if (errCode === "photos_required") {
      setActionError(t(lang, "deal.disputePhotosRequired"));
      return;
    }
    if (errCode === "photos_too_many") {
      setActionError(t(lang, "deal.disputePhotosTooMany"));
      return;
    }
    setDealBusy(true);
    setActionError("");
    try {
      const fd = new FormData();
      fd.set("message", disputeMessage.trim());
      for (const photo of disputePhotos) fd.append("photos", photo);
      const res = await fetch(`/api/listings/${listing.id}/complete/dispute`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data?.data) {
        setListing(mapApiPost(data.data as ApiPetFeedPost));
      }
      setDisputeOpen(false);
      setDisputeMessage("");
      setDisputePhotos([]);
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDealBusy(false);
    }
  };

  const toggleFavorite = async () => {
    if (!isLoggedIn) {
      requireLogin();
      return;
    }
    const next = !saved;
    setSaved(next);
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
    const shareTitle = title || "Pet Marketplace";
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
      <div className="mb-5">
        <DisclaimerBanner lang={lang} />
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 lg:flex-[1.4]">
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
            {listing.escrowEnabled ? (
              <span className="absolute top-3 right-3 z-10">
                <EscrowBadge lang={lang} />
              </span>
            ) : null}
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
        <div className="flex-1 lg:sticky lg:top-24 lg:self-start">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900 mb-1 leading-snug">
                  {title}
                </h1>
                {price ? (
                  <p className="text-2xl font-bold text-[#D97706]">{price}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={busy === "favorite"}
                className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
                  saved
                    ? "border-rose-200 bg-rose-50 text-rose-600"
                    : "border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500"
                }`}
                aria-label={t(lang, "detail.save")}
              >
                {saved ? "♥" : "♡"}
              </button>
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
            {!isBlankDisplayValue(description) && (
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                {description}
              </p>
            )}
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
                  {listing.breeder.verified && <VerifiedBadge />}
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

              {listing.status === "deposit_hold" ? (
                <div className={depositHoldTone.shell}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className={depositHoldTone.title}>
                        {depositHoldSenLabel(
                          listing.deal?.senDisplayName,
                          t(lang, "deal.holdBadge"),
                          t(lang, "deal.holdBadgeWithSen"),
                        )}
                      </p>
                      {listing.deal?.status === "pending_sen_complete" ||
                      listing.deal?.status === "pending_complete" ? (
                        <p className="text-xs text-amber-800/90">
                          {waitingForSenMessage(
                            t(lang, "deal.completeWaitingBadge"),
                            handoffDaysLeft,
                          )}
                        </p>
                      ) : null}
                      {listing.deal?.status === "pending_cancel_confirm" ? (
                        <p className="text-xs text-amber-800/90">
                          {t(lang, "deal.cancelPendingBadge")}
                        </p>
                      ) : null}
                      {showDisputeOpen ? (
                        <p className="text-xs text-amber-800/90">
                          {t(lang, "deal.disputeOpenBadge")}
                        </p>
                      ) : null}
                    </div>
                    {(showBreederHandoff || showBreederCancel) ? (
                      <div className="relative shrink-0" data-deal-menu>
                        <button
                          type="button"
                          aria-label={t(lang, "deal.actionsMenu")}
                          aria-expanded={dealMenuOpen}
                          disabled={dealBusy}
                          onClick={() => setDealMenuOpen((open) => !open)}
                          className={depositHoldTone.menuBtn}
                        >
                          ⋮
                        </button>
                        {dealMenuOpen ? (
                          <div className={depositHoldTone.menuPanel}>
                            {showBreederHandoff ? (
                              <button
                                type="button"
                                disabled={dealBusy}
                                onClick={() => {
                                  setDealMenuOpen(false);
                                  setCompletePhotos([]);
                                  setCompleteOpen(true);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-amber-50 disabled:opacity-50"
                              >
                                {t(lang, "deal.complete")}
                              </button>
                            ) : null}
                            {showBreederCancel ? (
                              <button
                                type="button"
                                disabled={dealBusy}
                                onClick={() => {
                                  setDealMenuOpen(false);
                                  setCancelReasonKey("no_contact");
                                  setCancelNote("");
                                  setCancelPhotos([]);
                                  setCancelOpen(true);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                {t(lang, "deal.cancel")}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {isOwner &&
                  listing.deal?.status === "pending_cancel_confirm" ? (
                    <p className="mt-2 text-xs text-amber-800/90">
                      {t(lang, "deal.cancelPendingHint")}
                      {listing.deal.cancelReason
                        ? ` — ${listing.deal.cancelReason}`
                        : ""}
                    </p>
                  ) : null}
                  {showDisputeOpen ? (
                    <p className="mt-2 text-xs text-amber-800/90">
                      {t(lang, "deal.disputeOpenHint")}
                      {listing.deal?.disputeMessage
                        ? ` — ${listing.deal.disputeMessage}`
                        : ""}
                    </p>
                  ) : null}
                  {showSenConfirmHandoff ? (
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        disabled={dealBusy}
                        onClick={() => void runDealAction("complete")}
                        className="w-full py-2.5 bg-[#D97706] text-white text-sm font-semibold rounded-full disabled:opacity-60"
                      >
                        {t(lang, "deal.senConfirmReceipt")}
                      </button>
                      {showSenOpenDispute ? (
                        <button
                          type="button"
                          disabled={dealBusy}
                          onClick={() => {
                            setDisputeMessage("");
                            setDisputePhotos([]);
                            setDisputeOpen(true);
                          }}
                          className="w-full py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-full disabled:opacity-60"
                        >
                          {t(lang, "deal.senOpenDispute")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {showSenConfirmCancel ? (
                    <div className="mt-3 space-y-2">
                      {listing.deal?.cancelReason ? (
                        <p className="text-xs text-amber-900">
                          <span className="font-semibold">
                            {t(lang, "deal.cancelReasonPreview")}:{" "}
                          </span>
                          {listing.deal.cancelReason}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled={dealBusy}
                        onClick={() => void runDealAction("cancel_confirm")}
                        className="w-full py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-full disabled:opacity-60"
                      >
                        {t(lang, "deal.senConfirmCancel")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showDepositRequest ? (
                <button
                  type="button"
                  onClick={() => void openDepositModal()}
                  className="w-full py-3 bg-[#D97706] text-white text-sm font-semibold rounded-full hover:bg-[#B45309] transition-colors"
                >
                  🤝 {t(lang, "deal.requestDeposit")}
                </button>
              ) : null}

              {listing.status === "sold" ? (
                <p className={soldTone.shell}>{t(lang, "deal.completed")}</p>
              ) : null}

              {showMessage ? (
                <button
                  type="button"
                  onClick={messageSeller}
                  disabled={busy === "message"}
                  className="w-full py-3 bg-[#D97706] text-white text-sm font-semibold rounded-full hover:bg-[#B45309] transition-colors disabled:opacity-60"
                >
                  💬 {t(lang, "detail.message")}
                </button>
              ) : null}
              <div
                className={`grid gap-2 ${
                  showReport || showUpdateDetails ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {showUpdateDetails ? (
                  <Link
                    href={listingEditHref(listing.id)}
                    className="py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-full hover:border-slate-300 transition-colors text-center"
                  >
                    {t(lang, "detail.updateDetails")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => void shareListing()}
                  className={`py-2.5 border text-sm font-medium rounded-full transition-colors ${
                    shareNotice
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {shareNotice || t(lang, "detail.share")}
                </button>
                {showReport ? (
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
        <div className="space-y-4 mb-6">
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
                    {c.isBreeder && <VerifiedBadge size="xs" />}
                    <p className="text-[10px] text-slate-400">{c.time}</p>
                  </div>
                  <p className="text-sm text-slate-600">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
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

      {depositOpen && (
        <div
          className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
          onClick={() => {
            if (!dealBusy) setDepositOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-slate-900">
              {t(lang, "deal.confirmTitle")}
            </h2>
            <p className="text-sm text-slate-600">
              {listing.title} · {listing.breeder.name}
            </p>
            {actionError ? (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {actionError}
              </p>
            ) : null}
            {listing.warrantyPolicy ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-sm text-amber-950 space-y-1">
                <p className="font-semibold">{t(lang, "deal.policyPreview")}</p>
                <p>{listing.warrantyPolicy.title}</p>
                {listing.warrantyPolicy.careParvoCoverageDays ? (
                  <p className="text-xs">
                    {t(
                      lang,
                      warrantyInfectiousFieldKey(
                        resolveWarrantyFarmSpecies({
                          listingSpecies: listing.species,
                        }),
                      ) as EnKey,
                    )}
                    : {listing.warrantyPolicy.careParvoCoverageDays}{" "}
                    {lang === "VI" ? "ngày" : "days"}
                  </p>
                ) : null}
                {listing.warrantyPolicy.medicalFeeSupportPercent != null ? (
                  <p className="text-xs">
                    {t(lang, "warranty.field.medicalFee")}:{" "}
                    {listing.warrantyPolicy.medicalFeeSupportPercent}%
                  </p>
                ) : null}
                <button
                  type="button"
                  className="text-xs font-medium text-[#D97706] underline"
                  onClick={() => setPolicyOpen(true)}
                >
                  {t(lang, "warranty.viewCta")}
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
                <p className="font-semibold">{t(lang, "warranty.noneTitle")}</p>
                <p className="text-xs text-slate-500">
                  {t(lang, "warranty.noneHint")}
                </p>
              </div>
            )}
            {isOwner ? (
              <div className="relative">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {t(lang, "deal.senUserId")}
                </label>
                <input
                  value={
                    senPickerOpen
                      ? senSearch
                      : selectedSen
                        ? formatSenOptionLabel(selectedSen)
                        : senSearch
                  }
                  onChange={(e) => {
                    setSenSearch(e.target.value);
                    setSenUserIdInput("");
                    setSenPickerOpen(true);
                  }}
                  onFocus={() => setSenPickerOpen(true)}
                  placeholder={t(lang, "deal.senSearchPlaceholder")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  autoComplete="off"
                />
                {senPickerOpen ? (
                  <div className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {senOptionsLoading ? (
                      <p className="px-3 py-2 text-xs text-slate-400">…</p>
                    ) : filteredSenOptions.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">
                        {t(lang, "deal.senEmpty")}
                      </p>
                    ) : (
                      filteredSenOptions.map((user) => (
                        <button
                          key={user.user_id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-amber-50"
                          onClick={() => {
                            setSenUserIdInput(user.user_id);
                            setSenSearch(formatSenOptionLabel(user));
                            setSenPickerOpen(false);
                          }}
                        >
                          {formatSenOptionLabel(user)}
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 accent-[#D97706]"
                checked={depositAck}
                onChange={(e) => setDepositAck(e.target.checked)}
              />
              <span>{t(lang, "deal.ackLabel")}</span>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={dealBusy}
                onClick={() => setDepositOpen(false)}
                className="px-4 py-2 border border-slate-200 text-sm rounded-full min-w-[96px] disabled:opacity-60"
              >
                {t(lang, "common.cancel")}
              </button>
              <button
                type="button"
                disabled={
                  dealBusy ||
                  !depositAck ||
                  (isOwner && !senUserIdInput.trim())
                }
                onClick={() => void runDealAction("deposit")}
                className="px-4 py-2 bg-[#D97706] text-white text-sm font-semibold rounded-full min-w-[120px] disabled:opacity-60"
              >
                {dealBusy
                  ? t(lang, "deal.confirming")
                  : t(lang, "deal.confirmFreeze")}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {completeOpen ? (
        <div
          className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
          onClick={() => {
            if (!dealBusy) setCompleteOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-slate-900">
              {t(lang, "deal.completeRequestTitle")}
            </h2>
            <p className="text-sm text-slate-600">
              {listing.title} ·{" "}
              {listing.deal?.senDisplayName || listing.deal?.senEmail || "Sen"}
            </p>
            <p className="text-sm text-slate-600">
              {t(lang, "deal.completeRequestHint")}
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {t(lang, "deal.completePhotosLabel")} *
              </label>
              <DealPhotoPicker
                files={completePhotos}
                max={COMPLETE_HANDOFF_MAX_PHOTOS}
                disabled={dealBusy}
                invalid={Boolean(actionError) && completePhotos.length < 1}
                dropHint={dealPhotosDropHint(
                  t(lang, "deal.photosDrop"),
                  COMPLETE_HANDOFF_MAX_PHOTOS,
                )}
                browseLabel={t(lang, "deal.photosBrowse")}
                removeLabel={t(lang, "deal.photosRemove")}
                onChange={(next) => {
                  setCompletePhotos(next);
                  setActionError("");
                }}
              />
            </div>
            {actionError ? (
              <p className="text-sm text-red-600" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={dealBusy}
                onClick={() => setCompleteOpen(false)}
                className="px-4 py-2 border border-slate-200 text-sm rounded-full min-w-[96px] disabled:opacity-60"
              >
                {t(lang, "common.cancel")}
              </button>
              <button
                type="button"
                disabled={dealBusy || completePhotos.length < 1}
                onClick={() => void submitHandoffRequest()}
                className="px-4 py-2 bg-[#D97706] text-white text-sm font-semibold rounded-full min-w-[120px] disabled:opacity-60"
              >
                {dealBusy
                  ? t(lang, "deal.confirming")
                  : t(lang, "deal.completeConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {completeWaitingOpen ? (
        <div
          className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
          onClick={() => setCompleteWaitingOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-slate-900">
              {t(lang, "deal.completeWaitingTitle")}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {waitingForSenMessage(
                t(lang, "deal.completeWaitingBody"),
                handoffDaysLeft,
              )}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCompleteWaitingOpen(false)}
                className="px-4 py-2 bg-[#D97706] text-white text-sm font-semibold rounded-full"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelOpen ? (
        <div
          className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
          onClick={() => {
            if (!dealBusy) setCancelOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-slate-900">
              {t(lang, "deal.cancelRequestTitle")}
            </h2>
            <p className="text-sm text-slate-600">
              {t(lang, "deal.cancelRequestHint")}
            </p>
            <label className="block text-xs font-medium text-slate-500">
              {t(lang, "deal.cancelReasonLabel")}
              <select
                value={cancelReasonKey}
                disabled={dealBusy}
                onChange={(e) =>
                  setCancelReasonKey(e.target.value as CancelDepositReasonKey)
                }
                className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
              >
                {CANCEL_DEPOSIT_REASON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(lang, `deal.cancelReason.${key}` as EnKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-500">
              {t(lang, "deal.cancelNoteLabel")}
              <textarea
                value={cancelNote}
                disabled={dealBusy}
                onChange={(e) => setCancelNote(e.target.value)}
                rows={2}
                placeholder={t(lang, "deal.cancelNotePlaceholder")}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </label>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {t(lang, "deal.cancelPhotosLabel")}
              </label>
              <DealPhotoPicker
                files={cancelPhotos}
                max={CANCEL_DEPOSIT_MAX_PHOTOS}
                disabled={dealBusy}
                dropHint={dealPhotosDropHint(
                  t(lang, "deal.photosDrop"),
                  CANCEL_DEPOSIT_MAX_PHOTOS,
                )}
                browseLabel={t(lang, "deal.photosBrowse")}
                removeLabel={t(lang, "deal.photosRemove")}
                onChange={(next) => {
                  setCancelPhotos(next);
                  setActionError("");
                }}
              />
            </div>
            {actionError ? (
              <p className="text-sm text-red-600" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={dealBusy}
                onClick={() => setCancelOpen(false)}
                className="px-4 py-2 border border-slate-200 text-sm rounded-full min-w-[96px] disabled:opacity-60"
              >
                {t(lang, "common.cancel")}
              </button>
              <button
                type="button"
                disabled={dealBusy}
                onClick={() => void submitCancelRequest()}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-full min-w-[120px] disabled:opacity-60"
              >
                {dealBusy
                  ? t(lang, "deal.confirming")
                  : t(lang, "deal.cancelSubmit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {disputeOpen ? (
        <div
          className={`fixed inset-0 ${LISTING_ACTION_MODAL_Z_CLASS} flex items-center justify-center p-4`}
          onClick={() => {
            if (!dealBusy) setDisputeOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-slate-900">
              {t(lang, "deal.disputeTitle")}
            </h2>
            <p className="text-sm text-slate-600">
              {t(lang, "deal.disputeHint")}
            </p>
            <label className="block text-xs font-medium text-slate-500">
              {t(lang, "deal.disputeMessageLabel")} *
              <textarea
                value={disputeMessage}
                disabled={dealBusy}
                onChange={(e) => setDisputeMessage(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </label>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {t(lang, "deal.disputePhotosLabel")} *
              </label>
              <DealPhotoPicker
                files={disputePhotos}
                max={DEAL_DISPUTE_MAX_PHOTOS}
                disabled={dealBusy}
                invalid={Boolean(actionError) && disputePhotos.length < 1}
                dropHint={dealPhotosDropHint(
                  t(lang, "deal.photosDrop"),
                  DEAL_DISPUTE_MAX_PHOTOS,
                )}
                browseLabel={t(lang, "deal.photosBrowse")}
                removeLabel={t(lang, "deal.photosRemove")}
                onChange={(next) => {
                  setDisputePhotos(next);
                  setActionError("");
                }}
              />
            </div>
            {actionError ? (
              <p className="text-sm text-red-600" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={dealBusy}
                onClick={() => setDisputeOpen(false)}
                className="px-4 py-2 border border-slate-200 text-sm rounded-full min-w-[96px] disabled:opacity-60"
              >
                {t(lang, "common.cancel")}
              </button>
              <button
                type="button"
                disabled={
                  dealBusy ||
                  !disputeMessage.trim() ||
                  disputePhotos.length < 1
                }
                onClick={() => void submitDisputeRequest()}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-full min-w-[120px] disabled:opacity-60"
              >
                {dealBusy
                  ? t(lang, "deal.confirming")
                  : t(lang, "deal.disputeSubmit")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
