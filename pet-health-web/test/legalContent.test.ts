import test from "node:test";
import assert from "node:assert/strict";
import en from "../src/i18n/en";
import vi from "../src/i18n/vi";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_SUPPORT_EMAIL,
  flattenLegalDoc,
  legalDocFor,
  marketplaceGuidelinesContent,
  privacyPolicyContent,
  renderLegalMarkdown,
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
  assert.match(privacyVi, /Nghị định 13\/2023/);
  assert.match(privacyVi, /72 giờ/);
  assert.match(privacyVi, /đặt cọc/);
  assert.match(privacyVi, /tin nhắn/);
  assert.match(privacyVi, new RegExp(LEGAL_CONTACT_EMAIL.replace(/\./g, "\\.")));

  const termsVi = flattenLegalDoc(termsOfServiceContent.VI);
  assert.match(termsVi, /KHÔNG phải là người bán/);
  assert.match(termsVi, /Sàn giao dịch TMĐT/);
  assert.match(termsVi, /24 giờ/);
  assert.match(termsVi, /động vật hoang dã/);
  assert.match(termsVi, /bảo hành/);
  assert.match(termsVi, /quảng bá, truyền thông/);
  assert.match(flattenLegalDoc(termsOfServiceContent.EN), /marketing or communications/i);
  assert.match(termsVi, /không đủ chuyên môn/);
  assert.match(termsVi, /hủy bỏ tài khoản vi phạm/);
  assert.match(flattenLegalDoc(termsOfServiceContent.EN), /Content liability disclaimer/);
  assert.match(flattenLegalDoc(termsOfServiceContent.EN), /without prior notice/);

  const guideVi = flattenLegalDoc(marketplaceGuidelinesContent.VI);
  assert.match(guideVi, /bàn giao/);
  assert.match(guideVi, /tranh chấp/);
  assert.match(guideVi, /Sách Đỏ Việt Nam/);
  assert.match(guideVi, /CITES/);
  assert.match(guideVi, /miễn trừ toàn bộ trách nhiệm/);
  assert.match(flattenLegalDoc(marketplaceGuidelinesContent.EN), /CITES/);
  assert.match(guideVi, /KHÔNG trực tiếp cung cấp dịch vụ vận chuyển/);
  assert.match(guideVi, /03 ngày làm việc/);
  assert.match(guideVi, /quảng bá, truyền thông/);
  assert.match(
    flattenLegalDoc(marketplaceGuidelinesContent.EN),
    /marketing or communications/i,
  );
  assert.match(flattenLegalDoc(marketplaceGuidelinesContent.EN), /does NOT itself provide pet shipping/i);

  const supportVi = flattenLegalDoc(supportContent.VI);
  assert.match(
    supportVi,
    new RegExp(LEGAL_SUPPORT_EMAIL.replace(/\./g, "\\.")),
  );
  assert.match(
    supportVi,
    new RegExp(LEGAL_CONTACT_EMAIL.replace(/\./g, "\\.")),
  );
  assert.match(supportVi, /URL tin đăng/);
  assert.match(supportVi, /08:30/);
  assert.match(supportVi, /24 đến 48 giờ/);
});

test("Vietnamese legal markdown export includes BCT operator and process sections", () => {
  const md = [
    renderLegalMarkdown("1. Chính sách bảo mật", privacyPolicyContent.VI),
    renderLegalMarkdown("2. Điều khoản dịch vụ", termsOfServiceContent.VI),
    renderLegalMarkdown("3. Nội quy Marketplace", marketplaceGuidelinesContent.VI),
    renderLegalMarkdown("4. Hỗ trợ", supportContent.VI),
  ].join("\n\n");
  assert.match(md, /CÔNG TY TNHH PETCARE VIỆT NAM/);
  assert.match(md, /Nghị định 13\/2023/);
  assert.match(md, /Quy trình 4 bước/);
  assert.match(md, /support@pet-marketplace\.org/);
  assert.match(md, /CITES/);
  assert.match(md, /Cơ chế miễn trừ trách nhiệm nội dung/);
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
