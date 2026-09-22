"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import {
  ADMIN_BREEDER_STATUS_FILTERS,
  ADMIN_LISTING_STATUS_FILTERS,
  ADMIN_NAV_ITEMS,
  ADMIN_REPORT_STATUS_FILTERS,
  ADMIN_USER_ROLE_FILTERS,
  ADMIN_USER_STATUS_FILTERS,
  adminConsoleHref,
  parseAdminConsoleSearch,
  summarizeAdminLoadErrors,
  type AdminBreederStatusFilter,
  type AdminListingStatusFilter,
  type AdminReportStatusFilter,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
  type HistoryActionFilter,
} from "@/lib/admin/consoleNav";
import { AdminSectionSkeleton } from "@/components/ui/Skeleton";
import { AdminHomeDashboard } from "@/components/admin/AdminHomeDashboard";
import { DialogActions } from "@/components/ui/DialogActions";
import type { ProductAnalyticsDashboard } from "@/lib/admin/homeAnalytics";
import {
  farmReviewStarLabel,
  farmReviewUpdateApproveBlocked,
  isFarmReviewPrimaryNotApprovedError,
} from "@/lib/breederFarmReviews";
import {
  HISTORY_ACTION_FILTERS,
  breederGroup,
  breederVerifyConfirmKey,
  historyActionI18nKey,
  isAppealQueueItem,
  isBreederVerificationQueueItem,
  isDetailSubmissionQueueItem,
  isFarmReviewQueueItem,
  isListingModerationQueueItem,
  isSupportTicketQueueItem,
  supportTicketRequestType,
  passesDateFilter,
  requestStatusGroup,
  requestTypeLabelKey,
  sortByDate,
  statusFilterForFocusedItem,
  type DateFilter,
  type RequestStatus,
} from "@/lib/admin/filters";
import {
  appealStatusLabelKey,
  farmReviewKindI18nKey,
  findRequestByFocusId,
  isSafeHttpUrl,
  requestQueueFocusId,
  supportFeedbackCategoryLabelKey,
  supportScamTargetLabelKey,
} from "@/lib/admin/requestQueue";
import {
  adminSpeciesLabelKey,
  breederPublicHref,
  isDealDisputeReport,
  isOpenDealDisputeOnHold,
  toggleExpandedReviewId,
  type AdminReviewBreeder,
  type AdminReviewPost,
  type AdminReviewReport,
} from "@/lib/admin/reviewDetail";
import { breederSubmissionTypeLabel } from "@/lib/breederProfileSubmissions";
import type { BreederProfileSubmission } from "@/lib/breederProfileSubmissions";
import type { TransparencyWarning } from "@/lib/transparencyWarnings";
import {
  buildListingStatusBody,
  listingPublicHref,
  listingRejectionReason,
  listingStatusLabelKey,
} from "@/lib/admin/listingReject";
import {
  listingHideFromReportAllowed,
  reportReasonLabelKey,
  reportStatusLabelKey,
  reportTargetHref,
} from "@/lib/admin/reportDisplay";
import {
  AdminAppealReviewDetail,
  AdminBreederDetailSubmissionReview,
  AdminBreederReviewDetail,
  AdminFarmReviewDetail,
  AdminListingReviewDetail,
  AdminReportReviewDetail,
  AdminReviewDetailsToggle,
  AdminSupportTicketReview,
} from "@/components/admin/AdminReviewDetailPanel";
import {
  ADMIN_USER_ROLES,
  accountMatchesUserFilters,
  accountRoleChangeBlockKey,
  accountRoleChangeConfirmKey,
  accountRoleLabelKey,
  accountRowId,
  accountStatusChangeConfirmKey,
  accountStatusLabelKey,
  canSubmitCreateAccount,
  isLastActiveAdmin,
  isSelfAdminAccount,
  normalizeAccountRole,
  normalizeAccountStatus,
} from "@/lib/admin/users";
import {
  historyChangeSummary,
  historyRejectionReason,
  historyTargetHref,
} from "@/lib/admin/history";

import {
  DEFAULT_APP_FEATURE_FLAGS,
  mergeAppFeatureFlags,
  type AppFeatureFlags,
} from "@/lib/featureFlags";
import {
  ADMIN_FEATURE_CORE_KEYS,
  ADMIN_PET_FEED_TAB_KEYS,
  featureFlagDescKey,
  featureFlagTitleKey,
  isLastEnabledPetFeedTab,
} from "@/lib/admin/features";
import {
  NEWS_MAX_PHOTOS,
  NEWS_PHOTO_ACCEPT,
  NEWS_TITLE_MAX,
  NEWS_BODY_MAX,
  announcementCategoryOf,
  announcementPublicHref,
  announcementRowId,
  announcementStatusLabelKey,
  isPublishedAnnouncement,
  newsPublishError,
  buildAdminNewsLivePreview,
  normalizeNewsCtaUrl,
  type AdminAnnouncementRow,
} from "@/lib/admin/news";
import { AdminNewsLivePreview } from "@/components/admin/AdminNewsLivePreview";
import {
  ANNOUNCEMENT_CATEGORIES,
  NEWS_HREF,
  type AnnouncementCategory,
} from "@/lib/siteNav";

type BreederRow = AdminReviewBreeder & {
  verification_status?: string;
};

type ReportRow = AdminReviewReport;

type AccountRow = {
  id?: string;
  user_id?: string;
  email?: string;
  display_name?: string;
  login_identifier?: string;
  primary_role?: string;
  account_status?: string;
  isForTesting?: boolean;
  created_at?: string;
};

type ActionLogRow = {
  id: string;
  created_at?: string;
  actor_user_id?: string | null;
  actor_via_secret?: boolean;
  actor_display_name?: string | null;
  action?: string;
  target_type?: string;
  target_id?: string | null;
  target_user_id?: string | null;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type PostRow = AdminReviewPost;

type SupportTicketRow = {
  id: string;
  user_id?: string;
  kind: "feedback" | "scam" | string;
  category?: string | null;
  title?: string | null;
  body?: string;
  scam_target_type?: string | null;
  identifier?: string | null;
  related_url?: string | null;
  anonymous?: boolean;
  evidence_confirmed?: boolean;
  evidence_urls?: string[];
  status?: string;
  created_at?: string;
};

type FarmReviewRow = {
  id: string;
  breeder_profile_id: string;
  reviewer_user_id: string;
  kind: "primary" | "supplement" | "sale";
  parent_review_id?: string | null;
  parent_status?: string | null;
  post_id?: string | null;
  rating: number;
  body?: string;
  photo_urls?: string[];
  status?: string;
  created_at?: string;
  reviewer_display_name?: string | null;
  breeder_profile?: { id?: string; display_name?: string | null } | null;
};

type RequestType = "all" | "breeder" | "post" | "report" | "detail" | "appeal" | "feedback" | "scam" | "farm_review";

type RequestItem = {
  id: string;
  type: "breeder" | "post" | "report" | "detail" | "appeal" | "feedback" | "scam" | "farm_review";
  status: string;
  createdAt: string;
  title: string;
  subtitle: string;
  body: string;
  post?: PostRow;
  profile?: BreederRow;
  report?: ReportRow;
  detail?: BreederProfileSubmission;
  appeal?: TransparencyWarning;
  ticket?: SupportTicketRow;
  farmReview?: FarmReviewRow;
};

const ROLES = ADMIN_USER_ROLES;

function StatusChip({ status, label }: { status: string; label?: string }) {
  const map: Record<string, string> = {
    waiting: "bg-amber-50 text-amber-800 border-amber-200",
    pending_review: "bg-amber-50 text-amber-800 border-amber-200",
    open: "bg-amber-50 text-amber-800 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
    reviewed: "bg-slate-100 text-slate-600 border-slate-200",
    dismissed: "bg-slate-100 text-slate-500 border-slate-200",
    archived: "bg-slate-100 text-slate-500 border-slate-200",
    suspended: "bg-red-50 text-red-700 border-red-200",
    unverified: "bg-slate-100 text-slate-500 border-slate-200",
    sen: "bg-slate-100 text-slate-600 border-slate-200",
    breeder: "bg-amber-50 text-amber-800 border-amber-200",
    admin: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[status] || map.waiting}`}
    >
      {label || status}
    </span>
  );
}

function healthEvidenceUrls(post: PostRow): string[] {
  const raw = post.metadata?.health_evidence_urls;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function speciesListLabel(lang: Lang, species: string[] | string | null | undefined) {
  const list = Array.isArray(species)
    ? species
    : String(species || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
  return list
    .map((slug) => {
      const key = adminSpeciesLabelKey(slug);
      return key ? t(lang, key as EnKey) : slug;
    })
    .filter(Boolean)
    .join(", ");
}

function farmReviewKindLabel(kind: string, lang: Lang) {
  return t(lang, farmReviewKindI18nKey(kind) as EnKey);
}

type RejectKind = "breeder" | "listing" | "detail" | "farm_review";

function rejectModalTitleKey(kind: RejectKind): EnKey {
  if (kind === "listing") return "admin.listings.rejectTitle";
  if (kind === "farm_review") return "admin.farmReviews.rejectTitle";
  if (kind === "detail") return "admin.details.rejectTitle";
  return "admin.breeders.rejectTitle";
}

function rejectModalHintKey(kind: RejectKind): EnKey {
  if (kind === "listing") return "admin.listings.rejectHint";
  if (kind === "farm_review") return "admin.farmReviews.rejectHint";
  if (kind === "detail") return "admin.details.rejectHint";
  return "admin.breeders.rejectHint";
}

function rejectModalSubmitKey(kind: RejectKind): EnKey {
  if (kind === "listing") return "admin.listings.reject";
  if (kind === "farm_review") return "admin.farmReviews.reject";
  if (kind === "detail") return "admin.details.reject";
  return "admin.breeders.reject";
}

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api/admin${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Admin request failed") as Error & { code?: string };
    if (typeof data.code === "string") err.code = data.code;
    throw err;
  }
  return data;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 min-w-[120px]">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8B7355]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-[#E8DFD0] bg-white pl-3 pr-10 py-2 text-sm text-[#2B1E19] outline-none focus:border-[#D97706]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  variant = "primary",
  disabled,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "danger" | "ghost" | "success";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-[#D97706] text-white hover:bg-[#B45309]",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "border border-[#E8DFD0] text-[#5C4A3A] hover:bg-[#FDF8F0]",
  }[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors disabled:opacity-50 ${styles}`}
    >
      {label}
    </button>
  );
}

function HealthEvidence({ lang, post }: { lang: Lang; post: PostRow }) {
  const urls = healthEvidenceUrls(post);
  if (urls.length === 0) return null;
  return (
    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase text-amber-800">
        {t(lang, "admin.listings.healthEvidence")}
      </p>
      <p className="mt-1 text-xs text-amber-900">
        {post.vaccine_status || t(lang, "admin.listings.healthEvidenceHint")}
      </p>
      <div className="mt-2 flex gap-2 overflow-x-auto">
        {urls.map((uri) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={uri}
            src={uri}
            alt=""
            className="h-16 w-16 rounded-[10px] object-cover bg-slate-200"
          />
        ))}
      </div>
    </div>
  );
}

export function AdminConsole({
  lang,
  sessionUserId = "",
}: {
  lang: Lang;
  sessionUserId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedSearch = parseAdminConsoleSearch(searchParams);
  const section = parsedSearch.section;
  const requestType: RequestType = parsedSearch.requestType ?? "all";
  const listingStatusFilter: AdminListingStatusFilter =
    parsedSearch.listingStatus ?? "all";
  const breederStatusFilter: AdminBreederStatusFilter =
    parsedSearch.breederStatus ?? "all";
  const reportStatusFilter: AdminReportStatusFilter =
    parsedSearch.reportStatus ?? "open";
  const userRoleFilter: AdminUserRoleFilter = parsedSearch.userRole ?? "all";
  const userStatusFilter: AdminUserStatusFilter =
    parsedSearch.userStatus ?? "all";
  const historyActionFilter: HistoryActionFilter =
    parsedSearch.historyAction ?? "all";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [breeders, setBreeders] = useState<BreederRow[]>([]);
  const [detailSubmissions, setDetailSubmissions] = useState<BreederProfileSubmission[]>([]);
  const [farmReviews, setFarmReviews] = useState<FarmReviewRow[]>([]);
  const [appeals, setAppeals] = useState<TransparencyWarning[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicketRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [flags, setFlags] = useState<AppFeatureFlags>(DEFAULT_APP_FEATURE_FLAGS);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [farmReviewApproveBlocked, setFarmReviewApproveBlocked] = useState(false);
  const [licenseVerifyById, setLicenseVerifyById] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [licenseTypeOverrideById, setLicenseTypeOverrideById] = useState<
    Record<string, "" | "household_business" | "enterprise">
  >({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [focusRequestId, setFocusRequestId] = useState<string | null>(
    parsedSearch.focus,
  );

  const [requestStatus, setRequestStatus] = useState<RequestStatus>("waiting");
  const [requestDate, setRequestDate] = useState<DateFilter>("newest");
  const [breederSpeciesFilter, setBreederSpeciesFilter] = useState("all");
  const [breederDateFilter, setBreederDateFilter] = useState<DateFilter>("newest");
  const [userSearch, setUserSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<(typeof ROLES)[number]>("sen");

  const [newsTitle, setNewsTitle] = useState("");
  const [rejectTarget, setRejectTarget] = useState<
    | { kind: "breeder"; userId: string }
    | { kind: "listing"; postId: string }
    | { kind: "detail"; submissionId: string }
    | { kind: "farm_review"; reviewId: string }
    | null
  >(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAction, setRejectAction] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectPenaltyPoints, setRejectPenaltyPoints] = useState("");
  const [rejectPenaltyKind, setRejectPenaltyKind] = useState<
    "" | "transparency" | "compliance" | "review"
  >("");
  const [rejectError, setRejectError] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsCategory, setNewsCategory] = useState<AnnouncementCategory>("general");
  const [newsCtaLabel, setNewsCtaLabel] = useState("");
  const [newsCtaUrl, setNewsCtaUrl] = useState("");
  const [newsPhotos, setNewsPhotos] = useState<File[]>([]);
  const [newsPhotoInputKey, setNewsPhotoInputKey] = useState(0);
  const [myNews, setMyNews] = useState<AdminAnnouncementRow[]>([]);
  const [myNewsLoading, setMyNewsLoading] = useState(false);
  const [newsPhotoUrls, setNewsPhotoUrls] = useState<string[]>([]);
  const newsPhotoInputRef = useRef<HTMLInputElement>(null);
  const [actionLogs, setActionLogs] = useState<ActionLogRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    const loadErrors: string[] = [];
    const loadPart = async (path: string, fallback: { data: unknown }) => {
      try {
        return await adminFetch(path);
      } catch (err) {
        loadErrors.push(err instanceof Error ? err.message : "error");
        return fallback;
      }
    };
    try {
      const [p, b, r, a, f, d, w, st, fr] = await Promise.all([
        loadPart("/posts?status=", { data: [] }),
        loadPart("/breeders", { data: [] }),
        loadPart("/reports?status=", { data: [] }),
        loadPart("/accounts", { data: [] }),
        loadPart("/feature-flags", { data: DEFAULT_APP_FEATURE_FLAGS }),
        loadPart("/breeder-submissions?status=", { data: [] }),
        loadPart("/transparency-warnings?status=", { data: [] }),
        loadPart("/support-tickets?status=", { data: [] }),
        loadPart("/farm-reviews?status=", { data: [] }),
      ]);
      setPosts(Array.isArray(p.data) ? p.data : []);
      setBreeders(Array.isArray(b.data) ? b.data : []);
      setReports(Array.isArray(r.data) ? r.data : []);
      setSupportTickets(Array.isArray(st.data) ? st.data : []);
      setDetailSubmissions(Array.isArray(d.data) ? d.data : []);
      setFarmReviews(Array.isArray(fr.data) ? fr.data : []);
      setAppeals(Array.isArray(w.data) ? w.data : []);
      setAccounts(Array.isArray(a.data) ? a.data : []);
      setFlags(mergeAppFeatureFlags(f.data));
      const loadKind = summarizeAdminLoadErrors(loadErrors);
      if (loadKind === "forbidden") setError(t(lang, "admin.forbidden"));
      else if (loadKind === "partial") setError(t(lang, "admin.loadPartialError"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (parsedSearch.section === "requests" && !parsedSearch.focus) {
      setRequestStatus("waiting");
    }
    setFocusRequestId(parsedSearch.focus);
  }, [parsedSearch.section, parsedSearch.requestType, parsedSearch.focus]);

  useEffect(() => {
    const el = document.getElementById("admin-console-main");
    el?.scrollTo({ top: 0 });
  }, [section]);

  const loadHistory = async (opts?: { append?: boolean; cursor?: string | null }) => {
    setHistoryLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "40");
      if (historyActionFilter !== "all") qs.set("action", historyActionFilter);
      if (opts?.cursor) qs.set("cursor", opts.cursor);
      const res = await adminFetch(`/action-logs?${qs.toString()}`);
      const rows = Array.isArray(res.data) ? (res.data as ActionLogRow[]) : [];
      setActionLogs((cur) => (opts?.append ? [...cur, ...rows] : rows));
      setHistoryCursor(
        typeof res.next_cursor === "string" ? res.next_cursor : null,
      );
    } catch (err) {
      if (!opts?.append) setActionLogs([]);
      setHistoryCursor(null);
      const message = err instanceof Error ? err.message : t(lang, "common.error");
      setError(
        /404|HTML instead of JSON/i.test(message)
          ? t(lang, "admin.history.apiUnavailable")
          : message,
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (section !== "history") return;
    setExpandedLogId(null);
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, historyActionFilter]);

  useEffect(() => {
    if (section !== "news") return;
    void loadMyNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    const urls = newsPhotos.map((file) => URL.createObjectURL(file));
    setNewsPhotoUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newsPhotos]);

  const pendingPosts = posts.filter((p) => p.status === "pending_review");
  const pendingBreeders = breeders.filter((b) => b.verification_status === "pending_review");
  const openReports = reports.filter((r) => r.status === "open");
  const openSupportTickets = supportTickets.filter((r) => r.status === "open");
  const pendingDetailSubmissions = detailSubmissions.filter((s) => s.status === "pending");
  const pendingFarmReviews = farmReviews.filter(
    (review) => review.status === "pending",
  );
  const pendingAppeals = appeals.filter((s) => isAppealQueueItem(s.status));
  const pendingRequestCount =
    pendingPosts.length +
    pendingBreeders.length +
    openReports.length +
    openSupportTickets.length +
    pendingDetailSubmissions.length +
    pendingFarmReviews.length +
    pendingAppeals.length;

  const fetchProductAnalyticsDashboard = useCallback(async (days: number) => {
    const res = await adminFetch(`/product-analytics-dashboard?days=${encodeURIComponent(String(days))}`);
    return (res?.data ?? null) as ProductAnalyticsDashboard | null;
  }, []);

  const requestItems = useMemo<RequestItem[]>(() => {
    const breederItems: RequestItem[] = breeders
      .filter((profile) => isBreederVerificationQueueItem(profile.verification_status))
      .map((profile) => ({
      id: `breeder-${profile.id}`,
      type: "breeder",
      status: profile.verification_status || "unverified",
      createdAt: profile.created_at || "",
      title: profile.display_name || "—",
      subtitle: [profile.location, speciesListLabel(lang, profile.primary_species)]
        .filter(Boolean)
        .join(" · "),
      body:
        profile.bio ||
        (profile.main_breeds || []).join(", ") ||
        "",
      profile,
    }));
    const postItems: RequestItem[] = posts
      .filter((post) => isListingModerationQueueItem(post.status))
      .map((post) => ({
      id: `post-${post.id}`,
      type: "post",
      status: post.status || "pending_review",
      createdAt: post.created_at || "",
      title: post.title || "—",
      subtitle: [
        speciesListLabel(lang, post.species),
        post.breed,
        post.location,
      ]
        .filter(Boolean)
        .join(" · "),
      body: post.description || post.vaccine_status || post.price_note || "",
      post,
    }));
    const reportItems: RequestItem[] = reports.map((report) => {
      let subtitle = t(lang, "admin.requests.type.report");
      if (report.target_type === "breeder_profile" || report.breeder_profile_id) {
        subtitle = `${t(lang, "admin.requests.type.breeder")}: ${
          report.breeder_profile?.display_name || report.breeder_profile_id || "—"
        }`;
      } else if (report.post_id) {
        const post = posts.find((item) => item.id === report.post_id);
        subtitle = `${t(lang, "admin.requests.type.post")}: ${post?.title || report.post_id}`;
      } else if (report.comment_id) {
        subtitle = t(lang, "admin.reports.commentTarget");
      }
      return {
        id: `report-${report.id}`,
        type: "report",
        status: report.status || "open",
        createdAt: report.created_at || "",
        title: (() => {
          const reasonKey = reportReasonLabelKey(report.reason);
          return reasonKey
            ? t(lang, reasonKey as EnKey)
            : report.reason || t(lang, "admin.requests.type.report");
        })(),
        subtitle,
        body: report.note || "",
        report,
      };
    });
    const detailItems: RequestItem[] = detailSubmissions
      .filter((submission) => isDetailSubmissionQueueItem(submission.status))
      .map((submission) => ({
      id: `detail-${submission.id}`,
      type: "detail",
      status: submission.status || "pending",
      createdAt: submission.created_at || "",
      title: breederSubmissionTypeLabel(submission.submission_type, lang),
      subtitle: submission.breeder_profile?.display_name || submission.user_id || "—",
      body: submission.payload?.url || submission.payload?.note || "",
      detail: submission,
    }));
    const appealItems: RequestItem[] = appeals
      .filter((warning) => isAppealQueueItem(warning.status))
      .map((warning) => ({
      id: `appeal-${warning.id}`,
      type: "appeal",
      status: warning.status || "appealed",
      createdAt: warning.created_at || warning.breeder_action_at || "",
      title: t(lang, "admin.requests.type.appeal"),
      subtitle: warning.breeder_profile?.display_name || warning.user_id || "—",
      body: `${t(lang, "admin.appeals.score")}: ${warning.score_at_trigger}/100 · ${t(lang, "admin.appeals.penalty")}: ${warning.penalty_points_at_trigger}`,
      appeal: warning,
    }));
    const ticketItems: RequestItem[] = supportTickets.flatMap((ticket) => {
      if (!isSupportTicketQueueItem(ticket.status)) return [];
      const type = supportTicketRequestType(ticket.kind);
      if (!type) return [];
      const isFeedback = type === "feedback";
      const categoryKey = supportFeedbackCategoryLabelKey(ticket.category);
      const targetKey = supportScamTargetLabelKey(ticket.scam_target_type);
      const title = isFeedback
        ? ticket.title || t(lang, "admin.requests.type.feedback")
        : ticket.identifier || t(lang, "admin.requests.type.scam");
      const subtitle = isFeedback
        ? `${t(lang, "admin.requests.type.feedback")}: ${
            categoryKey ? t(lang, categoryKey as EnKey) : ticket.category || "—"
          }`
        : `${t(lang, "admin.requests.type.scam")}: ${
            targetKey ? t(lang, targetKey as EnKey) : ticket.scam_target_type || "—"
          }`;
      return [
        {
          id: `ticket-${ticket.id}`,
          type,
          status: ticket.status || "open",
          createdAt: ticket.created_at || "",
          title,
          subtitle,
          body: ticket.body || "",
          ticket,
        },
      ];
    });
    const farmReviewItems: RequestItem[] = farmReviews
      .filter((review) => isFarmReviewQueueItem(review.status))
      .map((review) => ({
        id: `farm_review-${review.id}`,
        type: "farm_review",
        status: review.status || "pending",
        createdAt: review.created_at || "",
        title: `${farmReviewKindLabel(review.kind, lang)} · ${farmReviewStarLabel(review.rating)}`,
        subtitle:
          review.breeder_profile?.display_name || review.breeder_profile_id || "—",
        body: review.body || "",
        farmReview: review,
      }));
    return [
      ...breederItems,
      ...postItems,
      ...reportItems,
      ...detailItems,
      ...farmReviewItems,
      ...appealItems,
      ...ticketItems,
    ];
  }, [breeders, posts, reports, detailSubmissions, farmReviews, appeals, supportTickets, lang]);

  const filteredRequests = useMemo(() => {
    return sortByDate(
      requestItems
        .filter((item) => requestType === "all" || item.type === requestType)
        .filter(
          (item) =>
            requestStatus === "all" || requestStatusGroup(item) === requestStatus,
        )
        .filter((item) => passesDateFilter(item.createdAt, requestDate)),
      requestDate,
    );
  }, [requestItems, requestType, requestStatus, requestDate]);

  useEffect(() => {
    if (!focusRequestId || loading || section !== "requests") return;
    const matched = findRequestByFocusId(requestItems, focusRequestId);
    if (!matched) return;
    const nextStatus = statusFilterForFocusedItem(matched, requestStatus);
    if (nextStatus !== requestStatus) {
      setRequestStatus(nextStatus);
      return;
    }
    setExpandedReviewId(matched.id);
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`admin-request-${focusRequestId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusRequestId, loading, section, requestType, requestStatus, requestItems]);

  const breederSpeciesOptions = useMemo(() => {
    const species = Array.from(
      new Set(
        breeders
          .flatMap((profile) => profile.primary_species || [])
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      ),
    ).sort();
    return species;
  }, [breeders]);

  const filteredBreeders = useMemo(() => {
    return sortByDate(
      breeders
        .filter(
          (profile) =>
            breederStatusFilter === "all" ||
            breederGroup(profile) === breederStatusFilter,
        )
        .filter(
          (profile) =>
            breederSpeciesFilter === "all" ||
            (profile.primary_species || [])
              .map((item) => item.trim().toLowerCase())
              .includes(breederSpeciesFilter),
        )
        .filter((profile) => passesDateFilter(profile.created_at, breederDateFilter))
        .map((profile) => ({ ...profile, createdAt: profile.created_at })),
      breederDateFilter,
    );
  }, [breeders, breederStatusFilter, breederSpeciesFilter, breederDateFilter]);

  const filteredListings = useMemo(() => {
    const list =
      listingStatusFilter === "all"
        ? posts
        : posts.filter((p) => p.status === listingStatusFilter);
    return [...list].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || ""),
    );
  }, [posts, listingStatusFilter]);

  const filteredReports = useMemo(() => {
    const list =
      reportStatusFilter === "all"
        ? reports
        : reports.filter((r) => r.status === reportStatusFilter);
    return [...list].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || ""),
    );
  }, [reports, reportStatusFilter]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) =>
      accountMatchesUserFilters(account, {
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
      }),
    );
  }, [accounts, userSearch, userRoleFilter, userStatusFilter]);

  async function runAction(key: string, action: () => Promise<void>, successKey: EnKey) {
    if (busyKey) return;
    setBusyKey(key);
    setError("");
    try {
      await action();
      showToast(t(lang, successKey));
      await load();
    } catch (err) {
      if (isFarmReviewPrimaryNotApprovedError(err)) {
        setFarmReviewApproveBlocked(true);
        return;
      }
      setError(err instanceof Error ? err.message : t(lang, "common.error"));
    } finally {
      setBusyKey(null);
    }
  }

  const updatePost = (
    postId: string,
    status: string,
    extras?: {
      rejectionReason?: string;
      adminAction?: string;
      adminNote?: string;
    },
  ) =>
    runAction(
      `post-${postId}-${status}`,
      () =>
        adminFetch(`/posts/${postId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildListingStatusBody(status, extras)),
        }),
      "admin.toast.updated",
    );

  const updateReport = (reportId: string, status: string) => {
    if (busyKey) return;
    const key = `report-${reportId}-${status}`;
    setBusyKey(key);
    setError("");
    void (async () => {
      try {
        const res = await adminFetch(`/reports/${reportId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const penalty = res?.compliance_penalty as
          | {
              applied?: boolean;
              points?: number;
              score_before?: number;
              score_after?: number;
              band?: string;
              tier?: number;
              actions?: string[];
            }
          | null
          | undefined;
        if (status === "reviewed" && penalty?.applied) {
          const points = Number(penalty.points) || 0;
          const scoreAfter =
            typeof penalty.score_after === "number" ? penalty.score_after : "—";
          const band = String(penalty.band || "").trim() || "—";
          const actions = Array.isArray(penalty.actions)
            ? penalty.actions.filter(Boolean).join(", ")
            : "";
          const base =
            lang === "VI"
              ? `Đã xác nhận vi phạm: −${points}đ tuân thủ → còn ${scoreAfter}/100 (${band}).`
              : `Violation confirmed: −${points} compliance → ${scoreAfter}/100 (${band}).`;
          showToast(actions ? `${base} ${actions}` : base);
        } else if (status === "reviewed") {
          showToast(
            lang === "VI"
              ? "Đã xác nhận báo cáo (không trừ điểm thêm)."
              : "Report confirmed (no additional compliance deduction).",
          );
        } else {
          showToast(t(lang, "admin.toast.updated"));
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : t(lang, "common.error"));
      } finally {
        setBusyKey(null);
      }
    })();
  };

  const updateSupportTicket = (ticketId: string, status: string) =>
    runAction(
      `ticket-${ticketId}-${status}`,
      () =>
        adminFetch(`/support-tickets/${ticketId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      "admin.toast.updated",
    );

  const updateBreeder = (
    userId: string,
    verificationStatus: string,
    extras?: {
      rejectionReason?: string;
      adminAction?: string;
      adminNote?: string;
      penaltyPoints?: number;
      penaltyKind?: "transparency" | "compliance" | "review";
    },
  ) =>
    runAction(
      `breeder-${userId}-${verificationStatus}`,
      () =>
        adminFetch(`/breeders/${userId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationStatus,
            ...(extras?.rejectionReason
              ? { rejectionReason: extras.rejectionReason }
              : {}),
            ...(extras?.adminAction ? { adminAction: extras.adminAction } : {}),
            ...(extras?.adminNote ? { adminNote: extras.adminNote } : {}),
            ...(extras?.penaltyPoints && extras?.penaltyKind
              ? {
                  penaltyPoints: extras.penaltyPoints,
                  penaltyKind: extras.penaltyKind,
                }
              : {}),
          }),
        }),
      "admin.toast.updated",
    );

  const updateDetailSubmission = (
    submissionId: string,
    status: "approved" | "rejected",
    extras?: {
      rejectionReason?: string;
      adminNote?: string;
      penaltyPoints?: number;
      penaltyKind?: "transparency" | "compliance" | "review";
      verifyChecks?: Record<string, boolean>;
      legalEntityTag?: string;
    },
  ) =>
    runAction(
      `detail-${submissionId}-${status}`,
      () =>
        adminFetch(`/breeder-submissions/${submissionId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            ...(extras?.rejectionReason
              ? { rejectionReason: extras.rejectionReason }
              : {}),
            ...(extras?.adminNote ? { adminNote: extras.adminNote } : {}),
            ...(extras?.penaltyPoints && extras?.penaltyKind
              ? {
                  penaltyPoints: extras.penaltyPoints,
                  penaltyKind: extras.penaltyKind,
                }
              : {}),
            ...(extras?.verifyChecks ? { verifyChecks: extras.verifyChecks } : {}),
            ...(extras?.legalEntityTag
              ? { legalEntityTag: extras.legalEntityTag }
              : {}),
          }),
        }),
      "admin.toast.updated",
    );

  const updateFarmReview = (
    reviewId: string,
    status: "approved" | "rejected",
    extras?: { rejectionReason?: string; adminNote?: string },
  ) =>
    runAction(
      `farm_review-${reviewId}-${status}`,
      () =>
        adminFetch(`/farm-reviews/${reviewId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            ...(extras?.rejectionReason
              ? { rejectionReason: extras.rejectionReason }
              : {}),
            ...(extras?.adminNote ? { adminNote: extras.adminNote } : {}),
          }),
        }),
      "admin.toast.updated",
    );

  const resolveAppeal = (
    warningId: string,
    resolution: "uphold" | "restore",
  ) =>
    runAction(
      `appeal-${warningId}-${resolution}`,
      () =>
        adminFetch(`/transparency-warnings/${warningId}/resolve`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution }),
        }),
      "admin.toast.updated",
    );

  const openRejectModal = (
    target:
      | { kind: "breeder"; userId: string }
      | { kind: "listing"; postId: string }
      | { kind: "detail"; submissionId: string }
      | { kind: "farm_review"; reviewId: string },
  ) => {
    setRejectTarget(target);
    setRejectReason("");
    setRejectAction("");
    setRejectNote("");
    setRejectPenaltyPoints("");
    setRejectPenaltyKind("");
    setRejectError("");
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError(
        t(
          lang,
          rejectTarget.kind === "listing"
            ? "admin.listings.rejectReasonRequired"
            : "admin.breeders.rejectReasonRequired",
        ),
      );
      return;
    }
    const extras: {
      rejectionReason: string;
      adminAction?: string;
      adminNote?: string;
      penaltyPoints?: number;
      penaltyKind?: "transparency" | "compliance" | "review";
    } = {
      rejectionReason: reason,
      adminAction: rejectAction.trim() || undefined,
      adminNote: rejectNote.trim() || undefined,
    };
    if (rejectTarget.kind === "breeder" || rejectTarget.kind === "detail") {
      const pointsText = rejectPenaltyPoints.trim();
      const kind = rejectPenaltyKind;
      const hasPoints = pointsText.length > 0;
      const hasKind = kind === "transparency" || kind === "compliance" || kind === "review";
      if (hasPoints !== hasKind) {
        setRejectError(t(lang, "admin.breeders.rejectPenaltyRequired"));
        return;
      }
      if (hasPoints && hasKind) {
        const pts = Number(pointsText);
        if (!Number.isFinite(pts) || pts !== Math.round(pts) || pts < 1 || pts > 100) {
          setRejectError(t(lang, "admin.breeders.rejectPenaltyInvalid"));
          return;
        }
        extras.penaltyPoints = pts;
        extras.penaltyKind = kind;
      }
    }
    const target = rejectTarget;
    setRejectTarget(null);
    if (target.kind === "listing") {
      await updatePost(target.postId, "archived", extras);
      return;
    }
    if (target.kind === "detail") {
      await updateDetailSubmission(target.submissionId, "rejected", extras);
      return;
    }
    if (target.kind === "farm_review") {
      await updateFarmReview(target.reviewId, "rejected", extras);
      return;
    }
    await updateBreeder(target.userId, "rejected", extras);
  };

  const updateAccountRole = (userId: string, primaryRole: string) =>
    runAction(
      `account-${userId}-${primaryRole}`,
      async () => {
        await adminFetch(`/accounts/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ primaryRole }),
        });
        if (userRoleFilter !== "all" && userRoleFilter !== primaryRole) {
          router.replace(
            adminConsoleHref({
              section: "users",
              userRole: null,
              userStatus: userStatusFilter === "all" ? null : userStatusFilter,
            }),
          );
        }
      },
      "admin.toast.updated",
    );

  const updateAccountStatus = (userId: string, accountStatus: "active" | "suspended") =>
    runAction(
      `account-${userId}-${accountStatus}`,
      () =>
        adminFetch(`/accounts/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountStatus }),
        }),
      "admin.toast.updated",
    );

  const createAccount = () => {
    if (!canSubmitCreateAccount({
      email: newEmail,
      password: newPassword,
      displayName: newDisplayName,
    })) {
      return;
    }
    if (
      newRole === "admin" &&
      !window.confirm(t(lang, "admin.users.confirmCreateAdmin"))
    ) {
      return;
    }
    void runAction(
      "create-account",
      async () => {
        await adminFetch("/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: newEmail.trim(),
            password: newPassword,
            displayName: newDisplayName.trim(),
            primaryRole: newRole,
          }),
        });
        setNewEmail("");
        setNewDisplayName("");
        setNewPassword("");
        setNewRole("sen");
      },
      "admin.toast.created",
    );
  };

  const toggleFlag = (key: keyof AppFeatureFlags, enabled: boolean) => {
    if (!enabled && isLastEnabledPetFeedTab(flags, key)) {
      window.alert(t(lang, "admin.features.lastTab"));
      return;
    }
    if (
      flags[key] &&
      !enabled &&
      !window.confirm(t(lang, "admin.features.confirmDisable"))
    ) {
      return;
    }
    void runAction(
      `flag-${key}`,
      async () => {
        const res = await adminFetch("/feature-flags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: enabled }),
        });
        setFlags(mergeAppFeatureFlags(res.data, { [key]: enabled }));
      },
      "admin.toast.updated",
    );
  };

  const loadMyNews = async () => {
    setMyNewsLoading(true);
    try {
      const res = await adminFetch("/my-announcements");
      setMyNews(Array.isArray(res.data) ? (res.data as AdminAnnouncementRow[]) : []);
    } catch {
      setMyNews([]);
    } finally {
      setMyNewsLoading(false);
    }
  };

  const publishNews = () => {
    const ctaUrl = normalizeNewsCtaUrl(newsCtaUrl);
    const publishError = newsPublishError({
      title: newsTitle,
      body: newsBody,
      ctaLabel: newsCtaLabel,
      ctaUrl,
      photos: newsPhotos,
    });
    if (publishError) {
      setError(t(lang, publishError));
      return;
    }
    if (!window.confirm(t(lang, "admin.news.confirmPublish"))) return;
    void runAction(
      "publish-news",
      async () => {
        const formData = new FormData();
        formData.append(
          "payload",
          JSON.stringify({
            title: newsTitle.trim(),
            description: newsBody.trim(),
            category: newsCategory,
            ctaLabel: newsCtaLabel.trim() || undefined,
            ctaUrl: ctaUrl || undefined,
          }),
        );
        newsPhotos.slice(0, NEWS_MAX_PHOTOS).forEach((file, i) => {
          formData.append("photos", file, file.name || `photo-${i}.jpg`);
        });
        await adminFetch("/announcements", { method: "POST", body: formData });
        setNewsTitle("");
        setNewsBody("");
        setNewsCategory("general");
        setNewsCtaLabel("");
        setNewsCtaUrl("");
        setNewsPhotos([]);
        setNewsPhotoInputKey((key) => key + 1);
        await loadMyNews();
      },
      "admin.toast.published",
    );
  };

  const setAnnouncementStatus = (postId: string, status: "archived" | "published") => {
    if (
      status === "archived" &&
      !window.confirm(t(lang, "admin.news.confirmArchive"))
    ) {
      return;
    }
    void runAction(
      `news-${postId}-${status}`,
      async () => {
        await adminFetch(`/announcements/${encodeURIComponent(postId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        await loadMyNews();
      },
      "admin.toast.updated",
    );
  };

  const verificationLabel = (status?: string) => {
    const key = `admin.verification.${status || "unverified"}` as EnKey;
    return t(lang, key);
  };

  const reportReasonLabel = (reason?: string) => {
    const key = reportReasonLabelKey(reason);
    if (key) return t(lang, key as EnKey);
    const raw = String(reason || "").trim();
    return raw || t(lang, "admin.requests.type.report");
  };

  const reportStatusLabel = (status?: string) =>
    t(lang, reportStatusLabelKey(status) as EnKey);

  const renderRequestActions = (item: RequestItem) => {
    if (item.type === "post" && item.post?.status === "pending_review") {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <ActionButton
            label={t(lang, "admin.listings.approve")}
            variant="success"
            disabled={busyKey !== null}
            onClick={() => void updatePost(item.post!.id, "published")}
          />
          <ActionButton
            label={t(lang, "admin.listings.reject")}
            variant="ghost"
            disabled={busyKey !== null}
            onClick={() => openRejectModal({ kind: "listing", postId: item.post!.id })}
          />
        </div>
      );
    }
    if (item.type === "breeder" && item.profile?.verification_status === "pending_review" && item.profile.user_id) {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <ActionButton
            label={t(lang, "admin.breeders.verify")}
            variant="success"
            disabled={busyKey !== null}
            onClick={() => void updateBreeder(item.profile!.user_id!, "verified")}
          />
          <ActionButton
            label={t(lang, "admin.breeders.reject")}
            variant="ghost"
            disabled={busyKey !== null}
            onClick={() => openRejectModal({ kind: "breeder", userId: item.profile!.user_id! })}
          />
        </div>
      );
    }
    if (item.type === "detail" && item.detail?.status === "pending" && item.detail.id) {
      const isLicense = item.detail.submission_type === "business_license";
      const checks = licenseVerifyById[item.detail.id] || {
        mstPortalMatch: false,
        documentReadable: false,
        addressMatch: false,
        subjectMatch: false,
      };
      const checksReady =
        !isLicense ||
        (checks.mstPortalMatch &&
          checks.documentReadable &&
          checks.addressMatch &&
          checks.subjectMatch);
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <ActionButton
            label={t(lang, "admin.details.approve")}
            variant="success"
            disabled={busyKey !== null || !checksReady}
            onClick={() => {
              if (!checksReady) {
                setError(t(lang, "admin.details.verifyRequired"));
                return;
              }
              void updateDetailSubmission(item.detail!.id, "approved", {
                ...(isLicense
                  ? {
                      verifyChecks: checks,
                      ...(licenseTypeOverrideById[item.detail!.id]
                        ? {
                            legalEntityTag:
                              licenseTypeOverrideById[item.detail!.id],
                          }
                        : {}),
                    }
                  : {}),
              });
            }}
          />
          <ActionButton
            label={t(lang, "admin.details.reject")}
            variant="ghost"
            disabled={busyKey !== null}
            onClick={() => openRejectModal({ kind: "detail", submissionId: item.detail!.id })}
          />
        </div>
      );
    }
    if (
      item.type === "farm_review"
      && item.farmReview?.status === "pending"
      && item.farmReview.id
    ) {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <ActionButton
            label={t(lang, "admin.farmReviews.approve")}
            variant="success"
            disabled={busyKey !== null}
            onClick={() => {
              if (farmReviewUpdateApproveBlocked(item.farmReview!)) {
                setFarmReviewApproveBlocked(true);
                return;
              }
              void updateFarmReview(item.farmReview!.id, "approved");
            }}
          />
          <ActionButton
            label={t(lang, "admin.farmReviews.reject")}
            variant="ghost"
            disabled={busyKey !== null}
            onClick={() => openRejectModal({ kind: "farm_review", reviewId: item.farmReview!.id })}
          />
        </div>
      );
    }
    if (
      item.type === "appeal"
      && item.appeal?.id
      && isAppealQueueItem(item.appeal.status)
    ) {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <ActionButton
            label={t(lang, "admin.appeals.restore")}
            variant="success"
            disabled={busyKey !== null}
            onClick={() => {
              if (!window.confirm(t(lang, "admin.appeals.confirmRestore"))) return;
              void resolveAppeal(item.appeal!.id, "restore");
            }}
          />
          <ActionButton
            label={t(lang, "admin.appeals.uphold")}
            variant="danger"
            disabled={busyKey !== null}
            onClick={() => {
              if (!window.confirm(t(lang, "admin.appeals.confirmUphold"))) return;
              void resolveAppeal(item.appeal!.id, "uphold");
            }}
          />
        </div>
      );
    }
    if (item.type === "report" && item.report?.status === "open") {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <ActionButton
            label={t(lang, "admin.reports.markReviewed")}
            variant="danger"
            disabled={busyKey !== null}
            onClick={() => {
              if (!window.confirm(t(lang, "admin.reports.confirmViolation"))) return;
              void updateReport(item.report!.id, "reviewed");
            }}
          />
          <ActionButton
            label={t(lang, "admin.reports.dismiss")}
            variant="ghost"
            disabled={busyKey !== null}
            onClick={() => {
              if (!window.confirm(t(lang, "admin.reports.confirmDismiss"))) return;
              void updateReport(item.report!.id, "dismissed");
            }}
          />
        </div>
      );
    }
    if (
      (item.type === "feedback" || item.type === "scam") &&
      item.ticket?.status === "open"
    ) {
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <ActionButton
            label={t(lang, "admin.support.dismiss")}
            variant="ghost"
            disabled={busyKey !== null}
            onClick={() => {
              if (!window.confirm(t(lang, "admin.support.confirmDismiss"))) return;
              void updateSupportTicket(item.ticket!.id, "dismissed");
            }}
          />
          <ActionButton
            label={t(lang, "admin.support.markReviewed")}
            variant="success"
            disabled={busyKey !== null}
            onClick={() => {
              if (!window.confirm(t(lang, "admin.support.confirmReviewed"))) return;
              void updateSupportTicket(item.ticket!.id, "reviewed");
            }}
          />
        </div>
      );
    }
    return null;
  };

  const renderSection = () => {
    if (loading) {
      return <AdminSectionSkeleton />;
    }

    switch (section) {
      case "home":
        return (
          <AdminHomeDashboard
            lang={lang}
            accounts={accounts}
            posts={posts}
            breeders={breeders}
            ops={{
              pendingListings: pendingPosts.length,
              openReports: openReports.length,
              pendingBreeders: pendingBreeders.length,
              pendingRequests: pendingRequestCount,
            }}
            onRefresh={() => void load()}
            fetchDashboard={fetchProductAnalyticsDashboard}
          />
        );

      case "requests":
        return (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-bold text-[#2B1E19]">
                {t(lang, "admin.requests.title")}
                <span className="ml-2 text-sm font-medium text-[#8B7355]">
                  {filteredRequests.length}
                </span>
              </h1>
              <ActionButton
                label={t(lang, "admin.refresh")}
                variant="ghost"
                onClick={() => void load()}
              />
            </div>
            <div className="mb-4 rounded-2xl border border-[#E8DFD0] bg-white p-4">
              <p className="text-sm font-bold text-[#2B1E19] mb-3">
                {t(lang, "admin.filters")}
              </p>
              <div className="flex flex-wrap gap-3">
                <FilterSelect
                  label={t(lang, "admin.filter.type")}
                  value={requestType}
                  onChange={(v) => {
                    const next = v as RequestType;
                    router.replace(
                      adminConsoleHref({
                        section: "requests",
                        type: next === "all" ? null : next,
                      }),
                    );
                  }}
                  options={[
                    { value: "all", label: t(lang, "admin.filter.all") },
                    { value: "breeder", label: t(lang, "admin.requests.type.breeder") },
                    { value: "detail", label: t(lang, "admin.requests.type.detail") },
                    { value: "farm_review", label: t(lang, "admin.requests.type.farmReview") },
                    { value: "appeal", label: t(lang, "admin.requests.type.appeal") },
                    { value: "post", label: t(lang, "admin.requests.type.post") },
                    { value: "report", label: t(lang, "admin.requests.type.report") },
                    { value: "feedback", label: t(lang, "admin.requests.type.feedback") },
                    { value: "scam", label: t(lang, "admin.requests.type.scam") },
                  ]}
                />
                <FilterSelect
                  label={t(lang, "admin.filter.status")}
                  value={requestStatus}
                  onChange={(v) => setRequestStatus(v as RequestStatus)}
                  options={[
                    { value: "all", label: t(lang, "admin.filter.all") },
                    { value: "waiting", label: t(lang, "admin.requests.status.waiting") },
                    { value: "approved", label: t(lang, "admin.requests.status.approved") },
                    { value: "rejected", label: t(lang, "admin.requests.status.rejected") },
                    { value: "resolved", label: t(lang, "admin.requests.status.resolved") },
                  ]}
                />
                <FilterSelect
                  label={t(lang, "admin.filter.date")}
                  value={requestDate}
                  onChange={(v) => setRequestDate(v as DateFilter)}
                  options={[
                    { value: "newest", label: t(lang, "admin.date.newest") },
                    { value: "oldest", label: t(lang, "admin.date.oldest") },
                    { value: "today", label: t(lang, "admin.date.today") },
                    { value: "week", label: t(lang, "admin.date.week") },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-3">
              {filteredRequests.map((item) => {
                const rawId = requestQueueFocusId(item);
                const focused = Boolean(focusRequestId && rawId === focusRequestId);
                const detailsOpen = expandedReviewId === item.id;
                const linkedPost =
                  item.type === "report" && item.report?.post_id
                    ? posts.find((p) => p.id === item.report?.post_id)
                    : undefined;
                const linkedProfile =
                  item.type === "report" && item.report?.breeder_profile_id
                    ? breeders.find((b) => b.id === item.report?.breeder_profile_id)
                    : undefined;
                const reporterAccount =
                  item.ticket && !item.ticket.anonymous
                    ? accounts.find((a) => a.user_id === item.ticket?.user_id)
                    : undefined;
                return (
                <div
                  key={item.id}
                  id={rawId ? `admin-request-${rawId}` : undefined}
                  className={`bg-white rounded-2xl border p-5 transition-shadow ${
                    focused
                      ? "border-[#D97706] ring-2 ring-[#D97706]/25 shadow-sm"
                      : "border-[#E8DFD0]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <StatusChip
                      status={requestStatusGroup(item)}
                      label={t(lang, requestTypeLabelKey(item.type) as EnKey)}
                    />
                    <StatusChip
                      status={item.status}
                      label={
                        item.type === "breeder"
                          ? verificationLabel(item.status)
                          : item.type === "report" ||
                              item.type === "feedback" ||
                              item.type === "scam"
                            ? reportStatusLabel(item.status)
                            : item.type === "appeal"
                              ? t(lang, appealStatusLabelKey(item.status) as EnKey)
                            : t(
                                lang,
                                `admin.requests.status.${requestStatusGroup(item)}` as EnKey,
                              )
                      }
                    />
                    <span className="text-xs text-[#B8A990]">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-[#2B1E19]">{item.title}</p>
                  {(() => {
                    const farmId =
                      item.type === "detail"
                        ? item.detail?.breeder_profile?.id ||
                          item.detail?.breeder_profile_id
                        : item.type === "farm_review"
                          ? item.farmReview?.breeder_profile?.id ||
                            item.farmReview?.breeder_profile_id
                          : item.type === "appeal"
                            ? item.appeal?.breeder_profile?.id ||
                              item.appeal?.breeder_profile_id
                            : null;
                    return farmId ? (
                      <Link
                        href={breederPublicHref(farmId)}
                        className="block text-xs font-semibold text-[#B45309] mt-0.5 hover:underline"
                      >
                        {item.subtitle}
                      </Link>
                    ) : (
                      <p className="text-xs text-[#8B7355] mt-0.5">{item.subtitle}</p>
                    );
                  })()}
                  {item.body && !detailsOpen ? (
                    <p className="text-sm text-[#5C4A3A] mt-2 line-clamp-3">{item.body}</p>
                  ) : null}
                  {item.post && !detailsOpen ? <HealthEvidence lang={lang} post={item.post} /> : null}
                  {item.post?.media_urls?.[0] && !detailsOpen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.post.media_urls[0]}
                      alt=""
                      className="mt-3 h-28 w-full max-w-xs rounded-xl object-cover bg-[#F3EDE3]"
                    />
                  ) : null}
                  {item.farmReview && !detailsOpen && farmReviewUpdateApproveBlocked(item.farmReview) ? (
                    <p className="mt-2 text-xs font-semibold text-amber-800">
                      {t(lang, "admin.farmReviews.approveUpdateBlockedBody")}
                    </p>
                  ) : null}
                  {(() => {
                    const farmPhoto = (item.farmReview?.photo_urls || []).find(isSafeHttpUrl);
                    const ticketPhoto = (item.ticket?.evidence_urls || []).find(isSafeHttpUrl);
                    const compactPhoto = farmPhoto || ticketPhoto;
                    return compactPhoto && !detailsOpen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={compactPhoto}
                        alt=""
                        className="mt-3 h-28 w-full max-w-xs rounded-xl object-cover bg-[#F3EDE3]"
                      />
                    ) : null;
                  })()}
                  <AdminReviewDetailsToggle
                    lang={lang}
                    open={detailsOpen}
                    onToggle={() =>
                      setExpandedReviewId((cur) => toggleExpandedReviewId(cur, item.id))
                    }
                  />
                  {detailsOpen && item.post ? (
                    <AdminListingReviewDetail lang={lang} post={item.post} />
                  ) : null}
                  {detailsOpen && item.profile ? (
                    <AdminBreederReviewDetail lang={lang} profile={item.profile} />
                  ) : null}
                  {detailsOpen && item.report ? (
                    <AdminReportReviewDetail
                      lang={lang}
                      report={item.report}
                      linkedPost={linkedPost}
                      linkedProfile={linkedProfile}
                    />
                  ) : null}
                  {detailsOpen && item.detail ? (
                    <AdminBreederDetailSubmissionReview
                      lang={lang}
                      submission={item.detail}
                      showApproveChecklist={
                        item.detail.status === "pending" &&
                        item.detail.submission_type === "business_license"
                      }
                      verifyChecks={
                        licenseVerifyById[item.detail.id] || {
                          mstPortalMatch: false,
                          documentReadable: false,
                          addressMatch: false,
                          subjectMatch: false,
                        }
                      }
                      onVerifyChecksChange={(next) =>
                        setLicenseVerifyById((prev) => ({
                          ...prev,
                          [item.detail!.id]: next,
                        }))
                      }
                      legalEntityOverride={
                        licenseTypeOverrideById[item.detail.id] || ""
                      }
                      onLegalEntityOverrideChange={(next) =>
                        setLicenseTypeOverrideById((prev) => ({
                          ...prev,
                          [item.detail!.id]: next,
                        }))
                      }
                    />
                  ) : null}
                  {detailsOpen && item.farmReview ? (
                    <AdminFarmReviewDetail lang={lang} review={item.farmReview} />
                  ) : null}
                  {detailsOpen && item.appeal ? (
                    <AdminAppealReviewDetail lang={lang} appeal={item.appeal} />
                  ) : null}
                  {detailsOpen && item.ticket ? (
                    <AdminSupportTicketReview
                      lang={lang}
                      ticket={item.ticket}
                      reporterLabel={
                        reporterAccount?.display_name || reporterAccount?.email || null
                      }
                    />
                  ) : null}
                  {renderRequestActions(item)}
                </div>
                );
              })}
              {filteredRequests.length === 0 && (
                <p className="text-sm text-[#8B7355]">
                  {focusRequestId && !findRequestByFocusId(requestItems, focusRequestId)
                    ? t(lang, "admin.requests.focusMissing")
                    : t(lang, "admin.requests.empty")}
                </p>
              )}
            </div>
          </div>
        );

      case "listings":
        return (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-bold text-[#2B1E19]">
                {t(lang, "admin.listings.title")}
                <span className="ml-2 text-sm font-medium text-[#8B7355]">
                  {filteredListings.length}
                </span>
              </h1>
              <div className="flex flex-wrap items-end gap-3">
                <FilterSelect
                  label={t(lang, "admin.filter.status")}
                  value={listingStatusFilter}
                  onChange={(v) => {
                    const next = v as AdminListingStatusFilter;
                    router.replace(
                      adminConsoleHref({
                        section: "listings",
                        listingStatus: next === "all" ? null : next,
                      }),
                    );
                  }}
                  options={ADMIN_LISTING_STATUS_FILTERS.map((value) => ({
                    value,
                    label:
                      value === "all"
                        ? t(lang, "admin.filter.all")
                        : t(lang, listingStatusLabelKey(value) as EnKey),
                  }))}
                />
                <ActionButton
                  label={t(lang, "admin.refresh")}
                  variant="ghost"
                  onClick={() => void load()}
                />
              </div>
            </div>
            <div className="space-y-3">
              {filteredListings.map((p) => {
                const reviewKey = `listing-${p.id}`;
                const detailsOpen = expandedReviewId === reviewKey;
                const rejectionReason = listingRejectionReason(p.metadata);
                return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#E8DFD0] p-5"
                >
                  <div className="flex gap-4">
                    {p.media_urls?.[0] && !detailsOpen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.media_urls[0]}
                        alt=""
                        className="h-24 w-24 rounded-xl object-cover bg-[#F3EDE3] flex-shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <StatusChip
                          status={p.status || "pending_review"}
                          label={t(
                            lang,
                            listingStatusLabelKey(p.status) as EnKey,
                          )}
                        />
                        <span className="text-xs text-[#B8A990]">
                          {formatDate(p.created_at)}
                        </span>
                      </div>
                      <Link
                        href={listingPublicHref(p.id)}
                        className="font-semibold text-sm text-[#2B1E19] hover:text-[#B45309] hover:underline"
                      >
                        {p.title || t(lang, "admin.listings.viewPublic")}
                      </Link>
                      <p className="text-xs text-[#8B7355]">
                        {[p.breeder_profile?.display_name, p.species, p.breed, p.price_note]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {p.status === "archived" && rejectionReason ? (
                        <p className="mt-2 text-xs text-red-700">
                          <span className="font-semibold">
                            {t(lang, "admin.listings.rejectionReason")}:{" "}
                          </span>
                          {rejectionReason}
                        </p>
                      ) : null}
                      {p.status === "deposit_hold" ? (
                        <p className="mt-2 text-xs text-amber-800">
                          {t(lang, "admin.listings.dealHoldHint")}
                        </p>
                      ) : null}
                      {!detailsOpen ? <HealthEvidence lang={lang} post={p} /> : null}
                      <AdminReviewDetailsToggle
                        lang={lang}
                        open={detailsOpen}
                        onToggle={() =>
                          setExpandedReviewId((cur) => toggleExpandedReviewId(cur, reviewKey))
                        }
                      />
                      {detailsOpen ? (
                        <AdminListingReviewDetail lang={lang} post={p} />
                      ) : null}
                      {(p.status === "pending_review" || p.status === "published") && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {p.status === "pending_review" ? (
                            <>
                              <ActionButton
                                label={t(lang, "admin.listings.approve")}
                                variant="success"
                                disabled={busyKey !== null}
                                onClick={() => void updatePost(p.id, "published")}
                              />
                              <ActionButton
                                label={t(lang, "admin.listings.reject")}
                                variant="ghost"
                                disabled={busyKey !== null}
                                onClick={() =>
                                  openRejectModal({ kind: "listing", postId: p.id })
                                }
                              />
                            </>
                          ) : (
                            <ActionButton
                              label={t(lang, "admin.listings.archive")}
                              variant="ghost"
                              disabled={busyKey !== null}
                              onClick={() => {
                                if (!window.confirm(t(lang, "admin.listings.confirmArchive"))) {
                                  return;
                                }
                                void updatePost(p.id, "archived");
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
              {filteredListings.length === 0 && (
                <p className="text-sm text-[#8B7355]">{t(lang, "admin.empty")}</p>
              )}
            </div>
          </div>
        );

      case "breeders":
        return (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-bold text-[#2B1E19]">
                {t(lang, "admin.breeders.title")}
                <span className="ml-2 text-sm font-medium text-[#8B7355]">
                  {filteredBreeders.length}
                </span>
              </h1>
              <ActionButton
                label={t(lang, "admin.refresh")}
                variant="ghost"
                onClick={() => void load()}
              />
            </div>
            <div className="mb-4 rounded-2xl border border-[#E8DFD0] bg-white p-4">
              <div className="flex flex-wrap gap-3">
                <FilterSelect
                  label={t(lang, "admin.filter.status")}
                  value={breederStatusFilter}
                  onChange={(v) => {
                    const next = v as AdminBreederStatusFilter;
                    router.replace(
                      adminConsoleHref({
                        section: "breeders",
                        breederStatus: next === "all" ? null : next,
                      }),
                    );
                  }}
                  options={ADMIN_BREEDER_STATUS_FILTERS.map((value) => ({
                    value,
                    label:
                      value === "all"
                        ? t(lang, "admin.filter.all")
                        : t(lang, `admin.breeders.status.${value}` as EnKey),
                  }))}
                />
                <FilterSelect
                  label={t(lang, "admin.filter.species")}
                  value={breederSpeciesFilter}
                  onChange={setBreederSpeciesFilter}
                  options={[
                    { value: "all", label: t(lang, "admin.filter.all") },
                    ...breederSpeciesOptions.map((s) => ({ value: s, label: s })),
                  ]}
                />
                <FilterSelect
                  label={t(lang, "admin.filter.date")}
                  value={breederDateFilter}
                  onChange={(v) => setBreederDateFilter(v as DateFilter)}
                  options={[
                    { value: "newest", label: t(lang, "admin.date.newest") },
                    { value: "oldest", label: t(lang, "admin.date.oldest") },
                    { value: "today", label: t(lang, "admin.date.today") },
                    { value: "week", label: t(lang, "admin.date.week") },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-3">
              {filteredBreeders.map((b) => {
                const reviewKey = `breeder-row-${b.id}`;
                const detailsOpen = expandedReviewId === reviewKey;
                const rejectionReason = listingRejectionReason(b.metadata);
                const avatar = String(b.avatar_url || "").trim();
                const avatarSafe = isSafeHttpUrl(avatar) ? avatar : "";
                return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-[#E8DFD0] p-5"
                >
                  <div className="flex gap-4">
                    {avatarSafe && !detailsOpen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarSafe}
                        alt=""
                        className="h-24 w-24 rounded-xl object-cover bg-[#F3EDE3] flex-shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <StatusChip
                          status={b.verification_status || "unverified"}
                          label={verificationLabel(b.verification_status)}
                        />
                        <span className="text-xs text-[#B8A990]">
                          {formatDate(b.created_at)}
                        </span>
                      </div>
                      <Link
                        href={breederPublicHref(b.id)}
                        className="font-semibold text-sm text-[#2B1E19] hover:text-[#B45309] hover:underline"
                      >
                        {b.display_name || t(lang, "admin.breeders.viewPublic")}
                      </Link>
                      <p className="text-xs text-[#8B7355]">
                        {[b.location, speciesListLabel(lang, b.primary_species)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {(b.verification_status === "rejected" ||
                        b.verification_status === "suspended") &&
                      rejectionReason ? (
                        <p className="mt-2 text-xs text-red-700">
                          <span className="font-semibold">
                            {t(lang, "admin.breeders.rejectReason")}:{" "}
                          </span>
                          {rejectionReason}
                        </p>
                      ) : null}
                      {!detailsOpen && b.bio ? (
                        <p className="text-sm text-[#5C4A3A] mt-2 line-clamp-3">
                          {b.bio}
                        </p>
                      ) : null}
                      <AdminReviewDetailsToggle
                        lang={lang}
                        open={detailsOpen}
                        onToggle={() =>
                          setExpandedReviewId((cur) => toggleExpandedReviewId(cur, reviewKey))
                        }
                      />
                      {detailsOpen ? (
                        <AdminBreederReviewDetail lang={lang} profile={b} />
                      ) : null}
                      {b.user_id ? (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {b.verification_status === "pending_review" ||
                          b.verification_status === "unverified" ||
                          b.verification_status === "rejected" ||
                          b.verification_status === "suspended" ? (
                            <ActionButton
                              label={t(lang, "admin.breeders.verify")}
                              variant="success"
                              disabled={busyKey !== null}
                              onClick={() => {
                                const confirmKey = breederVerifyConfirmKey(
                                  b.verification_status,
                                );
                                if (
                                  confirmKey &&
                                  !window.confirm(t(lang, confirmKey))
                                ) {
                                  return;
                                }
                                void updateBreeder(b.user_id!, "verified");
                              }}
                            />
                          ) : null}
                          {b.verification_status === "pending_review" ? (
                            <ActionButton
                              label={t(lang, "admin.breeders.reject")}
                              variant="ghost"
                              disabled={busyKey !== null}
                              onClick={() =>
                                openRejectModal({
                                  kind: "breeder",
                                  userId: b.user_id!,
                                })
                              }
                            />
                          ) : null}
                          {b.verification_status === "verified" ? (
                            <ActionButton
                              label={t(lang, "admin.breeders.suspend")}
                              variant="danger"
                              disabled={busyKey !== null}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    t(lang, "admin.breeders.confirmSuspend"),
                                  )
                                ) {
                                  return;
                                }
                                void updateBreeder(b.user_id!, "suspended");
                              }}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                );
              })}
              {filteredBreeders.length === 0 && (
                <p className="text-sm text-[#8B7355]">{t(lang, "admin.empty")}</p>
              )}
            </div>
          </div>
        );

      case "reports":
        return (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-bold text-[#2B1E19]">
                {t(lang, "admin.reports.title")}
                <span className="ml-2 text-sm font-medium text-[#8B7355]">
                  {filteredReports.length}
                </span>
              </h1>
              <div className="flex flex-wrap items-end gap-3">
                <FilterSelect
                  label={t(lang, "admin.filter.status")}
                  value={reportStatusFilter}
                  onChange={(v) => {
                    const next = v as AdminReportStatusFilter;
                    router.replace(
                      adminConsoleHref({
                        section: "reports",
                        reportStatus: next,
                      }),
                    );
                  }}
                  options={ADMIN_REPORT_STATUS_FILTERS.map((value) => ({
                    value,
                    label:
                      value === "all"
                        ? t(lang, "admin.filter.all")
                        : t(lang, reportStatusLabelKey(value) as EnKey),
                  }))}
                />
                <ActionButton
                  label={t(lang, "admin.refresh")}
                  variant="ghost"
                  onClick={() => void load()}
                />
              </div>
            </div>
            <div className="space-y-3">
              {filteredReports.map((r) => {
                const linkedPost = r.post_id
                  ? posts.find((p) => p.id === r.post_id)
                  : undefined;
                const linkedProfile = r.breeder_profile_id
                  ? breeders.find((b) => b.id === r.breeder_profile_id)
                  : undefined;
                const linkedBreederUserId =
                  r.breeder_profile?.user_id || linkedProfile?.user_id;
                const reviewKey = `report-row-${r.id}`;
                const detailsOpen = expandedReviewId === reviewKey;
                const targetHref = reportTargetHref(r);
                const targetKind =
                  r.target_type === "breeder_profile" || r.breeder_profile_id
                    ? t(lang, "admin.requests.type.breeder")
                    : r.post_id
                      ? t(lang, "admin.requests.type.post")
                      : r.comment_id
                        ? t(lang, "admin.reports.commentTarget")
                        : t(lang, "admin.reports.unknownTarget");
                const targetName =
                  r.target_type === "breeder_profile" || r.breeder_profile_id
                    ? r.breeder_profile?.display_name ||
                      linkedProfile?.display_name ||
                      r.breeder_profile_id ||
                      "—"
                    : r.post_id
                      ? linkedPost?.title || r.post_id
                      : r.comment_id || "—";
                const canHideListing = listingHideFromReportAllowed(linkedPost?.status);
                const dealHold =
                  String(linkedPost?.status || "").toLowerCase() === "deposit_hold";
                const forceResolveBlocked = isOpenDealDisputeOnHold({
                  reportReason: r.reason,
                  reportStatus: r.status,
                  linkedPostStatus: linkedPost?.status,
                });
                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl border border-[#E8DFD0] p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusChip
                        status={r.status || "open"}
                        label={reportStatusLabel(r.status)}
                      />
                      {isDealDisputeReport(r.reason) ? (
                        <StatusChip
                          status="deposit_hold"
                          label={t(lang, "admin.review.dealDispute")}
                        />
                      ) : null}
                      <span className="text-xs text-[#B8A990]">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#2B1E19]">
                      {reportReasonLabel(r.reason)}
                    </p>
                    <p className="text-xs text-[#8B7355] mt-1">
                      {targetHref ? (
                        <>
                          {targetKind}:{" "}
                          <Link
                            href={targetHref}
                            className="font-semibold text-[#B45309] hover:underline"
                          >
                            {targetName}
                          </Link>
                        </>
                      ) : r.post_id || r.breeder_profile_id || r.comment_id ? (
                        `${targetKind}: ${targetName}`
                      ) : (
                        t(lang, "admin.reports.unknownTarget")
                      )}
                    </p>
                    {r.note && !detailsOpen ? (
                      <p className="text-xs text-[#5C4A3A] mt-2">{r.note}</p>
                    ) : null}
                    {forceResolveBlocked ? (
                      <p className="mt-2 text-xs text-amber-800">
                        {t(lang, "admin.reports.forceResolveUnavailable")}
                      </p>
                    ) : dealHold ? (
                      <p className="mt-2 text-xs text-amber-800">
                        {t(lang, "admin.listings.dealHoldHint")}
                      </p>
                    ) : null}
                    <AdminReviewDetailsToggle
                      lang={lang}
                      open={detailsOpen}
                      onToggle={() =>
                        setExpandedReviewId((cur) => toggleExpandedReviewId(cur, reviewKey))
                      }
                    />
                    {detailsOpen ? (
                      <AdminReportReviewDetail
                        lang={lang}
                        report={r}
                        linkedPost={linkedPost}
                        linkedProfile={linkedProfile}
                      />
                    ) : null}
                    {r.status === "open" ? (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <ActionButton
                          label={t(lang, "admin.reports.markReviewed")}
                          variant="danger"
                          disabled={busyKey !== null}
                          onClick={() => {
                            if (!window.confirm(t(lang, "admin.reports.confirmViolation"))) {
                              return;
                            }
                            void updateReport(r.id, "reviewed");
                          }}
                        />
                        <ActionButton
                          label={t(lang, "admin.reports.dismiss")}
                          variant="ghost"
                          disabled={busyKey !== null}
                          onClick={() => {
                            if (!window.confirm(t(lang, "admin.reports.confirmDismiss"))) {
                              return;
                            }
                            void updateReport(r.id, "dismissed");
                          }}
                        />
                        {canHideListing && linkedPost ? (
                          <ActionButton
                            label={t(lang, "admin.reports.archivePost")}
                            variant="ghost"
                            disabled={busyKey !== null}
                            onClick={() => {
                              if (
                                !window.confirm(t(lang, "admin.listings.confirmArchive"))
                              ) {
                                return;
                              }
                              void updatePost(linkedPost.id, "archived");
                            }}
                          />
                        ) : null}
                        {linkedBreederUserId ? (
                          <ActionButton
                            label={t(lang, "admin.reports.suspendBreeder")}
                            variant="danger"
                            disabled={busyKey !== null}
                            onClick={() => {
                              if (!window.confirm(t(lang, "admin.breeders.confirmSuspend"))) {
                                return;
                              }
                              void updateBreeder(linkedBreederUserId, "suspended");
                            }}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {filteredReports.length === 0 && (
                <p className="text-sm text-[#8B7355]">{t(lang, "admin.empty")}</p>
              )}
            </div>
          </div>
        );

      case "users":
        return (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-bold text-[#2B1E19]">
                {t(lang, "admin.users.title")}
                <span className="ml-2 text-sm font-medium text-[#8B7355]">
                  {filteredAccounts.length}
                </span>
              </h1>
              <div className="flex flex-wrap items-end gap-3">
                <FilterSelect
                  label={t(lang, "admin.users.role")}
                  value={userRoleFilter}
                  onChange={(v) => {
                    const next = v as AdminUserRoleFilter;
                    router.replace(
                      adminConsoleHref({
                        section: "users",
                        userRole: next === "all" ? null : next,
                        userStatus:
                          userStatusFilter === "all" ? null : userStatusFilter,
                      }),
                    );
                  }}
                  options={ADMIN_USER_ROLE_FILTERS.map((value) => ({
                    value,
                    label:
                      value === "all"
                        ? t(lang, "admin.filter.all")
                        : t(lang, accountRoleLabelKey(value)),
                  }))}
                />
                <FilterSelect
                  label={t(lang, "admin.filter.status")}
                  value={userStatusFilter}
                  onChange={(v) => {
                    const next = v as AdminUserStatusFilter;
                    router.replace(
                      adminConsoleHref({
                        section: "users",
                        userRole: userRoleFilter === "all" ? null : userRoleFilter,
                        userStatus: next === "all" ? null : next,
                      }),
                    );
                  }}
                  options={ADMIN_USER_STATUS_FILTERS.map((value) => ({
                    value,
                    label:
                      value === "all"
                        ? t(lang, "admin.filter.all")
                        : t(lang, accountStatusLabelKey(value)),
                  }))}
                />
                <ActionButton
                  label={t(lang, "admin.refresh")}
                  variant="ghost"
                  onClick={() => void load()}
                />
              </div>
            </div>
            <div className="mb-4 rounded-2xl border border-[#E8DFD0] bg-white p-4 space-y-3">
              <p className="text-sm font-bold text-[#2B1E19]">
                {t(lang, "admin.users.create")}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t(lang, "admin.users.email")}
                  className="rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                />
                <input
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder={t(lang, "admin.users.displayName")}
                  className="rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                />
                <div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t(lang, "admin.users.password")}
                    className="w-full rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                  />
                  <p className="mt-1 text-[11px] text-[#8B7355]">
                    {t(lang, "admin.users.passwordHint")}
                  </p>
                </div>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as (typeof ROLES)[number])}
                  className="appearance-none rounded-xl border border-[#E8DFD0] pl-3 pr-10 py-2 text-sm outline-none focus:border-[#D97706]"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(lang, accountRoleLabelKey(role))}
                    </option>
                  ))}
                </select>
              </div>
              <ActionButton
                label={t(lang, "admin.users.create")}
                disabled={
                  busyKey !== null ||
                  !canSubmitCreateAccount({
                    email: newEmail,
                    password: newPassword,
                    displayName: newDisplayName,
                  })
                }
                onClick={() => createAccount()}
              />
            </div>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={t(lang, "admin.users.search")}
              className="mb-3 w-full rounded-xl border border-[#E8DFD0] bg-white px-3 py-2 text-sm outline-none focus:border-[#D97706]"
            />
            <div className="bg-white rounded-2xl border border-[#E8DFD0] overflow-hidden">
              {filteredAccounts.map((u, i) => {
                const userId = accountRowId(u);
                const role = normalizeAccountRole(u.primary_role);
                const status = normalizeAccountStatus(u.account_status);
                const isSelf = isSelfAdminAccount(sessionUserId, u);
                const lastAdmin = isLastActiveAdmin(accounts, userId);
                const statusLocked = !userId || isSelf || (lastAdmin && status === "active");
                return (
                  <div
                    key={userId || i}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[#F3EDE3] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2B1E19]">
                        {u.display_name || "—"}
                      </p>
                      <p className="text-xs text-[#8B7355]">
                        {u.email || u.login_identifier}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusChip
                          status={role}
                          label={t(lang, accountRoleLabelKey(role))}
                        />
                        <StatusChip
                          status={status}
                          label={t(lang, accountStatusLabelKey(status))}
                        />
                        {u.isForTesting ? (
                          <StatusChip
                            status="reviewed"
                            label={t(lang, "admin.users.testAccount")}
                          />
                        ) : null}
                        {isSelf ? (
                          <StatusChip
                            status="verified"
                            label={t(lang, "admin.users.self")}
                          />
                        ) : null}
                      </div>
                    </div>
                    {userId ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-xs text-[#8B7355]">
                          {t(lang, "admin.users.changeRole")}
                          <select
                            value={role}
                            disabled={busyKey !== null}
                            onChange={(e) => {
                              const next = e.target.value;
                              e.target.value = role;
                              if (next === role) return;
                              const blockKey = accountRoleChangeBlockKey({
                                sessionUserId,
                                account: u,
                                accounts,
                                nextRole: next,
                              });
                              if (blockKey) {
                                window.alert(t(lang, blockKey));
                                return;
                              }
                              const confirmKey = accountRoleChangeConfirmKey(
                                role,
                                next,
                              );
                              if (
                                confirmKey &&
                                !window.confirm(t(lang, confirmKey))
                              ) {
                                return;
                              }
                              void updateAccountRole(userId, next);
                            }}
                            className="appearance-none rounded-lg border border-[#E8DFD0] pl-2 pr-8 py-1 text-xs text-[#2B1E19]"
                          >
                            {ROLES.map((option) => (
                              <option key={option} value={option}>
                                {t(lang, accountRoleLabelKey(option))}
                              </option>
                            ))}
                          </select>
                        </label>
                        <ActionButton
                          label={t(
                            lang,
                            status === "suspended"
                              ? "admin.users.restore"
                              : "admin.users.suspend",
                          )}
                          variant={status === "suspended" ? "success" : "ghost"}
                          disabled={busyKey !== null || statusLocked}
                          onClick={() => {
                            const nextStatus =
                              status === "suspended" ? "active" : "suspended";
                            if (lastAdmin && nextStatus === "suspended") {
                              window.alert(t(lang, "admin.users.lastAdmin"));
                              return;
                            }
                            const confirmKey =
                              accountStatusChangeConfirmKey(nextStatus);
                            if (
                              confirmKey &&
                              !window.confirm(t(lang, confirmKey))
                            ) {
                              return;
                            }
                            void updateAccountStatus(userId, nextStatus);
                          }}
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        {t(lang, accountRoleLabelKey(role))}
                      </span>
                    )}
                  </div>
                );
              })}
              {filteredAccounts.length === 0 && (
                <p className="p-5 text-sm text-[#8B7355]">{t(lang, "admin.empty")}</p>
              )}
            </div>
          </div>
        );

      case "history": {
        const actionLabel = (action: string) => {
          const key = historyActionI18nKey(action) as EnKey;
          const label = t(lang, key);
          return label === key ? action : label;
        };
        const formatLogTime = (value?: string) => {
          if (!value) return "—";
          const date = new Date(value);
          if (!Number.isFinite(date.getTime())) return value;
          return date.toLocaleString(lang === "VI" ? "vi-VN" : "en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        };
        return (
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-bold text-[#2B1E19]">
                {t(lang, "admin.history.title")}
              </h1>
              <ActionButton
                label={t(lang, "admin.refresh")}
                variant="ghost"
                disabled={historyLoading}
                onClick={() => void loadHistory()}
              />
            </div>
            <p className="text-sm text-[#8B7355] mb-4">
              {t(lang, "admin.history.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <FilterSelect
                label={t(lang, "admin.history.filterAction")}
                value={historyActionFilter}
                onChange={(value) => {
                  const next = value as HistoryActionFilter;
                  router.replace(
                    adminConsoleHref({
                      section: "history",
                      historyAction: next === "all" ? null : next,
                    }),
                  );
                }}
                options={HISTORY_ACTION_FILTERS.map((value) => ({
                  value,
                  label:
                    value === "all"
                      ? t(lang, "admin.history.filterAll")
                      : actionLabel(value),
                }))}
              />
            </div>
            <div className="rounded-2xl border border-[#E8DFD0] bg-white overflow-hidden divide-y divide-[#F0E6D8]">
              {actionLogs.map((log) => {
                const open = expandedLogId === log.id;
                const reason = historyRejectionReason(log.metadata);
                const targetHref = historyTargetHref(log);
                const summary = historyChangeSummary(log);
                const targetLabel = [log.target_type, log.target_id]
                  .filter(Boolean)
                  .join(" / ");
                return (
                  <div key={log.id} className="p-4">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setExpandedLogId(open ? null : log.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#2B1E19]">
                            {actionLabel(log.action || "")}
                          </p>
                          <p className="mt-0.5 text-xs text-[#8B7355]">
                            {log.actor_display_name ||
                              (log.actor_via_secret
                                ? t(lang, "admin.history.viaSecret")
                                : t(lang, "admin.history.unknownActor"))}
                            {" · "}
                            {formatLogTime(log.created_at)}
                          </p>
                          <p className="mt-1 text-xs text-[#5C4A3A]">
                            {summary}
                            {reason ? ` · ${reason}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-[#D97706]">
                          {open
                            ? t(lang, "admin.history.hideDetails")
                            : t(lang, "admin.history.showDetails")}
                        </span>
                      </div>
                    </button>
                    {open ? (
                      <div className="mt-3 grid gap-2 rounded-xl bg-[#FDFBF7] border border-[#F0E6D8] p-3 text-xs text-[#5C4A3A]">
                        <p>
                          <span className="font-semibold">
                            {t(lang, "admin.history.target")}:{" "}
                          </span>
                          {targetHref ? (
                            <Link
                              href={targetHref}
                              className="font-semibold text-[#B45309] hover:underline break-all"
                            >
                              {targetLabel || "—"}
                            </Link>
                          ) : (
                            targetLabel || "—"
                          )}
                        </p>
                        {log.target_user_id ? (
                          <p>
                            <span className="font-semibold">
                              {t(lang, "admin.history.targetUser")}:{" "}
                            </span>
                            {log.target_user_id}
                          </p>
                        ) : null}
                        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-white border border-[#E8DFD0] p-2">
                          {JSON.stringify(
                            {
                              before: log.before_state,
                              after: log.after_state,
                              metadata: log.metadata,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {!historyLoading && actionLogs.length === 0 ? (
                <p className="p-5 text-sm text-[#8B7355]">{t(lang, "admin.empty")}</p>
              ) : null}
              {historyLoading ? (
                <p className="p-5 text-sm text-[#8B7355]">{t(lang, "common.loading")}</p>
              ) : null}
            </div>
            {historyCursor ? (
              <div className="mt-4">
                <ActionButton
                  label={t(lang, "admin.history.loadMore")}
                  variant="ghost"
                  disabled={historyLoading}
                  onClick={() => void loadHistory({ append: true, cursor: historyCursor })}
                />
              </div>
            ) : null}
          </div>
        );
      }

      case "features": {
        const renderFlagRow = (key: keyof AppFeatureFlags) => {
          const enabled = flags[key];
          const lastTab = isLastEnabledPetFeedTab(flags, key);
          return (
            <div
              key={key}
              className="bg-white rounded-2xl border border-[#E8DFD0] px-5 py-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-[#2B1E19]">
                  {t(lang, featureFlagTitleKey(key))}
                </p>
                <p className="text-xs text-[#8B7355]">
                  {t(lang, featureFlagDescKey(key))}
                </p>
                <p
                  className={`mt-1 text-[10px] font-bold uppercase ${
                    enabled ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {enabled
                    ? t(lang, "admin.features.on")
                    : t(lang, "admin.features.off")}
                </p>
              </div>
              <button
                type="button"
                disabled={busyKey !== null || lastTab}
                onClick={() => toggleFlag(key, !enabled)}
                className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${
                  enabled ? "bg-[#D97706]" : "bg-slate-300"
                }`}
                aria-pressed={enabled}
                aria-label={t(lang, featureFlagTitleKey(key))}
                title={lastTab ? t(lang, "admin.features.lastTab") : undefined}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    enabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          );
        };
        return (
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h1 className="text-xl font-bold text-[#2B1E19]">
                {t(lang, "admin.features.title")}
              </h1>
              <ActionButton
                label={t(lang, "admin.refresh")}
                variant="ghost"
                disabled={busyKey !== null}
                onClick={() => void load()}
              />
            </div>
            <p className="text-sm text-[#8B7355] mb-4">
              {t(lang, "admin.features.subtitle")}
            </p>
            <div className="mb-4 rounded-2xl border border-[#E8DFD0] bg-[#FFF8ED] px-4 py-3 text-sm text-[#5C4A3A]">
              {t(lang, "admin.features.note")}
            </div>
            <div className="space-y-2 mb-6">
              {ADMIN_FEATURE_CORE_KEYS.map(renderFlagRow)}
            </div>
            <h2 className="text-base font-bold text-[#2B1E19] mb-1">
              {t(lang, "admin.features.petFeedTitle")}
            </h2>
            <p className="text-sm text-[#8B7355] mb-3">
              {t(lang, "admin.features.petFeedSubtitle")}
            </p>
            <div className="space-y-2">
              {ADMIN_PET_FEED_TAB_KEYS.map(renderFlagRow)}
            </div>
          </div>
        );
      }

      case "news": {
        const newsBlockKey = newsPublishError({
          title: newsTitle,
          body: newsBody,
          ctaLabel: newsCtaLabel,
          ctaUrl: newsCtaUrl,
          photos: newsPhotos,
        });
        const newsReady = newsBlockKey === null;
        const newsPreview = buildAdminNewsLivePreview({
          title: newsTitle,
          body: newsBody,
          category: newsCategory,
          ctaLabel: newsCtaLabel,
          ctaUrl: newsCtaUrl,
          photoUrls: newsPhotoUrls,
          authorLabel: t(lang, "news.author"),
        });
        const pickNewsPhotos = (list: FileList | File[] | null) => {
          const incoming = Array.from(list || []);
          if (!incoming.length) return;
          const merged = [...newsPhotos, ...incoming].slice(0, NEWS_MAX_PHOTOS);
          const photoError = newsPublishError({
            title: "ok",
            body: "ok",
            photos: merged,
          });
          if (photoError) {
            setError(t(lang, photoError));
            return;
          }
          setError("");
          setNewsPhotos(merged);
          if (newsPhotoInputRef.current) newsPhotoInputRef.current.value = "";
        };
        return (
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <h1 className="text-xl font-bold text-[#2B1E19]">
                {t(lang, "admin.news.title")}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={NEWS_HREF}
                  className="inline-flex items-center justify-center rounded-full border border-[#E8DFD0] px-4 py-2 text-sm font-semibold text-[#5C4A3A] hover:bg-[#FDF8F0]"
                >
                  {t(lang, "admin.news.openFeed")}
                </Link>
                <ActionButton
                  label={t(lang, "admin.refresh")}
                  variant="ghost"
                  disabled={myNewsLoading || busyKey !== null}
                  onClick={() => void loadMyNews()}
                />
              </div>
            </div>
            <p className="text-sm text-[#8B7355] mb-4">{t(lang, "admin.news.note")}</p>
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-[#8B7355]">
                    {t(lang, "admin.news.category")}
                  </span>
                  <select
                    value={newsCategory}
                    onChange={(e) =>
                      setNewsCategory(e.target.value as AnnouncementCategory)
                    }
                    className="appearance-none mt-1 w-full rounded-xl border border-[#E8DFD0] pl-3 pr-10 py-2 text-sm outline-none focus:border-[#D97706]"
                  >
                    {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {t(lang, `admin.news.cat.${cat}` as EnKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#8B7355]">
                    {t(lang, "admin.news.titleLabel")}
                  </span>
                  <input
                    value={newsTitle}
                    maxLength={NEWS_TITLE_MAX}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#8B7355]">
                    {t(lang, "admin.news.body")}
                  </span>
                  <textarea
                    value={newsBody}
                    maxLength={NEWS_BODY_MAX}
                    onChange={(e) => setNewsBody(e.target.value)}
                    rows={5}
                    className="mt-1 w-full rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                  />
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={newsCtaLabel}
                    onChange={(e) => setNewsCtaLabel(e.target.value)}
                    placeholder={t(lang, "admin.news.ctaLabel")}
                    className="rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                  />
                  <input
                    value={newsCtaUrl}
                    onChange={(e) => setNewsCtaUrl(e.target.value)}
                    placeholder={t(lang, "admin.news.ctaUrl")}
                    className="rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                  />
                </div>
                {(newsBlockKey === "admin.news.errorCta" ||
                  newsBlockKey === "admin.news.errorCtaUrl") && (
                  <p className="text-xs text-amber-700" role="alert">
                    {t(lang, newsBlockKey)}
                  </p>
                )}
                <div className="block">
                  <span className="text-xs font-semibold text-[#8B7355]">
                    {t(lang, "admin.news.photos")}
                  </span>
                  <p className="mt-0.5 text-[11px] text-[#8B7355]">
                    {t(lang, "admin.news.photosHint")}
                  </p>
                  <div
                    className="mt-2 rounded-2xl border-2 border-dashed border-[#E8DFD0] bg-[#FDFBF7] px-4 py-5 text-center hover:border-[#D97706]/50 transition-colors"
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      pickNewsPhotos(e.dataTransfer.files);
                    }}
                  >
                    <button
                      type="button"
                      disabled={busyKey !== null || newsPhotos.length >= NEWS_MAX_PHOTOS}
                      onClick={() => newsPhotoInputRef.current?.click()}
                      className="inline-flex items-center justify-center rounded-full border border-[#E8DFD0] bg-white px-4 py-2 text-xs font-semibold text-[#5C4A3A] hover:border-[#D97706] disabled:opacity-50"
                    >
                      {t(lang, "admin.news.photosBrowse")}
                    </button>
                    <input
                      key={newsPhotoInputKey}
                      ref={newsPhotoInputRef}
                      type="file"
                      accept={NEWS_PHOTO_ACCEPT}
                      multiple
                      className="sr-only"
                      onChange={(e) => pickNewsPhotos(e.target.files)}
                    />
                    {newsPhotos.length > 0 ? (
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <p className="text-xs text-[#5C4A3A]">
                          {t(lang, "admin.news.photosSelected").replace(
                            "{{n}}",
                            String(newsPhotos.length),
                          )}
                        </p>
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#B45309] hover:underline"
                          onClick={() => {
                            setNewsPhotos([]);
                            setNewsPhotoInputKey((key) => key + 1);
                          }}
                        >
                          {t(lang, "admin.news.photosClear")}
                        </button>
                      </div>
                    ) : null}
                    {newsPhotoUrls.length > 0 ? (
                      <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {newsPhotoUrls.map((url, index) => (
                          <div
                            key={`${url}-${index}`}
                            className="h-16 w-16 overflow-hidden rounded-lg border border-[#E8DFD0] bg-white"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={busyKey !== null || !newsReady}
                    onClick={publishNews}
                    className="w-full rounded-full bg-[#D97706] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B45309] disabled:opacity-50 disabled:hover:bg-[#D97706]"
                  >
                    {t(lang, "admin.news.publish")}
                  </button>
                  {!newsReady && newsBlockKey ? (
                    <p className="text-xs text-amber-700" role="status">
                      {t(lang, newsBlockKey)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="lg:sticky lg:top-4">
                <AdminNewsLivePreview lang={lang} model={newsPreview} />
              </div>
            </div>
            <h2 className="text-base font-bold text-[#2B1E19] mt-8 mb-3">
              {t(lang, "admin.news.listTitle")}
            </h2>
            <div className="rounded-2xl border border-[#E8DFD0] bg-white overflow-hidden divide-y divide-[#F0E6D8] max-w-xl">
              {myNews.map((row) => {
                const id = announcementRowId(row);
                if (!id) return null;
                const published = isPublishedAnnouncement(row);
                const category = announcementCategoryOf(row);
                return (
                  <div key={id} className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2B1E19]">
                        {row.title || id}
                      </p>
                      <p className="mt-0.5 text-xs text-[#8B7355]">
                        {t(lang, `admin.news.cat.${category}` as EnKey)}
                        {" · "}
                        {t(lang, announcementStatusLabelKey(row.status))}
                      </p>
                      <Link
                        href={announcementPublicHref(id)}
                        className="mt-1 inline-block text-xs font-semibold text-[#B45309] hover:underline"
                      >
                        {t(lang, "admin.news.viewPublic")}
                      </Link>
                    </div>
                    <ActionButton
                      label={t(
                        lang,
                        published ? "admin.news.archive" : "admin.news.restore",
                      )}
                      variant="ghost"
                      disabled={busyKey !== null}
                      onClick={() =>
                        setAnnouncementStatus(id, published ? "archived" : "published")
                      }
                    />
                  </div>
                );
              })}
              {!myNewsLoading && myNews.length === 0 ? (
                <p className="p-5 text-sm text-[#8B7355]">{t(lang, "admin.empty")}</p>
              ) : null}
              {myNewsLoading ? (
                <p className="p-5 text-sm text-[#8B7355]">{t(lang, "common.loading")}</p>
              ) : null}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
        <aside className="hidden lg:flex flex-col w-56 xl:w-64 bg-white border-r border-[#E8DFD0] flex-shrink-0">
          <div className="p-4 border-b border-[#E8DFD0]">
            <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wider">
              {t(lang, "admin.console")}
            </p>
          </div>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label={t(lang, "admin.console")}>
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={adminConsoleHref({ section: item.key })}
                aria-current={section === item.key ? "page" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  section === item.key
                    ? "bg-[#FFF1DE] text-[#B45309]"
                    : "text-[#5C4A3A] hover:bg-[#FDF8F0] hover:text-[#2B1E19]"
                }`}
              >
                <span className="w-5 text-center text-[#D97706]">{item.icon}</span>
                {t(lang, item.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t border-[#E8DFD0]">
            <Link
              href="/"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#8B7355] hover:bg-[#FDF8F0] hover:text-[#5C4A3A] transition-colors"
            >
              ← {t(lang, "admin.back")}
            </Link>
          </div>
        </aside>

        <div className="lg:hidden bg-white border-b border-[#E8DFD0] px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#2B1E19]">
              {t(lang, ADMIN_NAV_ITEMS.find((n) => n.key === section)?.labelKey || "admin.console")}
            </p>
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="text-[#8B7355] w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#FDF8F0]"
              aria-expanded={mobileNavOpen}
              aria-controls="admin-mobile-nav"
              aria-label={t(lang, "admin.nav.menu")}
            >
              ☰
            </button>
          </div>
          {mobileNavOpen && (
            <div id="admin-mobile-nav" className="grid grid-cols-3 sm:grid-cols-4 gap-1 pt-2 pb-1">
              {ADMIN_NAV_ITEMS.map((item) => (
                <Link
                  key={item.key}
                  href={adminConsoleHref({ section: item.key })}
                  aria-current={section === item.key ? "page" : undefined}
                  onClick={() => {
                    setMobileNavOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium ${
                    section === item.key
                      ? "bg-[#FFF1DE] text-[#B45309]"
                      : "text-[#8B7355]"
                  }`}
                >
                  <span>{item.icon}</span>
                  {t(lang, item.labelKey)}
                </Link>
              ))}
            </div>
          )}
        </div>

        <main
          id="admin-console-main"
          className="flex-1 p-5 lg:p-8 overflow-y-auto"
        >
          {error ? (
            <div
              role="alert"
              className="mb-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}
          {renderSection()}
        </main>
      </div>
      {rejectTarget ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2B1E19]/40 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#E8DFD0] bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-[#2B1E19]">
              {t(lang, rejectModalTitleKey(rejectTarget.kind))}
            </h3>
            <p className="mt-1 text-xs text-[#8B7355]">
              {t(lang, rejectModalHintKey(rejectTarget.kind))}
            </p>
            <label className="mt-4 block text-xs font-semibold text-[#6E5A51]">
              {t(
                lang,
                rejectTarget.kind === "listing"
                  ? "admin.listings.rejectReason"
                  : "admin.breeders.rejectReason",
              )}{" "}
              *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectError("");
              }}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
              placeholder={t(
                lang,
                rejectTarget.kind === "listing"
                  ? "admin.listings.rejectReasonPlaceholder"
                  : "admin.breeders.rejectReasonPlaceholder",
              )}
            />
            <label className="mt-3 block text-xs font-semibold text-[#6E5A51]">
              {t(
                lang,
                rejectTarget.kind === "listing"
                  ? "admin.listings.rejectAction"
                  : "admin.breeders.rejectAction",
              )}
            </label>
            <input
              value={rejectAction}
              onChange={(e) => setRejectAction(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
              placeholder={t(
                lang,
                rejectTarget.kind === "listing"
                  ? "admin.listings.rejectActionPlaceholder"
                  : "admin.breeders.rejectActionPlaceholder",
              )}
            />
            <label className="mt-3 block text-xs font-semibold text-[#6E5A51]">
              {t(
                lang,
                rejectTarget.kind === "listing"
                  ? "admin.listings.rejectNote"
                  : "admin.breeders.rejectNote",
              )}
            </label>
            <input
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
              placeholder={t(
                lang,
                rejectTarget.kind === "listing"
                  ? "admin.listings.rejectNotePlaceholder"
                  : "admin.breeders.rejectNotePlaceholder",
              )}
            />
            {rejectTarget.kind === "breeder" || rejectTarget.kind === "detail" ? (
              <>
                <label className="mt-3 block text-xs font-semibold text-[#6E5A51]">
                  {t(lang, "admin.breeders.rejectPenaltyPoints")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  inputMode="numeric"
                  value={rejectPenaltyPoints}
                  onChange={(e) => {
                    setRejectPenaltyPoints(e.target.value);
                    setRejectError("");
                  }}
                  className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                  placeholder={t(lang, "admin.breeders.rejectPenaltyPointsPlaceholder")}
                />
                <label className="mt-3 block text-xs font-semibold text-[#6E5A51]">
                  {t(lang, "admin.breeders.rejectPenaltyKind")}
                </label>
                <select
                  value={rejectPenaltyKind}
                  onChange={(e) => {
                    setRejectPenaltyKind(
                      e.target.value as "" | "transparency" | "compliance" | "review",
                    );
                    setRejectError("");
                  }}
                  className="mt-1.5 w-full rounded-xl border border-[#E8DFD0] bg-white px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                >
                  <option value="">
                    {t(lang, "admin.breeders.rejectPenaltyKindPlaceholder")}
                  </option>
                  <option value="transparency">
                    {t(lang, "admin.breeders.rejectPenaltyKind.transparency")}
                  </option>
                  <option value="compliance">
                    {t(lang, "admin.breeders.rejectPenaltyKind.compliance")}
                  </option>
                  <option value="review">
                    {t(lang, "admin.breeders.rejectPenaltyKind.review")}
                  </option>
                </select>
              </>
            ) : null}
            {rejectError ? (
              <p className="mt-2 text-xs font-medium text-red-600">{rejectError}</p>
            ) : null}
            <DialogActions>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="flex-1 rounded-full border border-[#E8DFD0] py-2.5 text-sm font-semibold text-[#5C4A3A]"
              >
                {t(lang, "common.cancel")}
              </button>
              <button
                type="button"
                disabled={busyKey !== null}
                onClick={() => void submitReject()}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t(lang, rejectModalSubmitKey(rejectTarget.kind))}
              </button>
            </DialogActions>
          </div>
        </div>
      ) : null}
      {farmReviewApproveBlocked ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2B1E19]/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="farm-review-approve-blocked-title"
            className="w-full max-w-md rounded-2xl border border-[#E8DFD0] bg-white p-5 shadow-xl"
          >
            <h3
              id="farm-review-approve-blocked-title"
              className="text-base font-bold text-[#2B1E19]"
            >
              {t(lang, "admin.farmReviews.approveUpdateBlockedTitle")}
            </h3>
            <p className="mt-2 text-sm text-[#6E5A51]">
              {t(lang, "admin.farmReviews.approveUpdateBlockedBody")}
            </p>
            <DialogActions className="mt-5">
              <button
                type="button"
                onClick={() => setFarmReviewApproveBlocked(false)}
                className="flex-1 rounded-full bg-[#D97706] py-2.5 text-sm font-semibold text-white hover:bg-[#B45309]"
              >
                {t(lang, "common.ok")}
              </button>
            </DialogActions>
          </div>
        </div>
      ) : null}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#2B1E19] text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
