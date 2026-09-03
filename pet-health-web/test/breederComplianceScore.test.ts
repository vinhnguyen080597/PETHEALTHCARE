import test from "node:test";
import assert from "node:assert/strict";
import {
  applyComplianceDeduction,
  complianceBandForScore,
  complianceScoreColor,
  complianceTickColor,
  COMPLIANCE_MATRIX,
  getComplianceScoreFromMetadata,
  mapReportReasonToCompliance,
} from "../src/lib/breederComplianceScore";

test("compliance score defaults to 100 and maps tiers", () => {
  assert.equal(getComplianceScoreFromMetadata({}), 100);
  assert.equal(mapReportReasonToCompliance("forged_documents").points, 25);
  assert.equal(complianceBandForScore(50), "warning");
  assert.equal(COMPLIANCE_MATRIX.length, 4);
});

test("a clean 100 gauge reads green and only warns after deductions", () => {
  assert.equal(complianceScoreColor(100), "#10B981");
  assert.equal(complianceScoreColor(65), "#F59E0B");
  assert.equal(complianceScoreColor(20), "#EF4444");
  assert.equal(complianceTickColor(100, 100), "#10B981");
  assert.equal(complianceTickColor(1, 100), "#10B981");
  assert.equal(complianceTickColor(90, 80), "#E5E7EB");
});

test("deduction clamps at zero", () => {
  const result = applyComplianceDeduction(
    { compliance: { score: 10, events: [], restrictions: {} } },
    { reportId: "x", reason: "confirmed_scam" },
  );
  assert.equal(result.scoreAfter, 0);
  assert.equal(result.band, "banned");
});
