import test from "node:test";
import assert from "node:assert/strict";
import {
  applyComplianceDeduction,
  complianceBandForScore,
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

test("deduction clamps at zero", () => {
  const result = applyComplianceDeduction(
    { compliance: { score: 10, events: [], restrictions: {} } },
    { reportId: "x", reason: "confirmed_scam" },
  );
  assert.equal(result.scoreAfter, 0);
  assert.equal(result.band, "banned");
});
