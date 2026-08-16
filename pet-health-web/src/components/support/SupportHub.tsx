"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/types";
import { t, type EnKey } from "@/i18n";
import {
  COMMUNITY_IDEAS,
  FEEDBACK_CATEGORIES,
  GUIDE_TOPICS,
  SCAM_TARGET_TYPES,
  SUPPORT_SECTIONS,
  feedbackMailto,
  filterGuideTopics,
  ideaStatusLabelKey,
  lookupBlacklistSample,
  normalizeLookupQuery,
  parseSupportSection,
  scamReportMailto,
  type FeedbackCategory,
  type GuideAudience,
  type ScamTargetType,
  type SupportSectionId,
} from "@/lib/supportHub";

const IDEA_VOTES_KEY = "phc_support_idea_votes";
const IDEA_COMMENTS_KEY = "phc_support_idea_comments";

type IdeaVoteMap = Record<string, boolean>;
type IdeaCommentMap = Record<string, string[]>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

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
}: {
  lang: Lang;
  initialSection?: string;
  initialQuery?: string;
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
  const [fbError, setFbError] = useState("");

  const [votes, setVotes] = useState<IdeaVoteMap>({});
  const [comments, setComments] = useState<IdeaCommentMap>({});
  const [draftComments, setDraftComments] = useState<Record<string, string>>({});

  const [blacklistQ, setBlacklistQ] = useState("");
  const [blacklistChecked, setBlacklistChecked] = useState(false);
  const [scamType, setScamType] = useState<ScamTargetType>("account");
  const [scamId, setScamId] = useState("");
  const [scamUrl, setScamUrl] = useState("");
  const [scamDetails, setScamDetails] = useState("");
  const [scamAnon, setScamAnon] = useState(false);
  const [scamEvidence, setScamEvidence] = useState(false);
  const [scamError, setScamError] = useState("");

  useEffect(() => {
    setVotes(readJson<IdeaVoteMap>(IDEA_VOTES_KEY, {}));
    setComments(readJson<IdeaCommentMap>(IDEA_COMMENTS_KEY, {}));
  }, []);

  const guides = useMemo(
    () => filterGuideTopics(GUIDE_TOPICS, audience, query, resolve),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolve from lang
    [audience, query, lang],
  );

  const blacklistHit = useMemo(() => {
    if (!blacklistChecked) return null;
    return lookupBlacklistSample(blacklistQ);
  }, [blacklistChecked, blacklistQ]);

  function toggleVote(ideaId: string) {
    setVotes((prev) => {
      const next = { ...prev, [ideaId]: !prev[ideaId] };
      writeJson(IDEA_VOTES_KEY, next);
      return next;
    });
  }

  function addComment(ideaId: string) {
    const text = String(draftComments[ideaId] || "").trim();
    if (!text) return;
    setComments((prev) => {
      const next = { ...prev, [ideaId]: [...(prev[ideaId] || []), text] };
      writeJson(IDEA_COMMENTS_KEY, next);
      return next;
    });
    setDraftComments((prev) => ({ ...prev, [ideaId]: "" }));
  }

  function submitFeedback() {
    if (!fbTitle.trim() || !fbBody.trim()) {
      setFbError(t(lang, "supportHub.feedback.required"));
      return;
    }
    setFbError("");
    window.location.href = feedbackMailto({
      category: fbCategory,
      title: fbTitle,
      body: fbBody,
    });
  }

  function submitScam() {
    if (!scamId.trim() || !scamDetails.trim() || !scamEvidence) {
      setScamError(t(lang, "supportHub.scam.required"));
      return;
    }
    setScamError("");
    window.location.href = scamReportMailto({
      targetType: scamType,
      identifier: scamId,
      listingOrProfileUrl: scamUrl,
      details: scamDetails,
      anonymous: scamAnon,
    });
  }

  function runBlacklistCheck() {
    setBlacklistChecked(true);
  }

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SUPPORT_SECTIONS.map((item) => {
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

      {section === "guides" && (
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {section === "feedback" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#F3E2C8] bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#2B1E19]">
              {t(lang, "supportHub.feedback.formTitle")}
            </h2>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-stone-600">
                {t(lang, "supportHub.feedback.category")}
              </span>
              <select
                value={fbCategory}
                onChange={(e) => setFbCategory(e.target.value as FeedbackCategory)}
                className={fieldClass()}
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
              />
            </label>
            <p className="text-xs text-stone-500">
              <span className="font-semibold text-stone-600">
                {t(lang, "supportHub.feedback.media")}:{" "}
              </span>
              {t(lang, "supportHub.feedback.mediaHint")}
            </p>
            {fbError ? <p className="text-xs text-red-600">{fbError}</p> : null}
            <button type="button" onClick={submitFeedback} className={primaryBtnClass()}>
              {t(lang, "supportHub.feedback.submit")}
            </button>
          </div>

          <div className="rounded-2xl border border-[#F3E2C8] bg-white p-4 sm:p-5 space-y-3">
            <div>
              <h2 className="text-base font-bold text-[#2B1E19]">
                {t(lang, "supportHub.ideas.title")}
              </h2>
              <p className="mt-1 text-xs text-stone-500">{t(lang, "supportHub.ideas.blurb")}</p>
            </div>
            <div className="space-y-3">
              {COMMUNITY_IDEAS.map((idea) => {
                const voted = Boolean(votes[idea.id]);
                const count = idea.seedVotes + (voted ? 1 : 0);
                const ideaComments = comments[idea.id] || [];
                return (
                  <article
                    key={idea.id}
                    className="rounded-xl border border-[#F3E2C8] bg-stone-50/40 p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#2B1E19]">
                        {t(lang, idea.titleKey as EnKey)}
                      </h3>
                      <span className="shrink-0 rounded-full bg-white border border-[#F3E2C8] px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        {t(lang, ideaStatusLabelKey(idea.status) as EnKey)}
                      </span>
                    </div>
                    <p className="text-xs text-[#5C4A3A] leading-relaxed">
                      {t(lang, idea.bodyKey as EnKey)}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleVote(idea.id)}
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-colors ${
                        voted
                          ? "border-amber-500 bg-amber-100 text-amber-900"
                          : "border-[#F3E2C8] bg-white text-[#5C4A3A] hover:bg-amber-50"
                      }`}
                    >
                      {voted
                        ? t(lang, "supportHub.ideas.upvoted")
                        : t(lang, "supportHub.ideas.upvote")}{" "}
                      · {count}
                    </button>
                    <div className="space-y-1.5 pt-1">
                      {ideaComments.length === 0 ? (
                        <p className="text-[11px] text-stone-400">
                          {t(lang, "supportHub.ideas.commentsEmpty")}
                        </p>
                      ) : (
                        ideaComments.map((c, idx) => (
                          <p
                            key={`${idea.id}-${idx}`}
                            className="text-[11px] text-stone-600 bg-white rounded-lg border border-[#F3E2C8] px-2 py-1.5"
                          >
                            {c}
                          </p>
                        ))
                      )}
                      <div className="flex gap-2">
                        <input
                          value={draftComments[idea.id] || ""}
                          onChange={(e) =>
                            setDraftComments((prev) => ({
                              ...prev,
                              [idea.id]: e.target.value,
                            }))
                          }
                          placeholder={t(lang, "supportHub.ideas.commentPh")}
                          className={`${fieldClass()} py-1.5 text-xs`}
                        />
                        <button
                          type="button"
                          onClick={() => addComment(idea.id)}
                          className="shrink-0 rounded-lg border border-[#F3E2C8] bg-white px-2.5 text-xs font-semibold text-[#5C4A3A] hover:bg-amber-50"
                        >
                          {t(lang, "supportHub.ideas.commentAdd")}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {section === "scam" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#F3E2C8] bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#2B1E19]">
              {t(lang, "supportHub.blacklist.title")}
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              {t(lang, "supportHub.blacklist.blurb")}
            </p>
            <div className="flex gap-2">
              <input
                value={blacklistQ}
                onChange={(e) => {
                  setBlacklistQ(e.target.value);
                  setBlacklistChecked(false);
                }}
                placeholder={t(lang, "supportHub.blacklist.placeholder")}
                className={fieldClass()}
              />
              <button type="button" onClick={runBlacklistCheck} className={primaryBtnClass()}>
                {t(lang, "supportHub.blacklist.check")}
              </button>
            </div>
            {blacklistChecked && normalizeLookupQuery(blacklistQ).length < 6 ? (
              <p className="text-xs text-amber-800">{t(lang, "supportHub.blacklist.tooShort")}</p>
            ) : null}
            {blacklistChecked && normalizeLookupQuery(blacklistQ).length >= 6 ? (
              blacklistHit ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-900 space-y-1">
                  <p className="font-semibold">{t(lang, "supportHub.blacklist.hit")}</p>
                  <p>{t(lang, blacklistHit.labelKey as EnKey)}</p>
                  <p className="text-red-800/80">{t(lang, blacklistHit.noteKey as EnKey)}</p>
                </div>
              ) : (
                <p className="rounded-xl border border-[#F3E2C8] bg-stone-50 px-3 py-2.5 text-xs text-stone-600">
                  {t(lang, "supportHub.blacklist.miss")}
                </p>
              )
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#F3E2C8] bg-white p-4 sm:p-5 space-y-3">
            <h2 className="text-base font-bold text-[#2B1E19]">
              {t(lang, "supportHub.scam.formTitle")}
            </h2>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-stone-600">
                {t(lang, "supportHub.scam.targetType")}
              </span>
              <select
                value={scamType}
                onChange={(e) => setScamType(e.target.value as ScamTargetType)}
                className={fieldClass()}
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
              />
            </label>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 space-y-2">
              <p className="text-xs font-semibold text-amber-950">
                {t(lang, "supportHub.scam.evidence")}
              </p>
              <p className="text-xs text-amber-900/90">
                {t(lang, "supportHub.scam.evidenceHint")}
              </p>
              <label className="flex items-start gap-2 text-xs text-[#2B1E19]">
                <input
                  type="checkbox"
                  checked={scamEvidence}
                  onChange={(e) => setScamEvidence(e.target.checked)}
                  className="mt-0.5"
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
              />
              <span>{t(lang, "supportHub.scam.anonymous")}</span>
            </label>
            <p className="text-[11px] text-stone-500">{t(lang, "supportHub.scam.privacy")}</p>
            {scamError ? <p className="text-xs text-red-600">{scamError}</p> : null}
            <button type="button" onClick={submitScam} className={primaryBtnClass()}>
              {t(lang, "supportHub.scam.submit")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
