import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  COMMUNITY_IDEAS,
  GUIDE_TOPICS,
  SUPPORT_SECTIONS,
  feedbackMailto,
  filterGuideTopics,
  ideaStatusLabelKey,
  lookupBlacklistSample,
  normalizeLookupQuery,
  parseSupportSection,
  scamReportMailto,
  supportHubSearchHref,
} from "../src/lib/supportHub";
import { LEGAL_CONTACT_EMAIL, LEGAL_SUPPORT_EMAIL } from "../src/lib/legalContent";

test("parseSupportSection defaults to guides", () => {
  assert.equal(parseSupportSection(undefined), "guides");
  assert.equal(parseSupportSection("feedback"), "feedback");
  assert.equal(parseSupportSection("SCAM"), "scam");
});

test("normalizeLookupQuery strips noise and +84", () => {
  assert.equal(normalizeLookupQuery(" 090-000-0000 "), "0900000000");
  assert.equal(normalizeLookupQuery("+84 900 000 000"), "0900000000");
});

test("lookupBlacklistSample matches demo phone", () => {
  const hit = lookupBlacklistSample("0900-000-000");
  assert.ok(hit);
  assert.equal(hit?.id, "sample-phone");
  assert.equal(lookupBlacklistSample("0911222333"), null);
});

test("filterGuideTopics respects audience and query", () => {
  const resolve = (key: string) => en[key as keyof typeof en] || key;
  const buyer = filterGuideTopics(GUIDE_TOPICS, "buyer", "", resolve);
  assert.ok(buyer.every((g) => g.audience === "buyer"));
  assert.equal(buyer.length, 3);
  const deposit = filterGuideTopics(GUIDE_TOPICS, "buyer", "deposit", resolve);
  assert.ok(deposit.some((g) => g.id === "buyer-deposit"));
});

test("feedbackMailto and scamReportMailto use legal inboxes", () => {
  const fb = feedbackMailto({
    category: "bug",
    title: "Broken like",
    body: "Details here",
  });
  assert.ok(fb.startsWith(`mailto:${LEGAL_SUPPORT_EMAIL}?`));
  assert.ok(fb.includes(encodeURIComponent("[PetCare Feedback · bug] Broken like")));

  const scam = scamReportMailto({
    targetType: "phone",
    identifier: "0900111222",
    listingOrProfileUrl: "https://example.com/p/1",
    details: "Asked for off-platform deposit",
    anonymous: true,
  });
  assert.ok(scam.startsWith(`mailto:${LEGAL_CONTACT_EMAIL}?`));
  assert.ok(scam.includes(encodeURIComponent("Anonymous: yes")));
});

test("supportHubSearchHref builds query string", () => {
  assert.equal(supportHubSearchHref(""), "/app/support");
  assert.equal(
    supportHubSearchHref("cọc", "guides"),
    "/app/support?q=c%E1%BB%8Dc&section=guides",
  );
});

test("ideaStatusLabelKey maps statuses", () => {
  assert.equal(ideaStatusLabelKey("reviewing"), "supportHub.ideaStatus.reviewing");
  assert.equal(ideaStatusLabelKey("planned"), "supportHub.ideaStatus.planned");
  assert.equal(ideaStatusLabelKey("done"), "supportHub.ideaStatus.done");
});

test("support hub i18n parity for core keys", () => {
  assert.equal(vi["nav.support"], "Hỗ trợ");
  assert.equal(en["nav.support"], "Support");
  for (const section of SUPPORT_SECTIONS) {
    assert.ok(en[section.titleKey as keyof typeof en]);
    assert.ok(vi[section.titleKey as keyof typeof vi]);
  }
  for (const idea of COMMUNITY_IDEAS) {
    assert.ok(en[idea.titleKey as keyof typeof en]);
    assert.ok(vi[idea.titleKey as keyof typeof vi]);
  }
  for (const topic of GUIDE_TOPICS) {
    assert.ok(en[topic.titleKey as keyof typeof en]);
    assert.ok(vi[topic.titleKey as keyof typeof vi]);
  }
});
