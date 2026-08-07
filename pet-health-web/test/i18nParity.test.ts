import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en.ts";
import vi from "../src/i18n/vi.ts";
import {
  HISTORY_ACTION_FILTERS,
  historyActionI18nKey,
} from "../src/lib/admin/filters.ts";

const REQUIRED_PREFIXES = [
  "admin.history.",
  "notifications.",
  "admin.nav.history",
] as const;

test("EN and VI dictionaries stay in key parity for admin/history notifications", () => {
  const enKeys = Object.keys(en);
  const viKeys = new Set(Object.keys(vi));
  const missingInVi = enKeys.filter(
    (key) =>
      REQUIRED_PREFIXES.some((prefix) => key.startsWith(prefix) || key === prefix) &&
      !viKeys.has(key),
  );
  assert.deepEqual(missingInVi, []);
});

test("every HISTORY_ACTION_FILTERS value has EN and VI labels", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  for (const action of HISTORY_ACTION_FILTERS) {
    if (action === "all") continue;
    const key = historyActionI18nKey(action);
    assert.ok(enDict[key], `missing EN key ${key}`);
    assert.ok(viDict[key], `missing VI key ${key}`);
    assert.notEqual(enDict[key], key);
    assert.notEqual(viDict[key], key);
  }
});
