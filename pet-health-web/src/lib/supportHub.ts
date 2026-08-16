import { SUPPORT_HREF } from "./siteNav";

export const SUPPORT_HUB_HREF = SUPPORT_HREF;

export type SupportSectionId = "guides" | "feedback" | "scam";
export type GuideAudience = "buyer" | "breeder";
export type FeedbackCategory = "ui" | "feature" | "bug" | "other";
export type ScamTargetType = "account" | "phone" | "facebook" | "bank";

export type GuideTopic = {
  id: string;
  audience: GuideAudience;
  titleKey: string;
  bodyKey: string;
  stepsKey?: string;
  /** In-app deep link shown when the guide is expanded */
  href?: string;
};

export type BlacklistSample = {
  id: string;
  /** Normalized digits / lowercase slug for match demos */
  tokens: string[];
  labelKey: string;
  noteKey: string;
};

export const SUPPORT_SECTIONS: Array<{
  id: SupportSectionId;
  titleKey: string;
  blurbKey: string;
  pointsKeys: string[];
}> = [
  {
    id: "guides",
    titleKey: "supportHub.section.guides",
    blurbKey: "supportHub.section.guidesBlurb",
    pointsKeys: ["supportHub.section.guides.point1", "supportHub.section.guides.point2"],
  },
  {
    id: "feedback",
    titleKey: "supportHub.section.feedback",
    blurbKey: "supportHub.section.feedbackBlurb",
    pointsKeys: ["supportHub.section.feedback.point1", "supportHub.section.feedback.point2"],
  },
  {
    id: "scam",
    titleKey: "supportHub.section.scam",
    blurbKey: "supportHub.section.scamBlurb",
    pointsKeys: ["supportHub.section.scam.point1", "supportHub.section.scam.point2"],
  },
];

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: "buyer-deposit",
    audience: "buyer",
    titleKey: "supportHub.guide.buyerDeposit.title",
    bodyKey: "supportHub.guide.buyerDeposit.body",
    stepsKey: "supportHub.guide.buyerDeposit.steps",
    href: "/app/pet-feed",
  },
  {
    id: "buyer-handoff",
    audience: "buyer",
    titleKey: "supportHub.guide.buyerHandoff.title",
    bodyKey: "supportHub.guide.buyerHandoff.body",
  },
  {
    id: "buyer-warranty",
    audience: "buyer",
    titleKey: "supportHub.guide.buyerWarranty.title",
    bodyKey: "supportHub.guide.buyerWarranty.body",
    href: "/app/account/warranty",
  },
  {
    id: "breeder-verify",
    audience: "breeder",
    titleKey: "supportHub.guide.breederVerify.title",
    bodyKey: "supportHub.guide.breederVerify.body",
    href: "/app/account/breeder",
  },
  {
    id: "breeder-warranty",
    audience: "breeder",
    titleKey: "supportHub.guide.breederWarranty.title",
    bodyKey: "supportHub.guide.breederWarranty.body",
    href: "/app/account/warranty",
  },
  {
    id: "breeder-payout",
    audience: "breeder",
    titleKey: "supportHub.guide.breederPayout.title",
    bodyKey: "supportHub.guide.breederPayout.body",
  },
];

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = ["ui", "feature", "bug", "other"];

export const SCAM_TARGET_TYPES: ScamTargetType[] = ["account", "phone", "facebook", "bank"];

export const SUPPORT_SCAM_MAX_EVIDENCE = 5;
export const SUPPORT_SCAM_MIN_EVIDENCE = 1;
export const SUPPORT_FEEDBACK_MAX_EVIDENCE = 3;

/** Public sample entries for UX demos — also mirrored on the backend blacklist API. */
export const BLACKLIST_SAMPLES: BlacklistSample[] = [
  {
    id: "sample-phone",
    tokens: ["0900000000", "84900000000"],
    labelKey: "supportHub.blacklist.samplePhone",
    noteKey: "supportHub.blacklist.sampleNote",
  },
  {
    id: "sample-bank",
    tokens: ["0123456789", "vietcombank0123456789"],
    labelKey: "supportHub.blacklist.sampleBank",
    noteKey: "supportHub.blacklist.sampleNote",
  },
];

export type SupportBlacklistHit = {
  hit: boolean;
  source: "demo" | "live" | null;
  tooShort: boolean;
  labelKey: string | null;
  noteKey: string | null;
};

export function toSupportBlacklistHit(raw: {
  hit?: boolean;
  source?: "demo" | "live" | null;
  too_short?: boolean;
  label_key?: string | null;
  note_key?: string | null;
} | null | undefined): SupportBlacklistHit {
  return {
    hit: Boolean(raw?.hit),
    source: raw?.source === "demo" || raw?.source === "live" ? raw.source : null,
    tooShort: Boolean(raw?.too_short),
    labelKey: typeof raw?.label_key === "string" ? raw.label_key : null,
    noteKey: typeof raw?.note_key === "string" ? raw.note_key : null,
  };
}
export function parseSupportSection(raw: string | null | undefined): SupportSectionId {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "feedback" || v === "scam" || v === "guides") return v;
  return "guides";
}

export function normalizeLookupQuery(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.]/g, "")
    .replace(/^\+84/, "0");
}

export function lookupBlacklistSample(query: string): BlacklistSample | null {
  const q = normalizeLookupQuery(query);
  if (q.length < 6) return null;
  return BLACKLIST_SAMPLES.find((row) => row.tokens.some((t) => t === q || q.includes(t) || t.includes(q))) || null;
}

export function filterGuideTopics(
  topics: GuideTopic[],
  audience: GuideAudience,
  query: string,
  resolveText: (key: string) => string,
): GuideTopic[] {
  const q = String(query || "").trim().toLowerCase();
  return topics.filter((topic) => {
    if (topic.audience !== audience) return false;
    if (!q) return true;
    const hay = [resolveText(topic.titleKey), resolveText(topic.bodyKey), topic.stepsKey ? resolveText(topic.stepsKey) : ""]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function filterSupportSections(
  query: string,
  resolveText: (key: string) => string,
): SupportSectionId[] {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return SUPPORT_SECTIONS.map((s) => s.id);
  return SUPPORT_SECTIONS.filter((section) => {
    const hay = [resolveText(section.titleKey), resolveText(section.blurbKey), ...section.pointsKeys.map(resolveText)]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }).map((s) => s.id);
}

/** Keep the active section if it still matches; otherwise first match (or guides). */
export function pickSupportSection(
  current: SupportSectionId,
  matched: SupportSectionId[],
): SupportSectionId {
  if (matched.includes(current)) return current;
  return matched[0] || "guides";
}

export function supportHubSearchHref(query: string, section?: SupportSectionId): string {
  const params = new URLSearchParams();
  const q = String(query || "").trim();
  if (q) params.set("q", q);
  if (section) params.set("section", section);
  const qs = params.toString();
  return qs ? `${SUPPORT_HUB_HREF}?${qs}` : SUPPORT_HUB_HREF;
}

export function supportHubLoginNext(section?: SupportSectionId): string {
  return supportHubSearchHref("", section);
}

/** Path + query only — for history.replaceState without full navigation. */
export function supportHubPathWithState(query: string, section: SupportSectionId): string {
  return supportHubSearchHref(query, section);
}
