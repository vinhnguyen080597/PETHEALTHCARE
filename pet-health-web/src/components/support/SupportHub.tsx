"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import { loginHref } from "@/lib/loginHref";
import { DealPhotoPicker } from "@/components/marketplace/DealPhotoPicker";
import { dealSubmitErrorMessage } from "@/lib/dealPhotoUpload";
import { dealPhotosDropHint } from "@/lib/listingDealHandoff";
import { uploadDealEvidencePhotos } from "@/lib/uploadDealEvidence";
import {
  FEEDBACK_CATEGORIES,
  GUIDE_TOPICS,
  SCAM_TARGET_TYPES,
  SUPPORT_FEEDBACK_MAX_EVIDENCE,
  SUPPORT_SCAM_MAX_EVIDENCE,
  SUPPORT_SCAM_MIN_EVIDENCE,
  SUPPORT_SECTIONS,
  filterGuideTopics,
  filterSupportSections,
  normalizeLookupQuery,
  parseSupportSection,
  pickSupportSection,
  supportHubLoginNext,
  supportHubPathWithState,
  toSupportBlacklistHit,
  type FeedbackCategory,
  type GuideAudience,
  type ScamTargetType,
  type SupportBlacklistHit,
  type SupportSectionId,
} from "@/lib/supportHub";

function fieldClass() {
  return "w-full rounded-xl border border-[#F3E2C8] bg-white px-3.5 py-2.5 text-sm text-[#2B1E19] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500";
}

function primaryBtnClass() {
  return "inline-flex items-center justify-center rounded-xl bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#B45309] transition-colors disabled:opacity-50";
}

export function SupportHub({
  lang,
  initialSection,
  initialQuery = "",
  isLoggedIn = false,
}: {
  lang: Lang;
  initialSection?: string;
  initialQuery?: string;
  isLoggedIn?: boolean;
}) {
  const resolve = (key: string) => t(lang, key as EnKey);
  const [query, setQuery] = useState(initialQuery);
  const [section, setSection] = useState<SupportSectionId>(() =>
    parseSupportSection(initialSection),
  );
  const [audience, setAudience] = useState<GuideAudience>("buyer");
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);

  const [fbCategory, setFbCategory] = useState<FeedbackCategory>("feature");
  const [fbTitle, setFbTitle] = useState("");
  const [fbBody, setFbBody] = useState("");
  const [fbPhotos, setFbPhotos] = useState<File[]>([]);
  const [fbError, setFbError] = useState("");
  const [fbSuccess, setFbSuccess] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);

  const [blacklistQ, setBlacklistQ] = useState("");
  const [blacklistChecked, setBlacklistChecked] = useState(false);
  const [blacklistBusy, setBlacklistBusy] = useState(false);
  const [blacklistResult, setBlacklistResult] = useState<SupportBlacklistHit | null>(null);
  const [scamType, setScamType] = useState<ScamTargetType>("account");
  const [scamId, setScamId] = useState("");
  const [scamUrl, setScamUrl] = useState("");
  const [scamDetails, setScamDetails] = useState("");
  const [scamAnon, setScamAnon] = useState(false);
  const [scamEvidence, setScamEvidence] = useState(false);
  const [scamPhotos, setScamPhotos] = useState<File[]>([]);
  const [scamError, setScamError] = useState("");
  const [scamSuccess, setScamSuccess] = useState(false);
  const [scamBusy, setScamBusy] = useState(false);

  const matchedSections = useMemo(
    () => filterSupportSections(query, resolve),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve from lang
    [query, lang],
  );

  useEffect(() => {
    setSection((cur) => pickSupportSection(cur, matchedSections));
  }, [matchedSections]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = supportHubPathWithState(query, section);
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === next) return;
    window.history.replaceState({}, "", next);
  }, [query, section]);

  const guides = useMemo(
    () => filterGuideTopics(GUIDE_TOPICS, audience, query, resolve),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve from lang
    [audience, query, lang],
  );

  const loginNext = supportHubLoginNext(section);
  const authHref = loginHref(loginNext);

  async function submitFeedback() {
    if (!isLoggedIn) {
      window.location.href = authHref;
      return;
    }
    if (!fbTitle.trim() || !fbBody.trim()) {
      setFbError(t(lang, "supportHub.feedback.required"));
      return;
    }
    setFbError("");
    setFbSuccess(false);
    setFbBusy(true);
    try {
      const evidenceUrls =
        fbPhotos.length > 0 ? await uploadDealEvidencePhotos(fbPhotos) : [];
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          category: fbCategory,
          title: fbTitle.trim(),
          body: fbBody.trim(),
          evidence_urls: evidenceUrls,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : t(lang, "common.error"),
        );
      }
      setFbTitle("");
      setFbBody("");
      setFbPhotos([]);
      setFbSuccess(true);
    } catch (err) {
      setFbError(
        dealSubmitErrorMessage(err, () => t(lang, "deal.photosTooLarge")) ||
          (err instanceof Error ? err.message : t(lang, "common.error")),
      );
    } finally {
      setFbBusy(false);
    }
  }

  async function submitScam() {
    if (!isLoggedIn) {
      window.location.href = authHref;
      return;
    }
    if (
      !scamId.trim() ||
      !scamDetails.trim() ||
      !scamEvidence ||
      scamPhotos.length < SUPPORT_SCAM_MIN_EVIDENCE
    ) {
      setScamError(t(lang, "supportHub.scam.required"));
      return;
    }
    if (scamPhotos.length > SUPPORT_SCAM_MAX_EVIDENCE) {
      setScamError(t(lang, "supportHub.scam.photosTooMany"));
      return;
    }
    setScamError("");
    setScamSuccess(false);
    setScamBusy(true);
    try {
      const evidenceUrls = await uploadDealEvidencePhotos(scamPhotos);
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "scam",
          scam_target_type: scamType,
          identifier: scamId.trim(),
          related_url: scamUrl.trim() || undefined,
          body: scamDetails.trim(),
          anonymous: scamAnon,
          evidence_confirmed: true,
          evidence_urls: evidenceUrls,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : t(lang, "common.error"),
        );
      }
      setScamId("");
      setScamUrl("");
      setScamDetails("");
      setScamEvidence(false);
      setScamAnon(false);
      setScamPhotos([]);
      setScamSuccess(true);
    } catch (err) {
      setScamError(
        dealSubmitErrorMessage(err, () => t(lang, "deal.photosTooLarge")) ||
          (err instanceof Error ? err.message : t(lang, "common.error")),
      );
    } finally {
      setScamBusy(false);
    }
  }

  async function runBlacklistCheck() {
    setBlacklistChecked(true);
    setBlacklistBusy(true);
    setBlacklistResult(null);
    try {
      const res = await fetch(
        `/api/support/blacklist?q=${encodeURIComponent(blacklistQ)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : t(lang, "common.error"),
        );
      }
      setBlacklistResult(toSupportBlacklistHit(data?.data));
    } catch {
      setBlacklistResult({
        hit: false,
        source: null,
        tooShort: normalizeLookupQuery(blacklistQ).length < 6,
        labelKey: null,
        noteKey: null,
      });
    } finally {
      setBlacklistBusy(false);
    }
  }

  function LoginGate({ sectionId }: { sectionId: SupportSectionId }) {
    if (isLoggedIn) return null;
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-xs text-amber-950 space-y-2">
        <p>{t(lang, "supportHub.loginRequired")}</p>
        <Link
          href={loginHref(supportHubLoginNext(sectionId))}
          className="inline-flex font-semibold text-amber-900 underline"
        >
          {t(lang, "supportHub.loginCta")}
        </Link>
      </div>
    );
  }

  const visibleSections = SUPPORT_SECTIONS.filter((item) =>
    matchedSections.includes(item.id),
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2B1E19] tracking-tight">
          {t(lang, "supportHub.title")}
        </h1>
        <p className="text-sm sm:text-base text-[#5C4A3A] max-w-2xl">
          {t(lang, "supportHub.subtitle")}
        </p>
      </header>

      <div className="rounded-2xl border border-[#F3E2C8] bg-gradient-to-br from-amber-50/80 to-white p-4 sm:p-5 shadow-sm">
        <label className="sr-only" htmlFor="support-hub-search">
          {t(lang, "supportHub.searchPlaceholder")}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-700/70 text-sm" aria-hidden>
            ⌕
          </span>
          <input
            id="support-hub-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, "supportHub.searchPlaceholder")}
            className={`${fieldClass()} pl-9`}
          />
        </div>
        <p className="mt-2 text-xs text-stone-500">{t(lang, "supportHub.searchHint")}</p>
        <p className="mt-1 text-xs text-stone-500">{t(lang, "supportHub.contactHours")}</p>
      </div>

      {visibleSections.length === 0 ? (
        <p className="text-sm text-stone-500">{t(lang, "supportHub.section.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {visibleSections.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`text-left rounded-2xl border px-4 py-4 transition-colors ${
                  active
                    ? "border-[#D97706] bg-amber-50 shadow-sm"
                    : "border-[#F3E2C8] bg-white hover:bg-amber-50/50"
                }`}
              >
                <p className="text-sm font-bold text-[#2B1E19]">
                  {t(lang, item.titleKey as EnKey)}
                </p>
                <p className="mt-1 text-xs text-[#5C4A3A] leading-relaxed">
                  {t(lang, item.blurbKey as EnKey)}
                </p>
                <ul className="mt-3 space-y-1">
                  {item.pointsKeys.map((pk) => (
                    <li key={pk} className="text-xs text-stone-600">
                      · {t(lang, pk as EnKey)}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      )}

      {section === "guides" && matchedSections.includes("guides") && (
        <section className="rounded-2xl border border-[#F3E2C8] bg-white p-4 sm:p-5 space-y-4">
          <div className="inline-flex rounded-full border border-[#F3E2C8] bg-stone-50 p-1">
            {(["buyer", "breeder"] as GuideAudience[]).map((id) => {
              const active = audience === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setAudience(id);
                    setOpenGuideId(null);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-[#D97706] text-white"
                      : "text-[#5C4A3A] hover:bg-white"
                  }`}
                >
                  {t(lang, id === "buyer" ? "supportHub.audience.buyer" : "supportHub.audience.breeder")}
                </button>
              );
            })}
          </div>

          {guides.length === 0 ? (
            <p className="text-sm text-stone-500">{t(lang, "supportHub.guide.empty")}</p>
          ) : (
            <div className="space-y-2">
              {guides.map((topic) => {
                const open = openGuideId === topic.id;
                return (
                  <div
                    key={topic.id}
                    className="rounded-xl border border-[#F3E2C8] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenGuideId(open ? null : topic.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amber-50/60 transition-colors"
                    >
                      <span className="text-sm font-semibold text-[#2B1E19]">
                        {t(lang, topic.titleKey as EnKey)}
                      </span>
                      <span className="text-stone-400 text-xs shrink-0">{open ? "▴" : "▾"}</span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 space-y-2 border-t border-[#F3E2C8] bg-stone-50/50">
                        <p className="pt-3 text-sm text-[#5C4A3A] leading-relaxed">
                          {t(lang, topic.bodyKey as EnKey)}
                        </p>
                        {topic.stepsKey && (
                          <ol className="space-y-1.5 text-sm text-[#2B1E19]">
                            {t(lang, topic.stepsKey as EnKey)
                              .split("\n")
                              .filter(Boolean)
                              .map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                          </ol>
                        )}
                        {topic.href ? (
                          <Link
                            href={topic.href}
                            className="inline-flex text-sm font-semibold text-amber-800 underline"
                          >
                            {t(lang, "supportHub.guide.openInApp")}
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {section === "feedback" && matchedSections.includes("feedback") && (
        <section className="rounded-2xl border border-[#F3E2C8] bg-white p-4 sm:p-5 space-y-3 max-w-2xl">
          <h2 className="text-base font-bold text-[#2B1E19]">
            {t(lang, "supportHub.feedback.formTitle")}
          </h2>
          <LoginGate sectionId="feedback" />
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-stone-600">
              {t(lang, "supportHub.feedback.category")}
            </span>
            <select
              value={fbCategory}
              onChange={(e) => setFbCategory(e.target.value as FeedbackCategory)}
              className={fieldClass()}
              disabled={!isLoggedIn || fbBusy}
            >
              {FEEDBACK_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(lang, `supportHub.feedback.cat.${cat}` as EnKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-stone-600">
              {t(lang, "supportHub.feedback.title")}
            </span>
            <input
              value={fbTitle}
              onChange={(e) => setFbTitle(e.target.value)}
              placeholder={t(lang, "supportHub.feedback.titlePh")}
              className={fieldClass()}
              disabled={!isLoggedIn || fbBusy}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-stone-600">
              {t(lang, "supportHub.feedback.body")}
            </span>
            <textarea
              value={fbBody}
              onChange={(e) => setFbBody(e.target.value)}
              placeholder={t(lang, "supportHub.feedback.bodyPh")}
              rows={5}
              className={fieldClass()}
              disabled={!isLoggedIn || fbBusy}
            />
          </label>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-stone-600">
              {t(lang, "supportHub.feedback.media")}
            </p>
            <p className="text-xs text-stone-500">{t(lang, "supportHub.feedback.mediaHint")}</p>
            <DealPhotoPicker
              files={fbPhotos}
              max={SUPPORT_FEEDBACK_MAX_EVIDENCE}
              disabled={!isLoggedIn || fbBusy}
              invalid={false}
              dropHint={dealPhotosDropHint(
                t(lang, "deal.photosDrop"),
                SUPPORT_FEEDBACK_MAX_EVIDENCE,
              )}
              browseLabel={t(lang, "deal.photosBrowse")}
              removeLabel={t(lang, "deal.photosRemove")}
              onChange={setFbPhotos}
            />
          </div>
          {fbError ? <p className="text-xs text-red-600">{fbError}</p> : null}
          {fbSuccess ? (
            <p className="text-xs text-emerald-700">{t(lang, "supportHub.feedback.success")}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void submitFeedback()}
            className={primaryBtnClass()}
            disabled={fbBusy}
          >
            {fbBusy
              ? t(lang, "supportHub.submitting")
              : t(lang, "supportHub.feedback.submit")}
          </button>
        </section>
      )}

      {section === "scam" && matchedSections.includes("scam") && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#F3E2C8] bg-white p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-[#2B1E19]">
                {t(lang, "supportHub.blacklist.title")}
              </h2>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                {t(lang, "supportHub.blacklist.liveBadge")}
              </span>
            </div>
            <p className="text-xs text-amber-950/90 leading-relaxed rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
              {t(lang, "supportHub.blacklist.liveDisclaimer")}
            </p>
            <p className="text-xs text-stone-500 leading-relaxed">
              {t(lang, "supportHub.blacklist.blurb")}
            </p>
            <div className="flex gap-2">
              <input
                value={blacklistQ}
                onChange={(e) => {
                  setBlacklistQ(e.target.value);
                  setBlacklistChecked(false);
                  setBlacklistResult(null);
                }}
                placeholder={t(lang, "supportHub.blacklist.placeholder")}
                className={fieldClass()}
              />
              <button
                type="button"
                onClick={() => void runBlacklistCheck()}
                className={primaryBtnClass()}
                disabled={blacklistBusy}
              >
                {blacklistBusy
                  ? t(lang, "supportHub.submitting")
                  : t(lang, "supportHub.blacklist.check")}
              </button>
            </div>
            {blacklistChecked && blacklistResult?.tooShort ? (
              <p className="text-xs text-amber-800">{t(lang, "supportHub.blacklist.tooShort")}</p>
            ) : null}
            {blacklistChecked && blacklistResult && !blacklistResult.tooShort ? (
              blacklistResult.hit ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-900 space-y-1">
                  <p className="font-semibold">
                    {blacklistResult.source === "live"
                      ? t(lang, "supportHub.blacklist.liveHit")
                      : t(lang, "supportHub.blacklist.hit")}
                  </p>
                  {blacklistResult.labelKey ? (
                    <p>{t(lang, blacklistResult.labelKey as EnKey)}</p>
                  ) : null}
                  <p className="text-red-800/80">
                    {t(
                      lang,
                      (blacklistResult.noteKey ||
                        (blacklistResult.source === "live"
                          ? "supportHub.blacklist.liveNote"
                          : "supportHub.blacklist.sampleNote")) as EnKey,
                    )}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[#F3E2C8] bg-stone-50 px-3 py-2.5 text-xs text-stone-600 space-y-1">
                  <p className="font-semibold text-[#2B1E19]">
                    {t(lang, "supportHub.blacklist.missTitle")}
                  </p>
                  <p>{t(lang, "supportHub.blacklist.miss")}</p>
                </div>
              )
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#F3E2C8] bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#2B1E19]">
              {t(lang, "supportHub.scam.formTitle")}
            </h2>
            <LoginGate sectionId="scam" />
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-stone-600">
                {t(lang, "supportHub.scam.targetType")}
              </span>
              <select
                value={scamType}
                onChange={(e) => setScamType(e.target.value as ScamTargetType)}
                className={fieldClass()}
                disabled={!isLoggedIn || scamBusy}
              >
                {SCAM_TARGET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(lang, `supportHub.scam.type.${type}` as EnKey)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-stone-600">
                {t(lang, "supportHub.scam.identifier")}
              </span>
              <input
                value={scamId}
                onChange={(e) => setScamId(e.target.value)}
                placeholder={t(lang, "supportHub.scam.identifierPh")}
                className={fieldClass()}
                disabled={!isLoggedIn || scamBusy}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-stone-600">
                {t(lang, "supportHub.scam.relatedUrl")}
              </span>
              <input
                value={scamUrl}
                onChange={(e) => setScamUrl(e.target.value)}
                placeholder={t(lang, "supportHub.scam.relatedUrlPh")}
                className={fieldClass()}
                disabled={!isLoggedIn || scamBusy}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-stone-600">
                {t(lang, "supportHub.scam.details")}
              </span>
              <textarea
                value={scamDetails}
                onChange={(e) => setScamDetails(e.target.value)}
                placeholder={t(lang, "supportHub.scam.detailsPh")}
                rows={4}
                className={fieldClass()}
                disabled={!isLoggedIn || scamBusy}
              />
            </label>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 space-y-2">
              <p className="text-xs font-semibold text-amber-950">
                {t(lang, "supportHub.scam.evidence")}
              </p>
              <p className="text-xs text-amber-900/90">
                {t(lang, "supportHub.scam.evidenceHint")}
              </p>
              <DealPhotoPicker
                files={scamPhotos}
                max={SUPPORT_SCAM_MAX_EVIDENCE}
                disabled={!isLoggedIn || scamBusy}
                invalid={Boolean(scamError) && scamPhotos.length < SUPPORT_SCAM_MIN_EVIDENCE}
                dropHint={dealPhotosDropHint(
                  t(lang, "deal.photosDrop"),
                  SUPPORT_SCAM_MAX_EVIDENCE,
                )}
                browseLabel={t(lang, "deal.photosBrowse")}
                removeLabel={t(lang, "deal.photosRemove")}
                onChange={(next) => {
                  setScamPhotos(next);
                  setScamError("");
                }}
              />
              <label className="flex items-start gap-2 text-xs text-[#2B1E19]">
                <input
                  type="checkbox"
                  checked={scamEvidence}
                  onChange={(e) => setScamEvidence(e.target.checked)}
                  className="mt-0.5"
                  disabled={!isLoggedIn || scamBusy}
                />
                <span>{t(lang, "supportHub.scam.evidenceConfirm")}</span>
              </label>
            </div>
            <label className="flex items-start gap-2 text-xs text-[#5C4A3A]">
              <input
                type="checkbox"
                checked={scamAnon}
                onChange={(e) => setScamAnon(e.target.checked)}
                className="mt-0.5"
                disabled={!isLoggedIn || scamBusy}
              />
              <span>{t(lang, "supportHub.scam.anonymous")}</span>
            </label>
            <p className="text-[11px] text-stone-500">{t(lang, "supportHub.scam.privacy")}</p>
            {scamError ? <p className="text-xs text-red-600">{scamError}</p> : null}
            {scamSuccess ? (
              <p className="text-xs text-emerald-700">{t(lang, "supportHub.scam.success")}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void submitScam()}
              className={primaryBtnClass()}
              disabled={scamBusy}
            >
              {scamBusy
                ? t(lang, "supportHub.submitting")
                : t(lang, "supportHub.scam.submit")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
