import { LEGAL_CONTACT_EMAIL, LEGAL_SUPPORT_EMAIL } from "./legalContent";
import { SUPPORT_HREF } from "./siteNav";

export const SUPPORT_HUB_HREF = SUPPORT_HREF;

export type SupportSectionId = "guides" | "feedback" | "scam";
export type GuideAudience = "buyer" | "breeder";
export type FeedbackCategory = "ui" | "feature" | "bug" | "other";
export type ScamTargetType = "account" | "phone" | "facebook" | "bank";
export type IdeaStatus = "reviewing" | "planned" | "done";

export type GuideTopic = {
  id: string;
  audience: GuideAudience;
  titleKey: string;
  bodyKey: string;
  stepsKey?: string;
};

export type CommunityIdea = {
  id: string;
  titleKey: string;
  bodyKey: string;
  status: IdeaStatus;
  seedVotes: number;
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
  },
  {
    id: "breeder-verify",
    audience: "breeder",
    titleKey: "supportHub.guide.breederVerify.title",
    bodyKey: "supportHub.guide.breederVerify.body",
  },
  {
    id: "breeder-warranty",
    audience: "breeder",
    titleKey: "supportHub.guide.breederWarranty.title",
    bodyKey: "supportHub.guide.breederWarranty.body",
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

export const COMMUNITY_IDEAS: CommunityIdea[] = [
  {
    id: "idea-deposit-timeline",
    titleKey: "supportHub.idea.depositTimeline.title",
    bodyKey: "supportHub.idea.depositTimeline.body",
    status: "planned",
    seedVotes: 42,
  },
  {
    id: "idea-warranty-compare",
    titleKey: "supportHub.idea.warrantyCompare.title",
    bodyKey: "supportHub.idea.warrantyCompare.body",
    status: "reviewing",
    seedVotes: 28,
  },
  {
    id: "idea-chat-translate",
    titleKey: "supportHub.idea.chatTranslate.title",
    bodyKey: "supportHub.idea.chatTranslate.body",
    status: "done",
    seedVotes: 61,
  },
];

/** Public sample entries for UX demos — not a live moderation database. */
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

export function ideaStatusLabelKey(status: IdeaStatus): string {
  if (status === "planned") return "supportHub.ideaStatus.planned";
  if (status === "done") return "supportHub.ideaStatus.done";
  return "supportHub.ideaStatus.reviewing";
}

export function feedbackMailto(opts: {
  category: FeedbackCategory;
  title: string;
  body: string;
  email?: string;
}): string {
  const subject = encodeURIComponent(`[PetCare Feedback · ${opts.category}] ${opts.title.trim() || "Untitled"}`);
  const lines = [
    `Category: ${opts.category}`,
    `Title: ${opts.title.trim()}`,
    "",
    opts.body.trim(),
  ];
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:${opts.email || LEGAL_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export function scamReportMailto(opts: {
  targetType: ScamTargetType;
  identifier: string;
  listingOrProfileUrl: string;
  details: string;
  anonymous: boolean;
  email?: string;
}): string {
  const subject = encodeURIComponent(`[PetCare Scam Report · ${opts.targetType}]`);
  const lines = [
    `Target type: ${opts.targetType}`,
    `Identifier: ${opts.identifier.trim()}`,
    `Related listing/profile: ${opts.listingOrProfileUrl.trim() || "(none)"}`,
    `Anonymous: ${opts.anonymous ? "yes" : "no"}`,
    "",
    opts.details.trim(),
    "",
    "Evidence: attach screenshots / transfer bills in your email reply.",
  ];
  const body = encodeURIComponent(lines.join("\n"));
  return `mailto:${opts.email || LEGAL_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

export function supportHubSearchHref(query: string, section?: SupportSectionId): string {
  const params = new URLSearchParams();
  const q = String(query || "").trim();
  if (q) params.set("q", q);
  if (section) params.set("section", section);
  const qs = params.toString();
  return qs ? `${SUPPORT_HUB_HREF}?${qs}` : SUPPORT_HUB_HREF;
}
