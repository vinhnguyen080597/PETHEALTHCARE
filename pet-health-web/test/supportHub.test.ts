import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  GUIDE_TOPICS,
  SUPPORT_FEEDBACK_MAX_EVIDENCE,
  SUPPORT_SCAM_MAX_EVIDENCE,
  SUPPORT_SCAM_MIN_EVIDENCE,
  SUPPORT_SECTIONS,
  filterGuideTopics,
  filterSupportSections,
  lookupBlacklistSample,
  normalizeLookupQuery,
  parseSupportSection,
  pickSupportSection,
  supportHubLoginNext,
  supportHubPathWithState,
  supportHubSearchHref,
  toSupportBlacklistHit,
} from "../src/lib/supportHub";
import { loginHref } from "../src/lib/loginHref";

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

test("toSupportBlacklistHit maps API payload", () => {
  assert.deepEqual(
    toSupportBlacklistHit({
      hit: true,
      source: "live",
      too_short: false,
      label_key: "supportHub.blacklist.liveHit",
      note_key: "supportHub.blacklist.liveNote",
    }),
    {
      hit: true,
      source: "live",
      tooShort: false,
      labelKey: "supportHub.blacklist.liveHit",
      noteKey: "supportHub.blacklist.liveNote",
    },
  );
  assert.equal(toSupportBlacklistHit({ too_short: true }).tooShort, true);
});

test("support evidence limits", () => {
  assert.equal(SUPPORT_SCAM_MIN_EVIDENCE, 1);
  assert.equal(SUPPORT_SCAM_MAX_EVIDENCE, 5);
  assert.equal(SUPPORT_FEEDBACK_MAX_EVIDENCE, 3);
});

test("filterGuideTopics respects audience and query", () => {
  const resolve = (key: string) => en[key as keyof typeof en] || key;
  const buyer = filterGuideTopics(GUIDE_TOPICS, "buyer", "", resolve);
  assert.ok(buyer.every((g) => g.audience === "buyer"));
  assert.equal(buyer.length, 3);
  const deposit = filterGuideTopics(GUIDE_TOPICS, "buyer", "deposit", resolve);
  assert.ok(deposit.some((g) => g.id === "buyer-deposit"));
});

test("filterSupportSections and pickSupportSection", () => {
  const resolve = (key: string) => en[key as keyof typeof en] || key;
  assert.deepEqual(filterSupportSections("", resolve), ["guides", "feedback", "scam"]);
  const feedbackOnly = filterSupportSections("feedback", resolve);
  assert.ok(feedbackOnly.includes("feedback"));
  assert.equal(pickSupportSection("scam", feedbackOnly), "feedback");
  assert.equal(pickSupportSection("feedback", feedbackOnly), "feedback");
  assert.equal(pickSupportSection("guides", []), "guides");
});

test("guide topics expose deep links where expected", () => {
  const warranty = GUIDE_TOPICS.find((g) => g.id === "buyer-warranty");
  assert.equal(warranty?.href, "/app/account/warranty");
  const verify = GUIDE_TOPICS.find((g) => g.id === "breeder-verify");
  assert.equal(verify?.href, "/app/account/breeder");
});

test("supportHubSearchHref builds query string", () => {
  assert.equal(supportHubSearchHref(""), "/app/support");
  assert.equal(
    supportHubSearchHref("cọc", "guides"),
    "/app/support?q=c%E1%BB%8Dc&section=guides",
  );
  assert.equal(supportHubPathWithState("bug", "feedback"), "/app/support?q=bug&section=feedback");
});

test("supportHubLoginNext and loginHref preserve section", () => {
  assert.equal(supportHubLoginNext("feedback"), "/app/support?section=feedback");
  assert.equal(
    loginHref(supportHubLoginNext("scam")),
    `/login?next=${encodeURIComponent("/app/support?section=scam")}`,
  );
});

test("support hub i18n parity for core keys", () => {
  assert.equal(vi["nav.support"], "Hỗ trợ");
  assert.equal(en["nav.support"], "Support");
  assert.equal(en["supportHub.feedback.submit"], "Send to admins");
  assert.equal(vi["supportHub.feedback.submit"], "Gửi tới admin");
  assert.equal(en["supportHub.scam.submit"], "Send report to admins");
  assert.equal(vi["supportHub.scam.submit"], "Gửi báo cáo tới admin");
  assert.equal(en["supportHub.blacklist.liveBadge"], "Live + demo");
  assert.equal(vi["supportHub.blacklist.liveBadge"], "Live + demo");
  assert.ok(en["supportHub.blacklist.liveHit"]);
  assert.ok(vi["supportHub.blacklist.liveHit"]);
  assert.match(en["supportHub.blacklist.miss"], /does not mean safe/i);
  assert.match(vi["supportHub.blacklist.miss"], /không có nghĩa là an toàn/i);
  assert.ok(en["admin.support.evidence"]);
  assert.ok(vi["admin.support.evidence"]);
  for (const section of SUPPORT_SECTIONS) {
    assert.ok(en[section.titleKey as keyof typeof en]);
    assert.ok(vi[section.titleKey as keyof typeof vi]);
  }
  for (const topic of GUIDE_TOPICS) {
    assert.ok(en[topic.titleKey as keyof typeof en]);
    assert.ok(vi[topic.titleKey as keyof typeof vi]);
  }
});
