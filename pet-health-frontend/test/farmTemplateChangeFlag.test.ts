import test from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/i18n/locales/en.json' with { type: 'json' };
import vi from '../src/i18n/locales/vi.json' with { type: 'json' };

test('farm_template_change admin feature copy exists EN/VI', () => {
  assert.ok(en.adminFeatures.items.farm_template_change?.title);
  assert.ok(vi.adminFeatures.items.farm_template_change?.title);
  assert.ok(en.adminFeatures.items.farm_template_change?.description);
  assert.ok(vi.adminFeatures.items.farm_template_change?.description);
});
