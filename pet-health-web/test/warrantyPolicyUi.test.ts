import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import { TRUST_UI_CAPS } from "../src/lib/breederTrust";
import { farmPetAvailability } from "../src/lib/farmPets";
import {
  defaultWarrantyFormValues,
  formatDewormingDateLabel,
  isDewormingDateValue,
  warrantyFormToApiBody,
  warrantyPolicyToFormValues,
} from "../src/lib/warrantyPolicyForm";
import { warrantyLibraryEditHref } from "../src/lib/farmTabs";
import { mapWarrantyPolicy } from "../src/lib/mappers";
import {
  formatVaccineShotLabel,
  warrantyCoverageRows,
  warrantyHandoverCards,
  warrantySummaryChips,
} from "../src/lib/warrantyPolicyView";

const KEYS = [
  "farm.warranty.title",
  "farm.warranty.note",
  "farm.warranty.createButton",
  "farm.warranty.menu",
  "farm.warranty.update",
  "farm.warranty.delete",
  "warranty.viewCta",
  "warranty.library.title",
  "warranty.library.save",
  "warranty.library.update",
  "warranty.library.edit",
  "warranty.library.formRequired",
  "warranty.library.createAnotherTitle",
  "warranty.library.createAnotherBody",
  "warranty.library.createAnotherDone",
  "warranty.library.createAnotherCreate",
  "warranty.library.trustAwarded",
  "warranty.pillar.handover",
  "warranty.pillar.coverage",
  "warranty.pillar.buyer",
  "warranty.pillar.exclusions",
  "warranty.pillar.remedies",
  "warranty.pillar.claim",
  "warranty.field.careParvo",
  "warranty.field.careParvo.dog",
  "warranty.field.careParvo.cat",
  "warranty.vaccine.placeholder.dog",
  "warranty.vaccine.preset.cat_3in1",
  "warranty.guideline.no_bath_7_days",
  "warranty.exclusion.accident_trauma",
  "warranty.evidence.rapid_test_photo",
  "warranty.viewer.healthTitle",
  "warranty.viewer.summaryCareParvo",
  "warranty.viewer.summaryMedicalFee",
  "warranty.viewer.coverageBadge",
  "warranty.viewer.withinHours",
  "warranty.viewer.healthBookLabel",
  "warranty.viewer.healthBookYes",
  "listing.new.warranty",
  "listing.status.deposit_hold",
  "deal.requestDeposit",
  "deal.warrantyRequired",
  "warranty.attachForDeposit",
  "warranty.attachTitle",
  "warranty.attachSave",
  "warranty.updateCta",
  "warranty.noneTitle",
  "warranty.noneHint",
  "farm.owner.editProfile",
] as const;

test("warranty / deposit i18n keys exist in EN and VI", () => {
  for (const key of KEYS) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
});

test("first warranty trust award is +10", () => {
  assert.equal(TRUST_UI_CAPS.firstWarrantyPolicy, 10);
});

test("deposit_hold is a farm pet availability", () => {
  assert.equal(
    farmPetAvailability({ status: "deposit_hold" }),
    "deposit_hold",
  );
});

test("warranty form maps to API body without file fields", () => {
  const body = warrantyFormToApiBody({
    ...defaultWarrantyFormValues(),
    title: "Standard Care 14",
    careParvoCoverageDays: 14,
    medicalFeeSupportPercent: 50,
  });
  assert.equal(body.title, "Standard Care 14");
  assert.equal(body.care_parvo_coverage_days, 14);
  assert.equal(body.medical_fee_support_percent, 50);
  assert.ok(!("file_url" in body));
});

test("mapWarrantyPolicy reads structured fields", () => {
  const mapped = mapWarrantyPolicy({
    id: "p1",
    title: "Policy",
    care_parvo_coverage_days: 14,
    vaccine_shots_count: 2,
    medical_fee_support_percent: 50,
    buyer_guidelines: ["no_bath_7_days"],
  });
  assert.ok(mapped);
  assert.equal(mapped?.careParvoCoverageDays, 14);
  assert.equal(mapped?.vaccineShotsCount, 2);
  assert.deepEqual(mapped?.buyerGuidelines, ["no_bath_7_days"]);
});

test("warranty viewer summary chips highlight key metrics", () => {
  const chips = warrantySummaryChips({
    vaccineShotsCount: 2,
    vaccineTypes: "Zoetis",
    careParvoCoverageDays: 7,
    medicalFeeSupportPercent: 50,
  });
  assert.deepEqual(
    chips.map((c) => c.id),
    ["vaccine", "careParvo", "medicalFee"],
  );
  assert.equal(
    formatVaccineShotLabel("{n} mũi", 2, "Zoetis"),
    "2 mũi (Zoetis)",
  );
});

test("warranty coverage rows use scan-friendly tones", () => {
  const rows = warrantyCoverageRows({
    careParvoCoverageDays: 7,
    respiratorySkinCoverageDays: 3,
    congenitalCoverageDays: 30,
  });
  assert.equal(rows[0]?.tone, "amber");
  assert.equal(rows[1]?.tone, "sky");
  assert.equal(rows[2]?.tone, "violet");
  assert.equal(rows[0]?.days, 7);
});

test("warranty handover cards prefer 2-column grid fields", () => {
  const cards = warrantyHandoverCards({
    vaccineShotsCount: 2,
    vaccineTypes: "Zoetis",
    dewormingNote: "21-07-2026",
    hasHealthBook: true,
  });
  assert.deepEqual(
    cards.map((c) => c.id),
    ["vaccine", "deworming", "healthBook"],
  );
});

test("warranty save success popup copy avoids Sen and Yes/No labels", () => {
  assert.match(vi["warranty.library.createAnotherTitle"], /Đã lưu/i);
  assert.doesNotMatch(vi["warranty.library.createAnotherBody"], /Sen/i);
  assert.equal(vi["warranty.library.createAnotherDone"], "Hoàn tất");
  assert.match(vi["warranty.library.createAnotherCreate"], /Tạo chính sách/);
  assert.equal(en["warranty.library.createAnotherDone"], "Done");
  assert.match(en["warranty.library.createAnotherCreate"], /Create another/i);
});

test("warranty policy name required message exists EN/VI", () => {
  assert.match(vi["warranty.library.formRequired"], /tên chính sách/i);
  assert.match(en["warranty.library.formRequired"], /policy name/i);
});

test("farm warranty note is friendly without Sen jargon", () => {
  assert.doesNotMatch(vi["farm.warranty.note"], /Sen/i);
  assert.doesNotMatch(vi["farm.warranty.note"], /6 trụ cột/i);
  assert.doesNotMatch(en["farm.warranty.note"], /Sen/i);
  assert.match(vi["farm.warranty.note"], /chốt cọc/i);
});

test("warranty library edit href deep-links policy id", () => {
  assert.equal(
    warrantyLibraryEditHref("p1"),
    "/app/account/warranty?edit=p1",
  );
});

test("warrantyPolicyToFormValues prefills edit form", () => {
  const values = warrantyPolicyToFormValues({
    title: "Care 7",
    vaccineShotsCount: 2,
    vaccineTypes: "Zoetis",
    dewormingNote: "2026-07-21",
    hasHealthBook: true,
    careParvoCoverageDays: 7,
    respiratorySkinCoverageDays: 3,
    congenitalCoverageDays: 30,
    reportWithinHours: 24,
    vetRequirement: "farm_designated",
    buyerGuidelines: ["no_bath_7_days"],
    exclusions: ["accident_trauma"],
    medicalFeeSupportPercent: 50,
    allowEquivalentSwap: true,
    shippingParty: "split",
    evidenceRequired: ["symptom_video"],
    breederResponseHours: 12,
  });
  assert.equal(values.title, "Care 7");
  assert.equal(values.careParvoCoverageDays, 7);
  assert.equal(values.vetRequirement, "farm_designated");
  assert.deepEqual(values.buyerGuidelines, ["no_bath_7_days"]);
});

test("deworming note accepts calendar YYYY-MM-DD and formats for display", () => {
  assert.equal(isDewormingDateValue("2026-07-21"), true);
  assert.equal(isDewormingDateValue("Dewormed last week"), false);
  assert.equal(formatDewormingDateLabel("2026-07-21"), "21-7-2026");
  const body = warrantyFormToApiBody({
    ...defaultWarrantyFormValues(),
    title: "Care",
    dewormingNote: "2026-07-21",
  });
  assert.equal(body.deworming_note, "2026-07-21");
});
