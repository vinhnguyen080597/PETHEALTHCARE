"use client";

import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import {
  adminBreederSpecRows,
  adminListingContactEntries,
  adminListingMediaUrls,
  adminListingSpecRows,
  breederPublicHref,
  dealDisputeFromPost,
  healthEvidenceUrlsFromMetadata,
  isDealDisputeReport,
  isOpenDealDisputeOnHold,
  type AdminReviewBreeder,
  type AdminReviewPost,
  type AdminReviewReport,
} from "@/lib/admin/reviewDetail";
import { listingPublicHref } from "@/lib/admin/listingReject";
import {
  appealStatusLabelKey,
  farmReviewKindI18nKey,
  isSafeHttpUrl,
  submissionPayloadHref,
  supportFeedbackCategoryLabelKey,
  supportScamTargetLabelKey,
} from "@/lib/admin/requestQueue";
import { farmReviewStarLabel, farmReviewUpdateApproveBlocked } from "@/lib/breederFarmReviews";
import { breederSubmissionTypeLabel } from "@/lib/breederProfileSubmissions";
import { reportReasonLabelKey, reportTargetHref } from "@/lib/admin/reportDisplay";
import type { BreederProfileSubmission } from "@/lib/breederProfileSubmissions";
import type { TransparencyWarning } from "@/lib/transparencyWarnings";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FDF8F0] border border-[#E8DFD0] text-[#5C4A3A]">
      {children}
    </span>
  );
}

function SpecGrid({
  lang,
  rows,
}: {
  lang: Lang;
  rows: Array<{ id: string; labelKey: string; value: string }>;
}) {
  if (!rows.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-xl border border-[#E8DFD0] bg-[#FDFBF7] px-3 py-2"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8B7355]">
            {t(lang, row.labelKey as EnKey)}
          </p>
          <p className="mt-0.5 text-sm font-medium text-[#2B1E19] break-words">
            {row.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8B7355]">
        {title}
      </p>
      {children}
    </div>
  );
}

export function AdminListingReviewDetail({
  lang,
  post,
}: {
  lang: Lang;
  post: AdminReviewPost;
}) {
  const specs = adminListingSpecRows(post);
  const media = adminListingMediaUrls(post).filter(isSafeHttpUrl);
  const video = String(post.video_url || "").trim();
  const videoSafe = isSafeHttpUrl(video) ? video : "";
  const evidence = healthEvidenceUrlsFromMetadata(post.metadata).filter(isSafeHttpUrl);
  const personality = (post.personality || []).filter(Boolean);
  const paperwork = (post.paperwork || []).filter(Boolean);
  const contact = adminListingContactEntries(post.contact);
  const warrantyTitle = post.warranty_policy?.title?.trim() || "";
  const breederName = post.breeder_profile?.display_name?.trim() || "";
  const breederId = post.breeder_profile?.id || post.breeder_profile_id || "";

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      <SpecGrid lang={lang} rows={specs} />

      {post.description?.trim() ? (
        <Section title={t(lang, "admin.review.description")}>
          <p className="text-sm text-[#5C4A3A] whitespace-pre-wrap">
            {post.description.trim()}
          </p>
        </Section>
      ) : null}

      {personality.length > 0 ? (
        <Section title={t(lang, "admin.review.personality")}>
          <div className="flex flex-wrap gap-1.5">
            {personality.map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </div>
        </Section>
      ) : null}

      {paperwork.length > 0 ? (
        <Section title={t(lang, "admin.review.paperwork")}>
          <div className="flex flex-wrap gap-1.5">
            {paperwork.map((item) => (
              <Chip key={item}>{item}</Chip>
            ))}
          </div>
        </Section>
      ) : null}

      {(media.length > 0 || videoSafe) && (
        <Section title={t(lang, "admin.review.media")}>
          <div className="flex flex-wrap gap-2">
            {media.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block h-20 w-20 overflow-hidden rounded-xl border border-[#E8DFD0] bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
            {videoSafe ? (
              <div className="relative h-28 w-44 overflow-hidden rounded-xl border border-[#E8DFD0] bg-black">
                <video
                  src={videoSafe}
                  className="h-full w-full object-contain"
                  controls
                  playsInline
                  preload="metadata"
                />
                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  {t(lang, "admin.review.video")}
                </span>
              </div>
            ) : null}
          </div>
        </Section>
      )}

      {evidence.length > 0 ? (
        <Section title={t(lang, "admin.listings.healthEvidence")}>
          <div className="flex flex-wrap gap-2">
            {evidence.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block h-20 w-20 overflow-hidden rounded-xl border border-amber-200 bg-amber-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </Section>
      ) : null}

      {contact.length > 0 ? (
        <Section title={t(lang, "admin.review.contact")}>
          <div className="space-y-1">
            {contact.map((item) => (
              <p key={item.key} className="text-sm text-[#5C4A3A]">
                <span className="font-semibold text-[#2B1E19]">{item.key}: </span>
                {item.value}
              </p>
            ))}
          </div>
        </Section>
      ) : null}

      {warrantyTitle ? (
        <Section title={t(lang, "admin.review.warranty")}>
          <p className="text-sm font-medium text-[#2B1E19]">{warrantyTitle}</p>
        </Section>
      ) : null}

      {breederName || breederId ? (
        <Section title={t(lang, "admin.review.breeder")}>
          {breederId ? (
            <Link
              href={`/app/breeders/${encodeURIComponent(breederId)}`}
              className="text-sm font-semibold text-[#B45309] hover:underline"
            >
              {breederName || breederId}
            </Link>
          ) : (
            <p className="text-sm text-[#5C4A3A]">{breederName}</p>
          )}
        </Section>
      ) : null}
    </div>
  );
}

export function AdminBreederReviewDetail({
  lang,
  profile,
}: {
  lang: Lang;
  profile: AdminReviewBreeder;
}) {
  const specs = adminBreederSpecRows(profile);
  const contact = adminListingContactEntries(profile.contact);
  const policies = (profile.warranty_policies || []).filter((p) => p?.title);
  const avatar = String(profile.avatar_url || "").trim();
  const avatarSafe = isSafeHttpUrl(avatar) ? avatar : "";

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      <div className="flex items-start gap-3">
        {avatarSafe ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSafe}
            alt=""
            className="h-14 w-14 rounded-full object-cover border border-[#E8DFD0]"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-[#F3EDE3] border border-[#E8DFD0]" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sm text-[#2B1E19]">
            {profile.display_name || "—"}
          </p>
          {profile.id ? (
            <Link
              href={breederPublicHref(profile.id)}
              className="text-xs font-semibold text-[#B45309] hover:underline"
            >
              {t(lang, "admin.review.breeder")}
            </Link>
          ) : null}
        </div>
      </div>

      <SpecGrid lang={lang} rows={specs} />

      {profile.bio?.trim() ? (
        <Section title={t(lang, "admin.review.bio")}>
          <p className="text-sm text-[#5C4A3A] whitespace-pre-wrap">
            {profile.bio.trim()}
          </p>
        </Section>
      ) : null}

      {contact.length > 0 ? (
        <Section title={t(lang, "admin.review.contact")}>
          <div className="space-y-1">
            {contact.map((item) => (
              <p key={item.key} className="text-sm text-[#5C4A3A]">
                <span className="font-semibold text-[#2B1E19]">{item.key}: </span>
                {item.value}
              </p>
            ))}
          </div>
        </Section>
      ) : null}

      {policies.length > 0 ? (
        <Section title={t(lang, "admin.review.warranty")}>
          <div className="flex flex-wrap gap-1.5">
            {policies.map((policy) => (
              <Chip key={policy.id || policy.title}>{policy.title}</Chip>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

export function AdminReportReviewDetail({
  lang,
  report,
  linkedPost,
  linkedProfile,
}: {
  lang: Lang;
  report: AdminReviewReport;
  linkedPost?: AdminReviewPost | null;
  linkedProfile?: AdminReviewBreeder | null;
}) {
  const targetLabel = report.breeder_profile?.display_name
    || linkedProfile?.display_name
    || linkedPost?.title
    || report.post_id
    || report.breeder_profile_id
    || report.comment_id
    || "—";
  const dealDispute = isDealDisputeReport(report.reason)
    ? dealDisputeFromPost(linkedPost)
    : null;
  const reasonKey = reportReasonLabelKey(report.reason);
  const reasonLabel = reasonKey
    ? t(lang, reasonKey as EnKey)
    : String(report.reason || "").trim() || t(lang, "admin.requests.type.report");
  const targetHref = reportTargetHref({
    post_id: report.post_id || linkedPost?.id,
    breeder_profile_id: report.breeder_profile_id || linkedProfile?.id,
    breeder_profile: report.breeder_profile,
  });
  const evidenceUrls = (dealDispute?.evidenceUrls || []).filter(isSafeHttpUrl);
  const handoffPhotos = (dealDispute?.handoffPhotos || []).filter(isSafeHttpUrl);

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      <Section title={t(lang, "admin.review.reportTarget")}>
        <p className="text-sm text-[#5C4A3A]">
          <span className="font-semibold text-[#2B1E19]">
            {reasonLabel}
            {": "}
          </span>
          {targetHref ? (
            <Link
              href={targetHref}
              className="font-semibold text-[#B45309] hover:underline"
            >
              {targetLabel}
            </Link>
          ) : (
            targetLabel
          )}
        </p>
        {isDealDisputeReport(report.reason) ? (
          <p className="mt-2 text-xs font-semibold text-[#B45309]">
            {t(lang, "admin.review.dealDispute")}
            {dealDispute?.dealStatus ? ` · ${dealDispute.dealStatus}` : ""}
          </p>
        ) : null}
        {isOpenDealDisputeOnHold({
          reportReason: report.reason,
          reportStatus: report.status,
          linkedPostStatus: linkedPost?.status,
        }) ? (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {t(lang, "admin.reports.forceResolveUnavailable")}
          </p>
        ) : null}
      </Section>

      {report.note?.trim() ? (
        <Section title={t(lang, "admin.review.reportNote")}>
          <p className="text-sm text-[#5C4A3A] whitespace-pre-wrap">
            {report.note.trim()}
          </p>
        </Section>
      ) : null}

      {dealDispute?.message ? (
        <Section title={t(lang, "admin.review.dealDisputeMessage")}>
          <p className="text-sm text-[#5C4A3A] whitespace-pre-wrap">
            {dealDispute.message}
          </p>
        </Section>
      ) : null}

      {evidenceUrls.length > 0 ? (
        <Section title={t(lang, "admin.review.dealDisputeEvidence")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {evidenceUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="h-28 w-full rounded-xl object-cover bg-[#F3EDE3]"
              />
            ))}
          </div>
        </Section>
      ) : null}

      {handoffPhotos.length > 0 ? (
        <Section title={t(lang, "admin.review.dealHandoffPhotos")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {handoffPhotos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="h-28 w-full rounded-xl object-cover bg-[#F3EDE3]"
              />
            ))}
          </div>
        </Section>
      ) : null}

      {linkedPost ? <AdminListingReviewDetail lang={lang} post={linkedPost} /> : null}
      {linkedProfile && !linkedPost ? (
        <AdminBreederReviewDetail lang={lang} profile={linkedProfile} />
      ) : null}
    </div>
  );
}

export function AdminReviewDetailsToggle({
  lang,
  open,
  onToggle,
}: {
  lang: Lang;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-3 text-xs font-semibold text-[#B45309] hover:underline"
    >
      {open ? t(lang, "admin.review.hideDetails") : t(lang, "admin.review.details")}
    </button>
  );
}

export type AdminReviewBreederDetailSubmission = BreederProfileSubmission;

export function AdminBreederDetailSubmissionReview({
  lang,
  submission,
}: {
  lang: Lang;
  submission: AdminReviewBreederDetailSubmission;
}) {
  const url = submission.payload?.url?.trim() || "";
  const href = submissionPayloadHref(url, submission.submission_type);
  const isVideo = submission.submission_type === "facility_video";
  const farmId = submission.breeder_profile?.id || submission.breeder_profile_id;
  const breederName =
    submission.breeder_profile?.display_name || farmId || "—";

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      <Section title={t(lang, "admin.review.detailBreeder")}>
        {farmId ? (
          <Link
            href={breederPublicHref(farmId)}
            className="text-sm font-semibold text-[#B45309] hover:underline"
          >
            {breederName}
          </Link>
        ) : (
          <p className="text-sm text-[#5C4A3A]">{breederName}</p>
        )}
      </Section>
      <Section title={t(lang, "admin.review.detailType")}>
        <Chip>{breederSubmissionTypeLabel(submission.submission_type, lang)}</Chip>
      </Section>
      {url ? (
        <Section title={t(lang, "admin.review.detailUrl")}>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#B45309] break-all hover:underline"
            >
              {url}
            </a>
          ) : (
            <p className="text-sm text-[#5C4A3A] break-all">{url}</p>
          )}
          {href && isVideo ? (
            <video
              src={href}
              controls
              className="mt-3 w-full max-h-64 rounded-xl bg-black/5"
            />
          ) : null}
          {href && !isVideo && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(href) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={href} alt="" className="mt-3 max-h-64 rounded-xl object-contain bg-white" />
          ) : null}
        </Section>
      ) : null}
      {submission.payload?.note?.trim() ? (
        <Section title={t(lang, "admin.review.reportNote")}>
          <p className="text-sm text-[#5C4A3A] whitespace-pre-wrap">
            {submission.payload.note.trim()}
          </p>
        </Section>
      ) : null}
      {submission.rejection_reason?.trim() ? (
        <Section title={t(lang, "admin.details.rejectTitle")}>
          <p className="text-sm text-red-700 whitespace-pre-wrap">
            {submission.rejection_reason.trim()}
          </p>
        </Section>
      ) : null}
    </div>
  );
}

export type AdminReviewFarmReview = {
  id: string;
  breeder_profile_id: string;
  kind: string;
  parent_status?: string | null;
  post_id?: string | null;
  rating: number;
  body?: string;
  photo_urls?: string[];
  reviewer_display_name?: string | null;
  breeder_profile?: { id?: string; display_name?: string | null } | null;
};

export function AdminFarmReviewDetail({
  lang,
  review,
}: {
  lang: Lang;
  review: AdminReviewFarmReview;
}) {
  const farmId = review.breeder_profile?.id || review.breeder_profile_id;
  const farmName = review.breeder_profile?.display_name || farmId || "—";
  const photos = (review.photo_urls || []).filter(isSafeHttpUrl);
  const stars = farmReviewStarLabel(review.rating);
  const listingId = String(review.post_id || "").trim();

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      <Section title={t(lang, "admin.review.detailBreeder")}>
        {farmId ? (
          <Link
            href={breederPublicHref(farmId)}
            className="text-sm font-semibold text-[#B45309] hover:underline"
          >
            {farmName}
          </Link>
        ) : (
          <p className="text-sm text-[#5C4A3A]">{farmName}</p>
        )}
      </Section>
      <p className="text-sm text-[#5C4A3A]">
        <span className="font-semibold text-[#2B1E19]">
          {t(lang, farmReviewKindI18nKey(review.kind) as EnKey)}
        </span>
        {stars ? ` · ${stars} (${review.rating}/5)` : null}
      </p>
      {review.reviewer_display_name?.trim() ? (
        <p className="text-xs text-[#8B7355]">
          {t(lang, "admin.farmReviews.reviewer")}: {review.reviewer_display_name.trim()}
        </p>
      ) : null}
      {listingId ? (
        <p className="text-xs">
          {t(lang, "admin.farmReviews.saleListing")}:{" "}
          <Link
            href={listingPublicHref(listingId)}
            className="font-semibold text-[#B45309] hover:underline"
          >
            {listingId}
          </Link>
        </p>
      ) : null}
      {farmReviewUpdateApproveBlocked(review) ? (
        <p className="text-xs font-semibold text-amber-800">
          {t(lang, "admin.farmReviews.approveUpdateBlockedBody")}
        </p>
      ) : null}
      {review.body?.trim() ? (
        <p className="text-sm text-[#5C4A3A] whitespace-pre-wrap">{review.body.trim()}</p>
      ) : null}
      {photos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="h-20 w-20 rounded-lg object-cover bg-[#F3EDE3]"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminAppealReviewDetail({
  lang,
  appeal,
}: {
  lang: Lang;
  appeal: TransparencyWarning;
}) {
  const farmId = appeal.breeder_profile?.id || appeal.breeder_profile_id;
  const farmName = appeal.breeder_profile?.display_name || farmId || "—";

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      <Section title={t(lang, "admin.review.detailBreeder")}>
        {farmId ? (
          <Link
            href={breederPublicHref(farmId)}
            className="text-sm font-semibold text-[#B45309] hover:underline"
          >
            {farmName}
          </Link>
        ) : (
          <p className="text-sm text-[#5C4A3A]">{farmName}</p>
        )}
      </Section>
      <p className="text-sm text-[#5C4A3A]">
        <span className="font-semibold text-[#2B1E19]">
          {t(lang, "admin.filter.status")}:{" "}
        </span>
        {t(lang, appealStatusLabelKey(appeal.status) as EnKey)}
      </p>
      <p className="text-sm text-[#5C4A3A]">
        <span className="font-semibold text-[#2B1E19]">
          {t(lang, "admin.appeals.score")}:{" "}
        </span>
        {appeal.score_at_trigger}/100
      </p>
      <p className="text-sm text-[#5C4A3A]">
        <span className="font-semibold text-[#2B1E19]">
          {t(lang, "admin.appeals.penalty")}:{" "}
        </span>
        {appeal.penalty_points_at_trigger}
      </p>
      {appeal.admin_note?.trim() ? (
        <p className="text-sm text-[#5C4A3A] whitespace-pre-wrap">
          {appeal.admin_note.trim()}
        </p>
      ) : null}
    </div>
  );
}

export type AdminReviewSupportTicket = {
  id: string;
  user_id?: string;
  kind: string;
  category?: string | null;
  title?: string | null;
  body?: string;
  scam_target_type?: string | null;
  identifier?: string | null;
  related_url?: string | null;
  anonymous?: boolean;
  evidence_confirmed?: boolean;
  evidence_urls?: string[];
};

function SupportField({
  lang,
  labelKey,
  children,
}: {
  lang: Lang;
  labelKey: EnKey;
  children: React.ReactNode;
}) {
  return (
    <p className="text-sm text-[#5C4A3A]">
      <span className="font-semibold text-[#2B1E19]">{t(lang, labelKey)}: </span>
      {children}
    </p>
  );
}

export function AdminSupportTicketReview({
  lang,
  ticket,
  reporterLabel,
}: {
  lang: Lang;
  ticket: AdminReviewSupportTicket;
  reporterLabel?: string | null;
}) {
  const isFeedback = ticket.kind === "feedback";
  const evidence = (ticket.evidence_urls || []).filter(isSafeHttpUrl);
  const relatedUrl = String(ticket.related_url || "").trim();
  const relatedHref = isSafeHttpUrl(relatedUrl) ? relatedUrl : null;
  const identifier = String(ticket.identifier || "").trim();
  const identifierHref = isSafeHttpUrl(identifier) ? identifier : null;
  const categoryKey = supportFeedbackCategoryLabelKey(ticket.category);
  const targetKey = supportScamTargetLabelKey(ticket.scam_target_type);

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      {isFeedback ? (
        <>
          <SupportField lang={lang} labelKey="admin.support.category">
            {categoryKey
              ? t(lang, categoryKey as EnKey)
              : ticket.category?.trim() || "—"}
          </SupportField>
          <SupportField lang={lang} labelKey="admin.support.title">
            {ticket.title?.trim() || "—"}
          </SupportField>
        </>
      ) : (
        <>
          <SupportField lang={lang} labelKey="admin.support.targetType">
            {targetKey
              ? t(lang, targetKey as EnKey)
              : ticket.scam_target_type?.trim() || "—"}
          </SupportField>
          <SupportField lang={lang} labelKey="admin.support.identifier">
            {identifierHref ? (
              <a
                href={identifierHref}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-[#D97706] underline"
              >
                {identifier}
              </a>
            ) : (
              identifier || "—"
            )}
          </SupportField>
          {relatedUrl ? (
            <SupportField lang={lang} labelKey="admin.support.relatedUrl">
              {relatedHref ? (
                <a
                  href={relatedHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-[#D97706] underline"
                >
                  {relatedUrl}
                </a>
              ) : (
                <span className="break-all">{relatedUrl}</span>
              )}
            </SupportField>
          ) : null}
          <SupportField lang={lang} labelKey="admin.support.anonymous">
            {ticket.anonymous
              ? t(lang, "admin.support.yes")
              : t(lang, "admin.support.no")}
          </SupportField>
          <SupportField lang={lang} labelKey="admin.support.evidenceConfirmed">
            {ticket.evidence_confirmed
              ? t(lang, "admin.support.yes")
              : t(lang, "admin.support.no")}
          </SupportField>
        </>
      )}
      <p className="text-sm text-[#5C4A3A] whitespace-pre-wrap">
        {ticket.body?.trim() || "—"}
      </p>
      {evidence.length > 0 ? (
        <Section title={t(lang, "admin.support.evidence")}>
          <div className="flex flex-wrap gap-2">
            {evidence.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover border border-[#E8DFD0] bg-white"
                />
              </a>
            ))}
          </div>
        </Section>
      ) : null}
      <p className="text-xs text-[#8B7355]">
        {ticket.anonymous
          ? t(lang, "admin.support.reporterHidden")
          : `${t(lang, "admin.support.reporter")}: ${reporterLabel?.trim() || ticket.user_id || "—"}`}
      </p>
    </div>
  );
}
