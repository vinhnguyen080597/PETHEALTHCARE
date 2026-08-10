import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  LEGAL_SUPPORT_EMAIL,
  flattenLegalDoc,
  legalDocFor,
  marketplaceGuidelinesContent,
  privacyPolicyContent,
  supportContent,
  termsOfServiceContent,
} from "../src/lib/legalContent";

test("legal docs are bilingual and mention marketplace product context", () => {
  for (const kind of ["privacy", "terms", "guidelines", "support"] as const) {
    const viDoc = legalDocFor(kind, "VI");
    const enDoc = legalDocFor(kind, "EN");
    const viText = flattenLegalDoc(viDoc);
    const enText = flattenLegalDoc(enDoc);
    assert.match(viText, /PetCare: Pet Marketplace/);
    assert.match(enText, /PetCare: Pet Marketplace/);
    assert.match(viText, /Sen/);
    assert.match(enText, /Sen/);
    assert.match(viText, /Breeder/);
    assert.match(enText, /Breeder/);
  }

  const privacyVi = flattenLegalDoc(privacyPolicyContent.VI);
  assert.match(privacyVi, /không bán dữ liệu/);
  assert.match(privacyVi, /đặt cọc/);
  assert.match(privacyVi, /tin nhắn/);

  const termsVi = flattenLegalDoc(termsOfServiceContent.VI);
  assert.match(termsVi, /không phải người bán/);
  assert.match(termsVi, /bảo hành/);

  const guideVi = flattenLegalDoc(marketplaceGuidelinesContent.VI);
  assert.match(guideVi, /bàn giao/);
  assert.match(guideVi, /tranh chấp/);
  assert.match(guideVi, /động vật bảo tồn/);

  const supportVi = flattenLegalDoc(supportContent.VI);
  assert.match(
    supportVi,
    new RegExp(LEGAL_SUPPORT_EMAIL.replace(/\./g, "\\.")),
  );
  assert.match(supportVi, /URL tin đăng/);
});

test("footer legal labels stay in EN/VI parity", () => {
  for (const key of [
    "legal.privacy",
    "legal.terms",
    "legal.guidelines",
    "legal.support",
    "landing.footer.legal",
    "landing.footer.disclaimer",
  ] as const) {
    assert.ok(en[key], `missing EN ${key}`);
    assert.ok(vi[key], `missing VI ${key}`);
  }
  assert.match(vi["landing.footer.disclaimer"], /đặt cọc/);
  assert.match(en["landing.footer.disclaimer"], /soft deposits/i);
});
