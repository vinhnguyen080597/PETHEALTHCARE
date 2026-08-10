import test from "node:test";
import assert from "node:assert/strict";
import {
  LISTING_ACTION_MODAL_Z_CLASS,
  WARRANTY_POLICY_VIEWER_Z_CLASS,
} from "../src/lib/listingModalLayers";

function zRank(cls: string): number {
  const bracket = cls.match(/z-\[(\d+)\]/);
  if (bracket) return Number(bracket[1]);
  const plain = cls.match(/^z-(\d+)$/);
  if (plain) return Number(plain[1]);
  return NaN;
}

test("warranty policy viewer stacks above listing action modals", () => {
  const actionZ = zRank(LISTING_ACTION_MODAL_Z_CLASS);
  const viewerZ = zRank(WARRANTY_POLICY_VIEWER_Z_CLASS);
  assert.ok(Number.isFinite(actionZ));
  assert.ok(Number.isFinite(viewerZ));
  assert.ok(
    viewerZ > actionZ,
    `expected ${WARRANTY_POLICY_VIEWER_Z_CLASS} > ${LISTING_ACTION_MODAL_Z_CLASS}`,
  );
});
