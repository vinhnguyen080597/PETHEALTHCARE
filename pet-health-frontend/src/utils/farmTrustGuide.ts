import {
  COMPLIANCE_BANDS,
  COMPLIANCE_MATRIX,
  COMPLIANCE_SCORE_DEFAULT,
  complianceBandLabel,
  complianceBandMeaning,
  type ComplianceBandId,
  type ComplianceMatrixRow,
} from './breederComplianceScore.ts';
import {
  TRANSPARENCY_POINTS,
  TRANSPARENCY_TIERS,
} from './breederTransparencyScore.ts';

export type TrustGuideLang = 'VI' | 'EN';

export type TrustGuideHowToEarn = {
  id: string;
  points: number;
  titleVI: string;
  titleEN: string;
  howVI: string;
  howEN: string;
};

/** @deprecated Prefer COMPLIANCE_MATRIX — kept for older imports. */
export type TrustGuidePenalty = {
  id: string;
  points: number;
  titleVI: string;
  titleEN: string;
  actionVI: string;
  actionEN: string;
  behaviorsVI?: string;
  behaviorsEN?: string;
  tier?: number;
};

export type TrustGuideImpact = {
  id: string;
  titleVI: string;
  titleEN: string;
  bodyVI: string;
  bodyEN: string;
};

export const TRUST_GUIDE_HOW_TO_EARN: TrustGuideHowToEarn[] = [
  {
    id: 'verifiedBase',
    points: TRANSPARENCY_POINTS.verifiedBase,
    titleVI: 'Hồ sơ được admin duyệt',
    titleEN: 'Admin-approved profile',
    howVI: 'Sau khi gửi đăng ký trại, admin duyệt hồ sơ → nhận 30 điểm minh bạch cơ bản.',
    howEN: 'After submitting your kennel profile, admin approval grants 30 base transparency points.',
  },
  {
    id: 'businessLicense',
    points: TRANSPARENCY_POINTS.businessLicense,
    titleVI: 'Giấy phép kinh doanh / trại giống',
    titleEN: 'Business / kennel license',
    howVI: 'Upload ảnh giấy phép hợp lệ, admin duyệt (+30).',
    howEN: 'Upload a valid license image for admin review (+30).',
  },
  {
    id: 'farmFacility',
    points: TRANSPARENCY_POINTS.facilityVideo,
    titleVI: 'Video cơ sở / môi trường chăm sóc',
    titleEN: 'Facility tour video',
    howVI: 'Upload clip quay trại thực tế, admin duyệt (+10).',
    howEN: 'Upload a real facility video for admin review (+10).',
  },
  {
    id: 'firstWarrantyPolicy',
    points: TRANSPARENCY_POINTS.firstWarranty,
    titleVI: 'Chính sách bảo hành đầu tiên',
    titleEN: 'First warranty policy',
    howVI: 'Hoàn thành form bảo hành lần đầu, admin duyệt (+10).',
    howEN: 'Complete your first warranty policy form for admin review (+10).',
  },
  {
    id: 'facebook',
    points: TRANSPARENCY_POINTS.socialPlatform,
    titleVI: 'Liên kết Facebook (admin duyệt)',
    titleEN: 'Facebook link (admin approved)',
    howVI: 'Gửi link trang Facebook (facebook.com/yourpage), admin duyệt (+5).',
    howEN: 'Submit your Facebook page URL (facebook.com/yourpage) for admin approval (+5).',
  },
  {
    id: 'zalo',
    points: TRANSPARENCY_POINTS.socialPlatform,
    titleVI: 'Liên kết Zalo (admin duyệt)',
    titleEN: 'Zalo number (admin approved)',
    howVI: 'Gửi số điện thoại Zalo (090xxxxxxx), admin duyệt (+5).',
    howEN: 'Submit your Zalo phone number (090xxxxxxx) for admin approval (+5).',
  },
  {
    id: 'tiktok',
    points: TRANSPARENCY_POINTS.socialPlatform,
    titleVI: 'Liên kết TikTok (admin duyệt)',
    titleEN: 'TikTok link (admin approved)',
    howVI: 'Gửi link hồ sơ TikTok (tiktok.com/@username), admin duyệt (+5).',
    howEN: 'Submit your TikTok profile URL (tiktok.com/@username) for admin approval (+5).',
  },
  {
    id: 'instagram',
    points: TRANSPARENCY_POINTS.socialPlatform,
    titleVI: 'Liên kết Instagram (admin duyệt)',
    titleEN: 'Instagram link (admin approved)',
    howVI: 'Gửi link hồ sơ Instagram (instagram.com/username), admin duyệt (+5).',
    howEN: 'Submit your Instagram profile URL (instagram.com/username) for admin approval (+5).',
  },
];

export const TRUST_GUIDE_COMPLIANCE_MATRIX: ComplianceMatrixRow[] = COMPLIANCE_MATRIX;

export const TRUST_GUIDE_PENALTIES: TrustGuidePenalty[] = COMPLIANCE_MATRIX.map((row) => ({
  id: `tier_${row.tier}`,
  points: row.points,
  tier: row.tier,
  titleVI: row.titleVI,
  titleEN: row.titleEN,
  behaviorsVI: row.behaviorsVI,
  behaviorsEN: row.behaviorsEN,
  actionVI: row.actionVI,
  actionEN: row.actionEN,
}));

export const TRUST_GUIDE_TRANSPARENCY_IMPACT: TrustGuideImpact[] = [
  {
    id: 'buyer_trust',
    titleVI: 'Niềm tin người mua',
    titleEN: 'Buyer confidence',
    bodyVI:
      'Điểm minh bạch và danh hiệu trại hiện trên hồ sơ công khai giúp khách đánh giá trước khi nhắn tin.',
    bodyEN:
      'Transparency score and kennel titles appear on your public farm page for buyers.',
  },
  {
    id: 'visibility',
    titleVI: 'Độ nổi bật trong danh mục',
    titleEN: 'Directory visibility',
    bodyVI:
      'Trại điểm cao hơn thường được ưu tiên hiển thị và tạo ấn tượng tốt hơn trên thẻ trại / tin đăng.',
    bodyEN:
      'Higher scores tend to present stronger trust signals on farm cards and listings.',
  },
];

export const COMPLIANCE_GUIDE_IMPACT: TrustGuideImpact[] = [
  {
    id: 'compliance',
    titleVI: 'Điểm tuân thủ (riêng biệt)',
    titleEN: 'Separate compliance score',
    bodyVI: `Mỗi trại bắt đầu với ${COMPLIANCE_SCORE_DEFAULT} điểm tuân thủ. Chỉ trừ khi Admin xác nhận báo cáo. Mốc: 80–100 bình thường · 50–79 cảnh báo · 1–49 hạn chế · 0 khóa tài khoản.`,
    bodyEN: `Every kennel starts at ${COMPLIANCE_SCORE_DEFAULT} compliance points. Deductions only after Admin confirms a report. Bands: 80–100 normal · 50–79 warning · 1–49 severe · 0 account lock.`,
  },
  {
    id: 'recoverySoon',
    titleVI: 'Phục hồi điểm (sắp có)',
    titleEN: 'Score recovery (coming soon)',
    bodyVI:
      'Phục hồi tự động +10 sau 30 ngày không vi phạm và reset năm về 100 sẽ bổ sung sau. Hiện tại điểm tuân thủ chỉ trừ khi Admin xác nhận báo cáo.',
    bodyEN:
      'Auto +10 after 30 clean days and annual reset to 100 will ship later. For now, compliance only decreases when Admin confirms a report.',
  },
];

/** @deprecated Prefer TRUST_GUIDE_TRANSPARENCY_IMPACT + COMPLIANCE_GUIDE_IMPACT */
export const TRUST_GUIDE_IMPACT: TrustGuideImpact[] = [
  ...TRUST_GUIDE_TRANSPARENCY_IMPACT,
  ...COMPLIANCE_GUIDE_IMPACT,
];

export function trustGuideTierSummary(lang: TrustGuideLang): string[] {
  return TRANSPARENCY_TIERS.map((tier) => {
    const name = lang === 'VI' ? tier.nameVI : tier.nameEN;
    const meaning = lang === 'VI' ? tier.meaningVI : tier.meaningEN;
    const range =
      tier.min === tier.max ? `${tier.min}` : `${tier.min}–${tier.max}`;
    return `${range}: ${name} — ${meaning}`;
  });
}

export function complianceGuideBandSummary(lang: TrustGuideLang): string[] {
  const bandOrder: ComplianceBandId[] = ['normal', 'warning', 'severe', 'banned'];
  return bandOrder.map((bandId) => {
    const band = COMPLIANCE_BANDS[bandId];
    const range =
      band.min === band.max ? `${band.min}` : `${band.min}–${band.max}`;
    const label = complianceBandLabel(bandId, lang);
    const meaning = complianceBandMeaning(bandId, lang);
    return `${range}: ${label} — ${meaning}`;
  });
}

export function trustGuideLangFromLocale(locale: string | undefined): TrustGuideLang {
  return String(locale || '').toLowerCase().startsWith('vi') ? 'VI' : 'EN';
}

export function pickLangText(
  lang: TrustGuideLang,
  vi: string,
  en: string,
): string {
  return lang === 'VI' ? vi : en;
}
