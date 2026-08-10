import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  BREEDER_TRANSPARENCY_COMMITMENTS,
  hasAllBreederCommitments,
  setBreederCommitmentsAccepted,
} from "../src/lib/breederCommitments";

test("breeder commitments single checkbox toggles both stored keys", () => {
  assert.deepEqual([...BREEDER_TRANSPARENCY_COMMITMENTS], [
    "accurate_information",
    "app_only_verification",
  ]);
  assert.equal(hasAllBreederCommitments([]), false);
  assert.equal(hasAllBreederCommitments(["accurate_information"]), false);
  const accepted = setBreederCommitmentsAccepted([], true);
  assert.equal(hasAllBreederCommitments(accepted), true);
  assert.deepEqual(accepted.sort(), [
    "accurate_information",
    "app_only_verification",
  ].sort());
  assert.equal(
    hasAllBreederCommitments(setBreederCommitmentsAccepted(accepted, false)),
    false,
  );
});

test("breeder combined commitment copy includes policy links EN/VI", () => {
  for (const key of [
    "breederForm.commitment.combinedBefore",
    "breederForm.commitment.termsLink",
    "breederForm.commitment.and",
    "breederForm.commitment.guidelinesLink",
    "breederForm.commitment.combinedAfter",
    "breederForm.commitmentsRequired",
  ] as const) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
  assert.match(vi["breederForm.commitment.combinedBefore"], /chính xác/);
  assert.match(vi["breederForm.commitment.combinedBefore"], /đã đọc và hiểu/);
  assert.equal(vi["breederForm.commitment.termsLink"], "Điều khoản dịch vụ");
  assert.equal(vi["breederForm.commitment.guidelinesLink"], "Nội quy Marketplace");
});
