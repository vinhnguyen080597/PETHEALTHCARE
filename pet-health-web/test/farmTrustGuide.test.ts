import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  farmTrustGuideHref,
  TRUST_GUIDE_HOW_TO_EARN,
  TRUST_GUIDE_IMPACT,
  TRUST_GUIDE_PENALTIES,
  trustGuideTierSummary,
} from "../src/lib/farmTrustGuide";

test("farmTrustGuideHref builds owner guide path", () => {
  assert.equal(
    farmTrustGuideHref("bp-123"),
    "/app/breeders/bp-123/trust",
  );
  assert.equal(
    farmTrustGuideHref("id/with spaces"),
    "/app/breeders/id%2Fwith%20spaces/trust",
  );
});

test("trust guide content catalogs are non-empty", () => {
  assert.ok(TRUST_GUIDE_HOW_TO_EARN.length >= 5);
  assert.ok(TRUST_GUIDE_PENALTIES.length >= 4);
  assert.ok(TRUST_GUIDE_IMPACT.length >= 3);
  assert.equal(trustGuideTierSummary("VI").length, 6);
  assert.ok(trustGuideTierSummary("VI")[0].startsWith("L0"));
});

test("trust guide has no CCCD/eKYC missions and covers low-score warning", () => {
  const earnBlob = TRUST_GUIDE_HOW_TO_EARN.flatMap((row) => [
    row.titleVI,
    row.titleEN,
    row.howVI,
    row.howEN,
  ]).join("\n");
  const penaltyBlob = TRUST_GUIDE_PENALTIES.flatMap((row) => [
    row.titleVI,
    row.titleEN,
    row.actionVI,
    row.actionEN,
  ]).join("\n");
  assert.equal(/CCCD|eKYC|căn cước/i.test(earnBlob), false);
  assert.equal(/CCCD|eKYC|căn cước/i.test(penaltyBlob), false);
  assert.ok(TRUST_GUIDE_HOW_TO_EARN.some((row) => row.id === "verifiedBase" && row.points === 30));
  const warning = TRUST_GUIDE_IMPACT.find((row) => row.id === "lowScoreWarning");
  assert.ok(warning);
  assert.match(warning!.bodyEN, /No CCCD \/ eKYC/i);
  assert.match(warning!.bodyVI, /Không thu thập CCCD/);
});

test("trust guide i18n keys exist in EN and VI", () => {
  const keys = [
    "farm.trust.guide.cta",
    "farm.trust.guide.title",
    "farm.trust.guide.intro",
    "farm.trust.guide.ownerOnly",
    "farm.trust.guide.back",
    "farm.trust.guide.earnTitle",
    "farm.trust.guide.rulesTitle",
    "farm.trust.guide.impactTitle",
    "breadcrumb.farmTrust",
    "farm.warranty.createCta",
    "warranty.library.trustAwarded",
  ] as const;
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of keys) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
    assert.notEqual(enDict[key], key);
    assert.notEqual(viDict[key], key);
  }
  assert.equal(viDict["farm.trust.guide.cta"], "Xem chi tiết điểm & hướng dẫn");
  assert.equal(viDict["breadcrumb.farmTrust"], "Điểm minh bạch");
  assert.match(viDict["farm.warranty.createCta"], /điểm minh bạch/);
  assert.match(viDict["warranty.library.trustAwarded"], /điểm minh bạch/);
  assert.ok(enDict["notifications.transparencyWarningTitle"]);
  assert.ok(viDict["notifications.transparencyWarningTitle"]);
  assert.ok(enDict["notifications.adminAppealTitle"]);
  assert.ok(viDict["notifications.adminAppealTitle"]);
});
