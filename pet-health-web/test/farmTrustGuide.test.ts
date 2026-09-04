import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  farmComplianceGuideHref,
  farmTrustGuideHref,
  TRUST_GUIDE_HOW_TO_EARN,
  TRUST_GUIDE_IMPACT,
  TRUST_GUIDE_PENALTIES,
  TRUST_GUIDE_TRANSPARENCY_IMPACT,
  COMPLIANCE_GUIDE_IMPACT,
  complianceGuideBandSummary,
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

test("farmComplianceGuideHref builds owner compliance guide path", () => {
  assert.equal(
    farmComplianceGuideHref("bp-123"),
    "/app/breeders/bp-123/compliance",
  );
});

test("trust guide content catalogs are non-empty", () => {
  assert.ok(TRUST_GUIDE_HOW_TO_EARN.length >= 5);
  assert.ok(TRUST_GUIDE_PENALTIES.length >= 4);
  assert.ok(TRUST_GUIDE_TRANSPARENCY_IMPACT.length >= 2);
  assert.ok(COMPLIANCE_GUIDE_IMPACT.length >= 2);
  assert.ok(TRUST_GUIDE_IMPACT.length >= 3);
  assert.equal(trustGuideTierSummary("VI").length, 4);
  assert.equal(complianceGuideBandSummary("VI").length, 4);
  assert.ok(trustGuideTierSummary("VI")[0].startsWith("30–49: Trại mới"));
  assert.match(complianceGuideBandSummary("VI")[0], /80–100/);
});

test("trust guide has no CCCD/eKYC missions and covers compliance recovery note", () => {
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
  assert.equal(/không bắt buộc|optional/i.test(earnBlob), false);
  assert.equal(/CCCD|eKYC|căn cước/i.test(penaltyBlob), false);
  assert.ok(TRUST_GUIDE_HOW_TO_EARN.some((row) => row.id === "verifiedBase" && row.points === 30));
  assert.ok(
    TRUST_GUIDE_HOW_TO_EARN.some((row) => row.id === "businessLicense" && row.points === 30),
  );
  assert.equal(
    TRUST_GUIDE_HOW_TO_EARN.some((row) => row.id === "completions" || row.id === "reviews"),
    false,
  );
  for (let i = 1; i < TRUST_GUIDE_HOW_TO_EARN.length; i += 1) {
    assert.ok(
      TRUST_GUIDE_HOW_TO_EARN[i - 1]!.points >= TRUST_GUIDE_HOW_TO_EARN[i]!.points,
      "earn rows should be sorted high to low by points",
    );
  }
  assert.equal(TRUST_GUIDE_PENALTIES[0]?.points, 5);
  assert.equal(TRUST_GUIDE_PENALTIES[3]?.points, 50);
  const recovery = COMPLIANCE_GUIDE_IMPACT.find((row) => row.id === "recoverySoon");
  assert.ok(recovery);
  assert.match(recovery!.bodyEN, /ship later/i);
  const compliance = COMPLIANCE_GUIDE_IMPACT.find((row) => row.id === "compliance");
  assert.ok(compliance);
  assert.match(compliance!.bodyVI, /100 điểm tuân thủ/);
});

test("trust guide i18n keys exist in EN and VI", () => {
  const keys = [
    "farm.trust.guide.cta",
    "farm.trust.guide.title",
    "farm.trust.guide.intro",
    "farm.trust.guide.ownerOnly",
    "farm.trust.guide.back",
    "farm.trust.guide.earnTitle",
    "farm.trust.guide.earnAction",
    "farm.trust.guide.earnUpdate",
    "farm.trust.guide.earnPending",
    "farm.trust.guide.earnRejected",
    "farm.trust.guide.earnAlreadyPending",
    "farm.trust.guide.earnVideoFallback",
    "farm.trust.guide.impactTitle",
    "breadcrumb.farmTrust",
    "breadcrumb.farmCompliance",
    "farm.compliance.guide.cta",
    "farm.compliance.guide.title",
    "farm.compliance.guide.intro",
    "farm.compliance.guide.rulesTitle",
    "farm.compliance.guide.impactTitle",
    "farm.compliance.guide.bandsTitle",
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
  assert.equal(viDict["farm.trust.guide.cta"], "Xem chi tiết điểm minh bạch");
  assert.equal(viDict["farm.compliance.guide.cta"], "Xem chi tiết điểm tuân thủ");
  assert.equal(viDict["farm.trust.guide.earnPending"], "Chờ duyệt");
  assert.equal(viDict["farm.trust.guide.earnRejected"], "Từ chối");
  assert.equal(viDict["farm.trust.guide.earnUpdate"], "Cập nhật");
  assert.equal(viDict["breadcrumb.farmTrust"], "Điểm minh bạch");
  assert.equal(viDict["breadcrumb.farmCompliance"], "Điểm tuân thủ");
  assert.match(viDict["farm.warranty.createCta"], /điểm minh bạch/);
  assert.match(viDict["warranty.library.trustAwarded"], /điểm minh bạch/);
  assert.ok(enDict["notifications.transparencyWarningTitle"]);
  assert.ok(viDict["notifications.transparencyWarningTitle"]);
  assert.ok(enDict["notifications.adminAppealTitle"]);
  assert.ok(viDict["notifications.adminAppealTitle"]);
});
