import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APP_FEATURE_FLAGS,
  isFarmTemplateChangeEnabled,
} from "../src/lib/featureFlags";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";

test("farm template change defaults on and respects admin override", () => {
  assert.equal(DEFAULT_APP_FEATURE_FLAGS.farm_template_change, true);
  assert.equal(isFarmTemplateChangeEnabled(null), true);
  assert.equal(isFarmTemplateChangeEnabled({ farm_template_change: false }), false);
  assert.equal(
    isFarmTemplateChangeEnabled({ farm_template_change: false }, true),
    true,
  );
  assert.equal(isFarmTemplateChangeEnabled({ farm_template_change: true }), true);
});

test("farm_template_change admin feature copy exists EN/VI", () => {
  const enDict = en as Record<string, string>;
  const viDict = vi as Record<string, string>;
  assert.ok(enDict["admin.features.farm_template_change.title"]);
  assert.ok(viDict["admin.features.farm_template_change.title"]);
  assert.ok(enDict["admin.features.farm_template_change.desc"]);
  assert.ok(viDict["admin.features.farm_template_change.desc"]);
});
