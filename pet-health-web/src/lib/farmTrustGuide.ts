import type { Lang } from "./types";
import {
  LIGHT_VIOLATION_EXPIRY_DAYS,
  LIGHT_VIOLATION_MAX_POINTS,
  TRANSPARENCY_POINTS,
  TRANSPARENCY_TIERS,
  TRANSPARENCY_VIOLATION_PENALTIES,
} from "./breederTransparencyScore";

/** Owner-only transparency guide page. */
export function farmTrustGuideHref(profileId: string): string {
  return `/app/breeders/${encodeURIComponent(profileId)}/trust`;
}

export type TrustGuideHowToEarn = {
  id: string;
  points: number;
  titleVI: string;
  titleEN: string;
  howVI: string;
  howEN: string;
};

export type TrustGuidePenalty = {
  id: string;
  points: number;
  titleVI: string;
  titleEN: string;
  actionVI: string;
  actionEN: string;
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
    id: "verifiedBase",
    points: TRANSPARENCY_POINTS.verifiedBase,
    titleVI: "Hồ sơ được admin duyệt",
    titleEN: "Admin-approved profile",
    howVI: "Sau khi gửi đăng ký trại, admin duyệt hồ sơ → nhận 30 điểm minh bạch cơ bản.",
    howEN: "After submitting your kennel profile, admin approval grants 30 base transparency points.",
  },
  {
    id: "businessLicense",
    points: TRANSPARENCY_POINTS.businessLicense,
    titleVI: "Giấy phép kinh doanh / trại giống",
    titleEN: "Business / kennel license",
    howVI: "Upload ảnh giấy phép hợp lệ, admin duyệt (+30).",
    howEN: "Upload a valid license image for admin review (+30).",
  },
  {
    id: "farmFacility",
    points: TRANSPARENCY_POINTS.facilityVideo,
    titleVI: "Video cơ sở / môi trường chăm sóc",
    titleEN: "Facility tour video",
    howVI: "Upload clip quay trại thực tế, admin duyệt (+10).",
    howEN: "Upload a real facility video for admin review (+10).",
  },
  {
    id: "firstWarrantyPolicy",
    points: TRANSPARENCY_POINTS.firstWarranty,
    titleVI: "Chính sách bảo hành đầu tiên",
    titleEN: "First warranty policy",
    howVI: "Hoàn thành form bảo hành lần đầu, admin duyệt (+10).",
    howEN: "Complete your first warranty policy form for admin review (+10).",
  },
  {
    id: "facebook",
    points: TRANSPARENCY_POINTS.socialPlatform,
    titleVI: "Liên kết Facebook (admin duyệt)",
    titleEN: "Facebook link (admin approved)",
    howVI: "Gửi link trang Facebook (facebook.com/yourpage), admin duyệt (+5).",
    howEN: "Submit your Facebook page URL (facebook.com/yourpage) for admin approval (+5).",
  },
  {
    id: "zalo",
    points: TRANSPARENCY_POINTS.socialPlatform,
    titleVI: "Liên kết Zalo (admin duyệt)",
    titleEN: "Zalo number (admin approved)",
    howVI: "Gửi số điện thoại Zalo (090xxxxxxx), admin duyệt (+5).",
    howEN: "Submit your Zalo phone number (090xxxxxxx) for admin approval (+5).",
  },
  {
    id: "tiktok",
    points: TRANSPARENCY_POINTS.socialPlatform,
    titleVI: "Liên kết TikTok (admin duyệt)",
    titleEN: "TikTok link (admin approved)",
    howVI: "Gửi link hồ sơ TikTok (tiktok.com/@username), admin duyệt (+5).",
    howEN: "Submit your TikTok profile URL (tiktok.com/@username) for admin approval (+5).",
  },
  {
    id: "instagram",
    points: TRANSPARENCY_POINTS.socialPlatform,
    titleVI: "Liên kết Instagram (admin duyệt)",
    titleEN: "Instagram link (admin approved)",
    howVI: "Gửi link hồ sơ Instagram (instagram.com/username), admin duyệt (+5).",
    howEN: "Submit your Instagram profile URL (instagram.com/username) for admin approval (+5).",
  },
];

export const TRUST_GUIDE_PENALTIES: TrustGuidePenalty[] = [
  {
    id: "inaccurate_listing",
    points: TRANSPARENCY_VIOLATION_PENALTIES.inaccurate_listing,
    titleVI: "Đăng thông tin không chính xác",
    titleEN: "Inaccurate listing information",
    actionVI: "An ninh gỡ bài vi phạm.",
    actionEN: "Security removes the violating listing.",
  },
  {
    id: "stock_photo_spam",
    points: TRANSPARENCY_VIOLATION_PENALTIES.stock_photo_spam,
    titleVI: "Dùng ảnh mạng / spam bài ảo",
    titleEN: "Stock photos / fake spam listings",
    actionVI: "Tạm ẩn bài đăng.",
    actionEN: "Listing is temporarily hidden.",
  },
  {
    id: "abusive_communication",
    points: TRANSPARENCY_VIOLATION_PENALTIES.abusive_communication,
    titleVI: "Thái độ giao tiếp độc hại",
    titleEN: "Abusive communication",
    actionVI: "Cảnh cáo hệ thống.",
    actionEN: "System warning issued.",
  },
  {
    id: "concealed_illness",
    points: TRANSPARENCY_VIOLATION_PENALTIES.concealed_illness,
    titleVI: "Che giấu bệnh nặng (Care/Parvo…)",
    titleEN: "Concealing serious illness",
    actionVI: "Yêu cầu đền bù theo chính sách sàn.",
    actionEN: "Compensation may be required per platform policy.",
  },
  {
    id: "confirmed_scam",
    points: TRANSPARENCY_VIOLATION_PENALTIES.confirmed_scam,
    titleVI: "Lừa đảo / tráo bé cưng (xác nhận)",
    titleEN: "Confirmed scam / bait-and-switch",
    actionVI: "Tạm khóa tin đăng / liên hệ 30 ngày (và khóa nhận cọc nếu Escrow đang mở).",
    actionEN: "Pause listings/contact for 30 days (and lock deposit intake if Escrow is on).",
  },
];

export const TRUST_GUIDE_IMPACT: TrustGuideImpact[] = [
  {
    id: "buyer_trust",
    titleVI: "Niềm tin người mua",
    titleEN: "Buyer confidence",
    bodyVI:
      "Điểm minh bạch và danh hiệu trại hiện trên hồ sơ công khai giúp khách đánh giá trước khi nhắn tin.",
    bodyEN:
      "Transparency score and kennel titles appear on your public farm page for buyers.",
  },
  {
    id: "visibility",
    titleVI: "Độ nổi bật trong danh mục",
    titleEN: "Directory visibility",
    bodyVI:
      "Trại điểm cao hơn thường được ưu tiên hiển thị và tạo ấn tượng tốt hơn trên thẻ trại / tin đăng.",
    bodyEN:
      "Higher scores tend to present stronger trust signals on farm cards and listings.",
  },
  {
    id: "penalties",
    titleVI: "Vi phạm làm giảm điểm",
    titleEN: "Violations reduce score",
    bodyVI: `Chỉ trừ điểm khi báo cáo được Admin xác nhận. Vi phạm nhẹ (≤${LIGHT_VIOLATION_MAX_POINTS}đ) có thể hết hiệu lực sau ${LIGHT_VIOLATION_EXPIRY_DAYS} ngày nếu không tái phạm.`,
    bodyEN: `Points drop only after Admin confirms a report. Light penalties (≤${LIGHT_VIOLATION_MAX_POINTS}) may expire after ${LIGHT_VIOLATION_EXPIRY_DAYS} days without repeat offenses.`,
  },
  {
    id: "lowScoreWarning",
    titleVI: "Cảnh báo ≤15 điểm",
    titleEN: "Warning at ≤15 points",
    bodyVI:
      "Sau phạt nếu điểm minh bạch ≤15, bạn nhận popup: Xác nhận (tạm khóa tài khoản) hoặc Kháng cáo (Admin xem xét). Không thu thập CCCD / eKYC.",
    bodyEN:
      "After a penalty, if transparency score is ≤15 you get a popup: Confirm (suspend account) or Appeal (Admin review). No CCCD / eKYC collection.",
  },
];

export function trustGuideTierSummary(lang: Lang): string[] {
  return TRANSPARENCY_TIERS.map((tier) => {
    const name = lang === "VI" ? tier.nameVI : tier.nameEN;
    const meaning = lang === "VI" ? tier.meaningVI : tier.meaningEN;
    const range =
      tier.min === tier.max ? `${tier.min}` : `${tier.min}–${tier.max}`;
    return `${tier.level} (${range}): ${name} — ${meaning}`;
  });
}

export function pickLangText(
  lang: Lang,
  vi: string,
  en: string,
): string {
  return lang === "VI" ? vi : en;
}
