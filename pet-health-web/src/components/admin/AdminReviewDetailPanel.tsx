"use client";

import Link from "next/link";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import {
  adminBreederSpecRows,
  adminListingContactEntries,
  adminListingMediaUrls,
  adminListingSpecRows,
  dealDisputeFromPost,
  healthEvidenceUrlsFromMetadata,
  isDealDisputeReport,
  type AdminReviewBreeder,
  type AdminReviewPost,
  type AdminReviewReport,
} from "@/lib/admin/reviewDetail";
import type { BreederProfileSubmission } from "@/lib/breederProfileSubmissions";

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
  const media = adminListingMediaUrls(post);
  const video = String(post.video_url || "").trim();
  const evidence = healthEvidenceUrlsFromMetadata(post.metadata);
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

      {(media.length > 0 || video) && (
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
            {video ? (
              <div className="relative h-28 w-44 overflow-hidden rounded-xl border border-[#E8DFD0] bg-black">
                <video
                  src={video}
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

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      <div className="flex items-start gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
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
              href={`/app/breeders/${encodeURIComponent(profile.id)}`}
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

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      <Section title={t(lang, "admin.review.reportTarget")}>
        <p className="text-sm text-[#5C4A3A]">
          <span className="font-semibold text-[#2B1E19]">
            {report.target_type || "report"}:{" "}
          </span>
          {targetLabel}
        </p>
        {isDealDisputeReport(report.reason) ? (
          <p className="mt-2 text-xs font-semibold text-[#B45309]">
            {t(lang, "admin.review.dealDispute")}
            {dealDispute?.dealStatus ? ` · ${dealDispute.dealStatus}` : ""}
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

      {dealDispute && dealDispute.evidenceUrls.length > 0 ? (
        <Section title={t(lang, "admin.review.dealDisputeEvidence")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dealDispute.evidenceUrls.map((url) => (
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

      {dealDispute && dealDispute.handoffPhotos.length > 0 ? (
        <Section title={t(lang, "admin.review.dealHandoffPhotos")}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dealDispute.handoffPhotos.map((url) => (
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
  const isVideo = submission.submission_type === "facility_video";
  const breederName =
    submission.breeder_profile?.display_name ||
    submission.breeder_profile?.id ||
    "—";

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-[#E8DFD0] bg-[#FDFBF7] p-4">
      <Section title={t(lang, "admin.review.detailBreeder")}>
        <p className="text-sm text-[#5C4A3A]">{breederName}</p>
      </Section>
      <Section title={t(lang, "admin.review.detailType")}>
        <Chip>{submission.submission_type}</Chip>
      </Section>
      {url ? (
        <Section title={t(lang, "admin.review.detailUrl")}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#B45309] break-all hover:underline"
          >
            {url}
          </a>
          {isVideo ? (
            <video
              src={url}
              controls
              className="mt-3 w-full max-h-64 rounded-xl bg-black/5"
            />
          ) : /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="mt-3 max-h-64 rounded-xl object-contain bg-white" />
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
    </div>
  );
}
