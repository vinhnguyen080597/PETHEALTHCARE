"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AdminSection, Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { AdminSectionSkeleton } from "@/components/ui/Skeleton";
import {
  HISTORY_ACTION_FILTERS,
  breederGroup,
  isBreederVerificationQueueItem,
  passesDateFilter,
  requestStatusGroup,
  sortByDate,
  type DateFilter,
  type BreederGroup,
  type RequestStatus,
} from "@/lib/admin/filters";
import {
  canAdminForceResolveDeal,
  toggleExpandedReviewId,
  type AdminReviewBreeder,
  type AdminReviewPost,
  type AdminReviewReport,
} from "@/lib/admin/reviewDetail";
import { breederSubmissionTypeLabel } from "@/lib/breederProfileSubmissions";
import type { BreederProfileSubmission } from "@/lib/breederProfileSubmissions";
import type { TransparencyWarning } from "@/lib/transparencyWarnings";
import { buildListingStatusBody } from "@/lib/admin/listingReject";
import {
  AdminBreederDetailSubmissionReview,
  AdminBreederReviewDetail,
  AdminListingReviewDetail,
  AdminReportReviewDetail,
  AdminReviewDetailsToggle,
} from "@/components/admin/AdminReviewDetailPanel";

type FeatureFlags = {
  breed_recognition: boolean;
  health_analysis: boolean;
  rewarded_ads: boolean;
  subscription: boolean;
  pet_feed_news: boolean;
  pet_feed_listings: boolean;
  pet_feed_breeders: boolean;
  farm_template_change: boolean;
};

type FeatureKey = keyof FeatureFlags;

type PostRow = AdminReviewPost;

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

type RequestType = "all" | "breeder" | "post" | "report" | "detail" | "appeal";
type AnnouncementCategory = "app_update" | "health_tip" | "community" | "general";

type RequestItem = {
  id: string;
  type: "breeder" | "post" | "report" | "detail" | "appeal";
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
};

const PET_FEED_TAB_KEYS: FeatureKey[] = [
  "pet_feed_news",
  "pet_feed_listings",
  "pet_feed_breeders",
];

const FEATURE_CORE: FeatureKey[] = [
  "breed_recognition",
  "health_analysis",
  "farm_template_change",
];

const DEFAULT_FLAGS: FeatureFlags = {
  breed_recognition: true,
  health_analysis: true,
  rewarded_ads: true,
  subscription: true,
  pet_feed_news: true,
  pet_feed_listings: true,
  pet_feed_breeders: true,
  farm_template_change: true,
};

const ROLES = ["sen", "breeder", "admin"] as const;

const navItems: { key: AdminSection; labelKey: EnKey; icon: string }[] = [
  { key: "home", labelKey: "admin.nav.home", icon: "⌂" },
  { key: "requests", labelKey: "admin.nav.requests", icon: "↓" },
  { key: "listings", labelKey: "admin.nav.listings", icon: "◆" },
  { key: "breeders", labelKey: "admin.nav.breeders", icon: "◎" },
  { key: "reports", labelKey: "admin.nav.reports", icon: "!" },
  { key: "history", labelKey: "admin.nav.history", icon: "☰" },
  { key: "users", labelKey: "admin.nav.users", icon: "◉" },
  { key: "features", labelKey: "admin.nav.features", icon: "⚑" },
  { key: "news", labelKey: "admin.nav.news", icon: "✎" },
];

function StatusChip({ status, label }: { status: string; label?: string }) {
  const map: Record<string, string> = {
    waiting: "bg-amber-50 text-amber-800 border-amber-200",
    pending_review: "bg-amber-50 text-amber-800 border-amber-200",
    open: "bg-amber-50 text-amber-800 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-600 border-red-200",
    reviewed: "bg-slate-100 text-slate-600 border-slate-200",
    dismissed: "bg-slate-100 text-slate-500 border-slate-200",
    archived: "bg-slate-100 text-slate-500 border-slate-200",
    suspended: "bg-red-50 text-red-700 border-red-200",
    unverified: "bg-slate-100 text-slate-500 border-slate-200",
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

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api/admin${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Admin request failed");
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

export function AdminConsole({ lang }: { lang: Lang }) {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<AdminSection>("home");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [breeders, setBreeders] = useState<BreederRow[]>([]);
  const [detailSubmissions, setDetailSubmissions] = useState<BreederProfileSubmission[]>([]);
  const [appeals, setAppeals] = useState<TransparencyWarning[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [focusRequestId, setFocusRequestId] = useState<string | null>(null);

  const [requestType, setRequestType] = useState<RequestType>("all");
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("waiting");
  const [requestDate, setRequestDate] = useState<DateFilter>("newest");
  const [breederStatusFilter, setBreederStatusFilter] = useState<BreederGroup>("all");
  const [breederSpeciesFilter, setBreederSpeciesFilter] = useState("all");
  const [breederDateFilter, setBreederDateFilter] = useState<DateFilter>("newest");
  const [listingStatusFilter, setListingStatusFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("open");
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
    | null
  >(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectAction, setRejectAction] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsCategory, setNewsCategory] = useState<AnnouncementCategory>("general");
  const [newsCtaLabel, setNewsCtaLabel] = useState("");
  const [newsCtaUrl, setNewsCtaUrl] = useState("");
  const [newsPhotos, setNewsPhotos] = useState<File[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLogRow[]>([]);
  const [historyActionFilter, setHistoryActionFilter] =
    useState<(typeof HISTORY_ACTION_FILTERS)[number]>("all");
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
    try {
      const [p, b, r, a, f, d, w] = await Promise.all([
        adminFetch("/posts?status=").catch(() => ({ data: [] })),
        adminFetch("/breeders").catch(() => ({ data: [] })),
        adminFetch("/reports?status=").catch(() => ({ data: [] })),
        adminFetch("/accounts").catch(() => ({ data: [] })),
        adminFetch("/feature-flags").catch(() => ({ data: DEFAULT_FLAGS })),
        adminFetch("/breeder-submissions?status=").catch(() => ({ data: [] })),
        adminFetch("/transparency-warnings?status=").catch(() => ({ data: [] })),
      ]);
      setPosts(Array.isArray(p.data) ? p.data : []);
      setBreeders(Array.isArray(b.data) ? b.data : []);
      setReports(Array.isArray(r.data) ? r.data : []);
      setDetailSubmissions(Array.isArray(d.data) ? d.data : []);
      setAppeals(Array.isArray(w.data) ? w.data : []);
      setAccounts(Array.isArray(a.data) ? a.data : []);
      const flagData = f.data && typeof f.data === "object" && !Array.isArray(f.data)
        ? { ...DEFAULT_FLAGS, ...f.data }
        : DEFAULT_FLAGS;
      setFlags(flagData as FeatureFlags);
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
    const sectionParam = searchParams.get("section");
    const typeParam = searchParams.get("type");
    const focusParam = searchParams.get("focus");

    const validSections = new Set(navItems.map((item) => item.key));
    if (sectionParam && validSections.has(sectionParam as AdminSection)) {
      setSection(sectionParam as AdminSection);
    } else     if (typeParam === "breeder" || typeParam === "post" || typeParam === "report" || typeParam === "detail" || typeParam === "appeal") {
      setSection("requests");
    }

    if (typeParam === "breeder" || typeParam === "post" || typeParam === "report" || typeParam === "detail" || typeParam === "appeal") {
      setRequestType(typeParam);
      setRequestStatus("waiting");
    }
    if (focusParam) {
      setFocusRequestId(focusParam);
    }
  }, [searchParams]);

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
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, historyActionFilter]);

  const pendingPosts = posts.filter((p) => p.status === "pending_review");
  const pendingBreeders = breeders.filter((b) => b.verification_status === "pending_review");
  const openReports = reports.filter((r) => r.status === "open");
  const verifiedBreeders = breeders.filter((b) => b.verification_status === "verified");
  const pendingDetailSubmissions = detailSubmissions.filter((s) => s.status === "pending");
  const pendingAppeals = appeals.filter((s) => s.status === "appealed" || s.status === "pending_breeder_action");
  const pendingRequestCount =
    pendingPosts.length + pendingBreeders.length + openReports.length + pendingDetailSubmissions.length + pendingAppeals.length;

  const requestItems = useMemo<RequestItem[]>(() => {
    const breederItems: RequestItem[] = breeders
      .filter((profile) => isBreederVerificationQueueItem(profile.verification_status))
      .map((profile) => ({
      id: `breeder-${profile.id}`,
      type: "breeder",
      status: profile.verification_status || "unverified",
      createdAt: profile.created_at || "",
      title: profile.display_name || "—",
      subtitle: [profile.location, (profile.primary_species || []).join(", ")]
        .filter(Boolean)
        .join(" · "),
      body:
        profile.bio ||
        (profile.main_breeds || []).join(", ") ||
        "",
      profile,
    }));
    const postItems: RequestItem[] = posts.map((post) => ({
      id: `post-${post.id}`,
      type: "post",
      status: post.status || "pending_review",
      createdAt: post.created_at || "",
      title: post.title || "—",
      subtitle: [post.species, post.breed, post.location].filter(Boolean).join(" · "),
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
      }
      return {
        id: `report-${report.id}`,
        type: "report",
        status: report.status || "open",
        createdAt: report.created_at || "",
        title: report.reason || t(lang, "admin.requests.type.report"),
        subtitle,
        body: report.note || "",
        report,
      };
    });
    const detailItems: RequestItem[] = detailSubmissions.map((submission) => ({
      id: `detail-${submission.id}`,
      type: "detail",
      status: submission.status || "pending",
      createdAt: submission.created_at || "",
      title: breederSubmissionTypeLabel(submission.submission_type, lang),
      subtitle: submission.breeder_profile?.display_name || submission.user_id || "—",
      body: submission.payload?.url || submission.payload?.note || "",
      detail: submission,
    }));
    const appealItems: RequestItem[] = appeals.map((warning) => ({
      id: `appeal-${warning.id}`,
      type: "appeal",
      status: warning.status || "appealed",
      createdAt: warning.created_at || warning.breeder_action_at || "",
      title: t(lang, "admin.requests.type.appeal"),
      subtitle: warning.breeder_profile?.display_name || warning.user_id || "—",
      body: `${t(lang, "admin.appeals.score")}: ${warning.score_at_trigger}/100 · ${t(lang, "admin.appeals.penalty")}: ${warning.penalty_points_at_trigger}`,
      appeal: warning,
    }));
    return [...breederItems, ...postItems, ...reportItems, ...detailItems, ...appealItems];
  }, [breeders, posts, reports, detailSubmissions, appeals, lang]);

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
    const matched = requestItems.find((item) => {
      const rawId =
        item.type === "breeder"
          ? item.profile?.id
          : item.type === "post"
            ? item.post?.id
            : item.report?.id;
      return rawId === focusRequestId;
    });
    if (matched) setExpandedReviewId(matched.id);
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
    const q = userSearch.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((account) =>
      [account.display_name, account.email, account.login_identifier, account.primary_role]
        .some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [accounts, userSearch]);

  async function runAction(key: string, action: () => Promise<void>, successKey: EnKey) {
    if (busyKey) return;
    setBusyKey(key);
    setError("");
    try {
      await action();
      showToast(t(lang, successKey));
      await load();
    } catch (err) {
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

  const updateReport = (reportId: string, status: string) =>
    runAction(
      `report-${reportId}-${status}`,
      () =>
        adminFetch(`/reports/${reportId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      "admin.toast.updated",
    );

  const forceResolveDeal = (
    postId: string,
    resolution: "force-complete" | "force-cancel",
  ) =>
    runAction(
      `deal-${postId}-${resolution}`,
      () =>
        adminFetch(`/posts/${postId}/deal/${resolution}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
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
          }),
        }),
      "admin.toast.updated",
    );

  const updateDetailSubmission = (
    submissionId: string,
    status: "approved" | "rejected",
    extras?: { rejectionReason?: string; adminNote?: string },
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
      | { kind: "detail"; submissionId: string },
  ) => {
    setRejectTarget(target);
    setRejectReason("");
    setRejectAction("");
    setRejectNote("");
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
    const target = rejectTarget;
    setRejectTarget(null);
    const extras = {
      rejectionReason: reason,
      adminAction: rejectAction.trim() || undefined,
      adminNote: rejectNote.trim() || undefined,
    };
    if (target.kind === "listing") {
      await updatePost(target.postId, "archived", extras);
      return;
    }
    if (target.kind === "detail") {
      await updateDetailSubmission(target.submissionId, "rejected", extras);
      return;
    }
    await updateBreeder(target.userId, "rejected", extras);
  };

  const updateAccountRole = (userId: string, primaryRole: string) =>
    runAction(
      `account-${userId}-${primaryRole}`,
      () =>
        adminFetch(`/accounts/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ primaryRole }),
        }),
      "admin.toast.updated",
    );

  const createAccount = () =>
    runAction(
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

  const toggleFlag = (key: FeatureKey, enabled: boolean) => {
    if (
      !enabled &&
      PET_FEED_TAB_KEYS.includes(key) &&
      flags[key] !== false &&
      PET_FEED_TAB_KEYS.filter((k) => flags[k] !== false).length <= 1
    ) {
      window.alert(t(lang, "admin.features.lastTab"));
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
        if (res.data && typeof res.data === "object") {
          setFlags({ ...DEFAULT_FLAGS, ...res.data });
        }
      },
      "admin.toast.updated",
    );
  };

  const publishNews = () => {
    if (!newsTitle.trim()) {
      setError(t(lang, "admin.news.errorTitle"));
      return;
    }
    if (!newsBody.trim()) {
      setError(t(lang, "admin.news.errorBody"));
      return;
    }
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
            ctaUrl: newsCtaUrl.trim() || undefined,
          }),
        );
        newsPhotos.slice(0, 6).forEach((file, i) => {
          formData.append("photos", file, file.name || `photo-${i}.jpg`);
        });
        await adminFetch("/announcements", { method: "POST", body: formData });
        setNewsTitle("");
        setNewsBody("");
        setNewsCategory("general");
        setNewsCtaLabel("");
        setNewsCtaUrl("");
        setNewsPhotos([]);
      },
      "admin.toast.published",
    );
  };

  const verificationLabel = (status?: string) => {
    const key = `admin.verification.${status || "unverified"}` as EnKey;
    return t(lang, key);
  };

  const reportStatusLabel = (status?: string) => {
    if (status === "reviewed") return t(lang, "admin.reports.reviewed");
    if (status === "dismissed") return t(lang, "admin.reports.dismissed");
    return t(lang, "admin.reports.open");
  };

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
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          <ActionButton
            label={t(lang, "admin.details.approve")}
            variant="success"
            disabled={busyKey !== null}
            onClick={() => void updateDetailSubmission(item.detail!.id, "approved")}
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
      item.type === "appeal"
      && item.appeal?.id
      && (item.appeal.status === "appealed" || item.appeal.status === "pending_breeder_action")
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
      const linkedPost =
        item.report.post_id
          ? posts.find((p) => p.id === item.report!.post_id)
          : undefined;
      const showForce = canAdminForceResolveDeal({
        reportReason: item.report.reason,
        reportStatus: item.report.status,
        linkedPostStatus: linkedPost?.status,
      });
      return (
        <div className="flex flex-wrap gap-2 mt-3">
          {showForce && linkedPost ? (
            <>
              <ActionButton
                label={t(lang, "admin.reports.forceComplete")}
                variant="success"
                disabled={busyKey !== null}
                onClick={() => {
                  if (!window.confirm(t(lang, "admin.reports.confirmForceComplete"))) {
                    return;
                  }
                  void forceResolveDeal(linkedPost.id, "force-complete");
                }}
              />
              <ActionButton
                label={t(lang, "admin.reports.forceCancel")}
                variant="danger"
                disabled={busyKey !== null}
                onClick={() => {
                  if (!window.confirm(t(lang, "admin.reports.confirmForceCancel"))) {
                    return;
                  }
                  void forceResolveDeal(linkedPost.id, "force-cancel");
                }}
              />
            </>
          ) : null}
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
            onClick={() => void updateReport(item.report!.id, "dismissed")}
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
          <div>
            <div className="flex items-center justify-between gap-3 mb-6">
              <h1 className="text-xl font-bold text-[#2B1E19]">
                {t(lang, "admin.home.title")}
              </h1>
              <ActionButton
                label={t(lang, "admin.refresh")}
                variant="ghost"
                onClick={() => void load()}
              />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  label: t(lang, "admin.home.metric.requests"),
                  value: pendingRequestCount,
                  action: () => setSection("requests"),
                },
                {
                  label: t(lang, "admin.home.metric.listings"),
                  value: pendingPosts.length,
                  action: () => setSection("listings"),
                },
                {
                  label: t(lang, "admin.home.metric.breeders"),
                  value: pendingBreeders.length,
                  action: () => setSection("breeders"),
                },
                {
                  label: t(lang, "admin.home.metric.reports"),
                  value: openReports.length,
                  action: () => setSection("reports"),
                },
                {
                  label: t(lang, "admin.home.metric.users"),
                  value: accounts.length,
                  action: () => setSection("users"),
                },
                {
                  label: t(lang, "admin.home.metric.verified"),
                  value: verifiedBreeders.length,
                  action: () => setSection("breeders"),
                },
              ].map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={m.action}
                  className="bg-white rounded-2xl border border-[#E8DFD0] p-5 text-left hover:border-[#D97706]/40 hover:shadow-sm transition-all"
                >
                  <p className="text-3xl font-bold mb-1 text-[#D97706]">{m.value}</p>
                  <p className="text-xs text-[#8B7355] font-medium">{m.label}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case "requests":
        return (
          <div>
            <h1 className="text-xl font-bold text-[#2B1E19] mb-4">
              {t(lang, "admin.requests.title")}
            </h1>
            <div className="mb-4 rounded-2xl border border-[#E8DFD0] bg-white p-4">
              <p className="text-sm font-bold text-[#2B1E19] mb-3">
                {t(lang, "admin.filters")}
              </p>
              <div className="flex flex-wrap gap-3">
                <FilterSelect
                  label={t(lang, "admin.filter.type")}
                  value={requestType}
                  onChange={(v) => setRequestType(v as RequestType)}
                  options={[
                    { value: "all", label: t(lang, "admin.filter.all") },
                    { value: "breeder", label: t(lang, "admin.requests.type.breeder") },
                    { value: "detail", label: t(lang, "admin.requests.type.detail") },
                    { value: "appeal", label: t(lang, "admin.requests.type.appeal") },
                    { value: "post", label: t(lang, "admin.requests.type.post") },
                    { value: "report", label: t(lang, "admin.requests.type.report") },
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
                const rawId =
                  item.type === "breeder"
                    ? item.profile?.id
                    : item.type === "post"
                      ? item.post?.id
                      : item.type === "detail"
                        ? item.detail?.id
                        : item.type === "appeal"
                          ? item.appeal?.id
                      : item.report?.id;
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
                      label={t(lang, `admin.requests.type.${item.type}` as EnKey)}
                    />
                    <StatusChip
                      status={item.status}
                      label={
                        item.type === "breeder"
                          ? verificationLabel(item.status)
                          : item.type === "report"
                            ? reportStatusLabel(item.status)
                            : item.type === "detail"
                              ? item.status
                            : item.status
                      }
                    />
                    <span className="text-xs text-[#B8A990]">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-[#2B1E19]">{item.title}</p>
                  <p className="text-xs text-[#8B7355] mt-0.5">{item.subtitle}</p>
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
                    <AdminBreederDetailSubmissionReview lang={lang} submission={item.detail} />
                  ) : null}
                  {renderRequestActions(item)}
                </div>
                );
              })}
              {filteredRequests.length === 0 && (
                <p className="text-sm text-[#8B7355]">{t(lang, "admin.requests.empty")}</p>
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
              </h1>
              <FilterSelect
                label={t(lang, "admin.filter.status")}
                value={listingStatusFilter}
                onChange={setListingStatusFilter}
                options={[
                  { value: "all", label: t(lang, "admin.filter.all") },
                  { value: "pending_review", label: t(lang, "admin.requests.status.waiting") },
                  { value: "published", label: t(lang, "admin.requests.status.approved") },
                  { value: "archived", label: t(lang, "admin.listings.archive") },
                ]}
              />
            </div>
            <div className="space-y-3">
              {filteredListings.map((p) => {
                const reviewKey = `listing-${p.id}`;
                const detailsOpen = expandedReviewId === reviewKey;
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
                        <StatusChip status={p.status || "pending_review"} />
                        <span className="text-xs text-[#B8A990]">
                          {formatDate(p.created_at)}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-[#2B1E19]">{p.title}</p>
                      <p className="text-xs text-[#8B7355]">
                        {[p.breeder_profile?.display_name, p.species, p.breed, p.price_note]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
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
                              onClick={() => void updatePost(p.id, "archived")}
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
            <h1 className="text-xl font-bold text-[#2B1E19] mb-4">
              {t(lang, "admin.breeders.title")}
            </h1>
            <div className="mb-4 rounded-2xl border border-[#E8DFD0] bg-white p-4">
              <div className="flex flex-wrap gap-3">
                <FilterSelect
                  label={t(lang, "admin.filter.status")}
                  value={breederStatusFilter}
                  onChange={(v) => setBreederStatusFilter(v as BreederGroup)}
                  options={[
                    { value: "all", label: t(lang, "admin.filter.all") },
                    { value: "waiting", label: t(lang, "admin.breeders.status.waiting") },
                    { value: "active", label: t(lang, "admin.breeders.status.active") },
                    { value: "inactive", label: t(lang, "admin.breeders.status.inactive") },
                  ]}
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
                return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-[#E8DFD0] p-5"
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <StatusChip
                          status={b.verification_status || "unverified"}
                          label={verificationLabel(b.verification_status)}
                        />
                        <span className="text-xs text-[#B8A990]">
                          {formatDate(b.created_at)}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-[#2B1E19]">
                        {b.display_name || "—"}
                      </p>
                      <p className="text-xs text-[#8B7355]">
                        {[b.location, (b.primary_species || []).join(", ")]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
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
                    </div>
                    {b.user_id ? (
                      <div className="flex flex-wrap gap-2">
                        {b.verification_status === "pending_review" ||
                        b.verification_status === "unverified" ||
                        b.verification_status === "rejected" ||
                        b.verification_status === "suspended" ? (
                          <ActionButton
                            label={t(lang, "admin.breeders.verify")}
                            variant="success"
                            disabled={busyKey !== null}
                            onClick={() => void updateBreeder(b.user_id!, "verified")}
                          />
                        ) : null}
                        {b.verification_status === "pending_review" ? (
                          <ActionButton
                            label={t(lang, "admin.breeders.reject")}
                            variant="ghost"
                            disabled={busyKey !== null}
                            onClick={() => openRejectModal({ kind: "breeder", userId: b.user_id! })}
                          />
                        ) : null}
                        {b.verification_status === "verified" ? (
                          <ActionButton
                            label={t(lang, "admin.breeders.suspend")}
                            variant="danger"
                            disabled={busyKey !== null}
                            onClick={() => {
                              if (!window.confirm(t(lang, "admin.breeders.confirmSuspend"))) return;
                              void updateBreeder(b.user_id!, "suspended");
                            }}
                          />
                        ) : null}
                      </div>
                    ) : null}
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
              </h1>
              <FilterSelect
                label={t(lang, "admin.filter.status")}
                value={reportStatusFilter}
                onChange={setReportStatusFilter}
                options={[
                  { value: "all", label: t(lang, "admin.filter.all") },
                  { value: "open", label: t(lang, "admin.reports.open") },
                  { value: "reviewed", label: t(lang, "admin.reports.reviewed") },
                  { value: "dismissed", label: t(lang, "admin.reports.dismissed") },
                ]}
              />
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
                      <span className="text-xs text-[#B8A990]">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#2B1E19]">{r.reason}</p>
                    <p className="text-xs text-[#8B7355] mt-1">
                      {r.target_type === "breeder_profile" || r.breeder_profile_id
                        ? `${t(lang, "admin.requests.type.breeder")}: ${
                            r.breeder_profile?.display_name || r.breeder_profile_id
                          }`
                        : r.post_id
                          ? `${t(lang, "admin.requests.type.post")}: ${
                              linkedPost?.title || r.post_id
                            }`
                          : null}
                    </p>
                    {r.note && !detailsOpen ? (
                      <p className="text-xs text-[#5C4A3A] mt-2">{r.note}</p>
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
                        {canAdminForceResolveDeal({
                          reportReason: r.reason,
                          reportStatus: r.status,
                          linkedPostStatus: linkedPost?.status,
                        }) && linkedPost ? (
                          <>
                            <ActionButton
                              label={t(lang, "admin.reports.forceComplete")}
                              variant="success"
                              disabled={busyKey !== null}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    t(lang, "admin.reports.confirmForceComplete"),
                                  )
                                ) {
                                  return;
                                }
                                void forceResolveDeal(linkedPost.id, "force-complete");
                              }}
                            />
                            <ActionButton
                              label={t(lang, "admin.reports.forceCancel")}
                              variant="danger"
                              disabled={busyKey !== null}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    t(lang, "admin.reports.confirmForceCancel"),
                                  )
                                ) {
                                  return;
                                }
                                void forceResolveDeal(linkedPost.id, "force-cancel");
                              }}
                            />
                          </>
                        ) : null}
                        <ActionButton
                          label={t(lang, "admin.reports.markReviewed")}
                          variant="danger"
                          disabled={busyKey !== null}
                          onClick={() => {
                            if (!window.confirm(t(lang, "admin.reports.confirmViolation"))) return;
                            void updateReport(r.id, "reviewed");
                          }}
                        />
                        <ActionButton
                          label={t(lang, "admin.reports.dismiss")}
                          variant="ghost"
                          disabled={busyKey !== null}
                          onClick={() => void updateReport(r.id, "dismissed")}
                        />
                        {linkedPost && linkedPost.status !== "archived" ? (
                          <ActionButton
                            label={t(lang, "admin.reports.archivePost")}
                            variant="ghost"
                            disabled={busyKey !== null}
                            onClick={() => void updatePost(linkedPost.id, "archived")}
                          />
                        ) : null}
                        {linkedBreederUserId ? (
                          <ActionButton
                            label={t(lang, "admin.reports.suspendBreeder")}
                            variant="danger"
                            disabled={busyKey !== null}
                            onClick={() => {
                              if (!window.confirm(t(lang, "admin.breeders.confirmSuspend"))) return;
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
            <h1 className="text-xl font-bold text-[#2B1E19] mb-4">
              {t(lang, "admin.users.title")}
            </h1>
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
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t(lang, "admin.users.password")}
                  className="rounded-xl border border-[#E8DFD0] px-3 py-2 text-sm outline-none focus:border-[#D97706]"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as (typeof ROLES)[number])}
                  className="appearance-none rounded-xl border border-[#E8DFD0] pl-3 pr-10 py-2 text-sm outline-none focus:border-[#D97706]"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <ActionButton
                label={t(lang, "admin.users.create")}
                disabled={busyKey !== null || !newEmail.trim() || !newPassword}
                onClick={() => void createAccount()}
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
                const userId = u.user_id || u.id;
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
                    </div>
                    {userId ? (
                      <label className="flex items-center gap-2 text-xs text-[#8B7355]">
                        {t(lang, "admin.users.changeRole")}
                        <select
                          value={u.primary_role || "sen"}
                          disabled={busyKey !== null}
                          onChange={(e) => void updateAccountRole(userId, e.target.value)}
                          className="appearance-none rounded-lg border border-[#E8DFD0] pl-2 pr-8 py-1 text-xs text-[#2B1E19]"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        {u.primary_role || "sen"}
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
          const key = `admin.history.action.${action}` as EnKey;
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
        const summarizeChange = (log: ActionLogRow) => {
          const before = log.before_state || {};
          const after = log.after_state || {};
          const action = log.action || "";
          if (action.startsWith("account.")) {
            const beforeRole = String(before.primary_role || "");
            const afterRole = String(after.primary_role || "");
            const name = String(after.display_name || before.display_name || "");
            if (beforeRole || afterRole) {
              return `${name ? `${name} · ` : ""}${beforeRole || "—"} → ${afterRole || "—"}`;
            }
            return name || log.target_id || "—";
          }
          if (action === "feature_flags.update") {
            const keys = Array.isArray(log.metadata?.changed_keys)
              ? (log.metadata?.changed_keys as string[])
              : [];
            return keys.length ? keys.join(", ") : "feature_flags";
          }
          if (action.startsWith("announcement.")) {
            return String(after.title || before.title || log.target_id || "—");
          }
          const beforeStatus = String(before.verification_status || before.status || "");
          const afterStatus = String(after.verification_status || after.status || "");
          if (beforeStatus || afterStatus) {
            return `${beforeStatus || "—"} → ${afterStatus || "—"}`;
          }
          const title = String(after.title || before.title || "");
          return title || log.target_id || "—";
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
                onChange={(value) =>
                  setHistoryActionFilter(value as (typeof HISTORY_ACTION_FILTERS)[number])
                }
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
                const reason =
                  typeof log.metadata?.rejection_reason === "string"
                    ? log.metadata.rejection_reason
                    : "";
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
                            {summarizeChange(log)}
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
                          <span className="font-semibold">{t(lang, "admin.history.target")}: </span>
                          {log.target_type}
                          {log.target_id ? ` / ${log.target_id}` : ""}
                        </p>
                        {log.target_user_id ? (
                          <p>
                            <span className="font-semibold">{t(lang, "admin.history.targetUser")}: </span>
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

      case "features":
        return (
          <div>
            <h1 className="text-xl font-bold text-[#2B1E19] mb-2">
              {t(lang, "admin.features.title")}
            </h1>
            <p className="text-sm text-[#8B7355] mb-4">
              {t(lang, "admin.features.subtitle")}
            </p>
            <div className="mb-4 rounded-2xl border border-[#E8DFD0] bg-[#FFF8ED] px-4 py-3 text-sm text-[#5C4A3A]">
              {t(lang, "admin.features.note")}
            </div>
            <div className="space-y-2 mb-6">
              {FEATURE_CORE.map((key) => {
                const enabled = flags[key] !== false;
                return (
                  <div
                    key={key}
                    className="bg-white rounded-2xl border border-[#E8DFD0] px-5 py-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#2B1E19]">
                        {t(lang, `admin.features.${key}.title` as EnKey)}
                      </p>
                      <p className="text-xs text-[#8B7355]">
                        {t(lang, `admin.features.${key}.desc` as EnKey)}
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
                      disabled={busyKey !== null}
                      onClick={() => toggleFlag(key, !enabled)}
                      className={`relative h-7 w-12 rounded-full transition-colors ${
                        enabled ? "bg-[#D97706]" : "bg-slate-300"
                      }`}
                      aria-pressed={enabled}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                          enabled ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            <h2 className="text-base font-bold text-[#2B1E19] mb-1">
              {t(lang, "admin.features.petFeedTitle")}
            </h2>
            <p className="text-sm text-[#8B7355] mb-3">
              {t(lang, "admin.features.petFeedSubtitle")}
            </p>
            <div className="space-y-2">
              {PET_FEED_TAB_KEYS.map((key) => {
                const enabled = flags[key] !== false;
                return (
                  <div
                    key={key}
                    className="bg-white rounded-2xl border border-[#E8DFD0] px-5 py-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#2B1E19]">
                        {t(lang, `admin.features.${key}.title` as EnKey)}
                      </p>
                      <p className="text-xs text-[#8B7355]">
                        {t(lang, `admin.features.${key}.desc` as EnKey)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => toggleFlag(key, !enabled)}
                      className={`relative h-7 w-12 rounded-full transition-colors ${
                        enabled ? "bg-[#D97706]" : "bg-slate-300"
                      }`}
                      aria-pressed={enabled}
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                          enabled ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "news":
        return (
          <div>
            <h1 className="text-xl font-bold text-[#2B1E19] mb-2">
              {t(lang, "admin.news.title")}
            </h1>
            <p className="text-sm text-[#8B7355] mb-4">{t(lang, "admin.news.note")}</p>
            <div className="bg-white rounded-2xl border border-[#E8DFD0] p-5 space-y-4 max-w-xl">
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
                  {(
                    [
                      "app_update",
                      "health_tip",
                      "community",
                      "general",
                    ] as AnnouncementCategory[]
                  ).map((cat) => (
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
              <label className="block">
                <span className="text-xs font-semibold text-[#8B7355]">
                  {t(lang, "admin.news.photos")}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) =>
                    setNewsPhotos(Array.from(e.target.files || []).slice(0, 6))
                  }
                  className="mt-1 block w-full text-sm text-[#5C4A3A]"
                />
              </label>
              <ActionButton
                label={t(lang, "admin.news.publish")}
                disabled={busyKey !== null}
                onClick={publishNews}
              />
            </div>
          </div>
        );

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
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                  section === item.key
                    ? "bg-[#FFF1DE] text-[#B45309]"
                    : "text-[#5C4A3A] hover:bg-[#FDF8F0] hover:text-[#2B1E19]"
                }`}
              >
                <span className="w-5 text-center text-[#D97706]">{item.icon}</span>
                {t(lang, item.labelKey)}
              </button>
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
              {t(lang, navItems.find((n) => n.key === section)?.labelKey || "admin.console")}
            </p>
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="text-[#8B7355]"
            >
              ☰
            </button>
          </div>
          {mobileNavOpen && (
            <div className="grid grid-cols-4 gap-1 pt-2 pb-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSection(item.key);
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
                </button>
              ))}
            </div>
          )}
        </div>

        <main className="flex-1 p-5 lg:p-8 overflow-y-auto">
          {error ? (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {renderSection()}
        </main>
      </div>
      {rejectTarget ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2B1E19]/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E8DFD0] bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-[#2B1E19]">
              {t(
                lang,
                rejectTarget.kind === "listing"
                  ? "admin.listings.rejectTitle"
                  : "admin.breeders.rejectTitle",
              )}
            </h3>
            <p className="mt-1 text-xs text-[#8B7355]">
              {t(
                lang,
                rejectTarget.kind === "listing"
                  ? "admin.listings.rejectHint"
                  : "admin.breeders.rejectHint",
              )}
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
            {rejectError ? (
              <p className="mt-2 text-xs font-medium text-red-600">{rejectError}</p>
            ) : null}
            <div className="mt-4 flex gap-2">
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
                {t(
                  lang,
                  rejectTarget.kind === "listing"
                    ? "admin.listings.reject"
                    : "admin.breeders.reject",
                )}
              </button>
            </div>
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
