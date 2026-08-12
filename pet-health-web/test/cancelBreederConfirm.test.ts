import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

const CANCEL_BREEDER_KEYS = [
  "account.senIntro.cancelCta",
  "account.senIntro.cancelTitle",
  "account.senIntro.cancelBody",
  "account.senIntro.cancelConfirm",
  "account.senIntro.cancelKeep",
  "account.senIntro.cancelFailed",
] as const;

test("cancel breeder confirm copy exists in EN and VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const key of CANCEL_BREEDER_KEYS) {
    assert.ok(enDict[key], `missing EN ${key}`);
    assert.ok(viDict[key], `missing VI ${key}`);
    assert.notEqual(enDict[key], key);
    assert.notEqual(viDict[key], key);
  }
  assert.equal(viDict["account.senIntro.cancelKeep"], "Giữ yêu cầu");
  assert.equal(viDict["account.senIntro.cancelConfirm"], "Hủy yêu cầu");
  // Keep vs confirm must stay distinct so OK/Cancel browser dialog is not reused.
  assert.notEqual(
    viDict["account.senIntro.cancelKeep"],
    viDict["account.senIntro.cancelConfirm"],
  );
});
