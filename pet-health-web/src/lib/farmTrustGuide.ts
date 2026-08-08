import type { Lang } from "./types";
import {
  LIGHT_VIOLATION_EXPIRY_DAYS,
  LIGHT_VIOLATION_MAX_POINTS,
  TRUST_MISSION_POINTS,
  TRUST_TIERS,
  TRUST_TRANSACTION_CAPS,
  TRUST_VIOLATION_PENALTIES,
} from "./breederTrust";

/** Owner-only trust guide page. */
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

/** Missions + activity that raise score (Escrow deferred). */
export const TRUST_GUIDE_HOW_TO_EARN: TrustGuideHowToEarn[] = [
  {
    id: "ekyc",
    points: TRUST_MISSION_POINTS.ekyc,
    titleVI: "Xác minh danh tính (eKYC)",
    titleEN: "Identity verification (eKYC)",
    howVI: "Cung cấp CCCD/Passport chính chủ kèm ảnh chân dung khớp. Admin/AI duyệt.",
    howEN: "Submit your ID/passport with a matching selfie. Admin/AI review required.",
  },
  {
    id: "facebook",
    points: TRUST_MISSION_POINTS.facebook,
    titleVI: "Liên kết Facebook",
    titleEN: "Link Facebook",
    howVI: "Thêm Facebook cá nhân/Fanpage đang hoạt động, công khai danh tính.",
    howEN: "Add an active personal/Fanpage Facebook with a public identity.",
  },
  {
    id: "zalo",
    points: TRUST_MISSION_POINTS.zalo,
    titleVI: "Liên kết Zalo",
    titleEN: "Link Zalo",
    howVI: "Thêm Zalo chính chủ khớp số điện thoại đăng ký.",
    howEN: "Add your Zalo matching the registered phone number.",
  },
  {
    id: "tiktok",
    points: TRUST_MISSION_POINTS.tiktok,
    titleVI: "Liên kết TikTok",
    titleEN: "Link TikTok",
    howVI: "Thêm kênh TikTok chuyên pet có clip quay thực tế thú cưng.",
    howEN: "Add a pet-focused TikTok with real animal footage.",
  },
  {
    id: "farmFacility",
    points: TRUST_MISSION_POINTS.farmFacility,
    titleVI: "Địa chỉ & video cơ sở",
    titleEN: "Facility address & video",
    howVI: "Cập nhật địa chỉ chuồng trại và video quay cơ sở có gắn địa chỉ/thực tế.",
    howEN: "Add kennel address plus a real facility video tied to that location.",
  },
  {
    id: "businessLicense",
    points: TRUST_MISSION_POINTS.businessLicense,
    titleVI: "Giấy phép kinh doanh / trại giống",
    titleEN: "Business / kennel license",
    howVI: "Đăng tải giấy chứng nhận đăng ký kinh doanh hoặc trại giống hợp lệ.",
    howEN: "Upload a valid business or kennel registration certificate.",
  },
  {
    id: "healthDocs",
    points: TRUST_MISSION_POINTS.healthDocs,
    titleVI: "Bảo trợ sức khỏe (sổ tiêm)",
    titleEN: "Health docs (vaccine book)",
    howVI: "Đăng sổ tiêm chủng mẫu / giấy kiểm dịch đủ tem vắc-xin & dấu phòng khám.",
    howEN: "Upload sample vaccine books / quarantine papers with clinic stamps.",
  },
  {
    id: "reviews",
    points: TRUST_TRANSACTION_CAPS.reviews,
    titleVI: "Đánh giá 5 sao từ khách (tối đa)",
    titleEN: "5★ buyer reviews (cap)",
    howVI: "Mỗi đánh giá 5★ từ người mua thật +1 điểm (tối đa 10).",
    howEN: "Each real 5★ buyer review adds +1 point (capped at 10).",
  },
  {
    id: "response",
    points: TRUST_TRANSACTION_CAPS.response,
    titleVI: "Phản hồi tin nhắn < 15 phút",
    titleEN: "Reply under 15 minutes",
    howVI: "Duy trì tỷ lệ trả lời tin nhắn dưới 15 phút trong tháng để nhận +5.",
    howEN: "Keep a sub-15-minute reply rate for the month to earn +5.",
  },
];

export const TRUST_GUIDE_PENALTIES: TrustGuidePenalty[] = [
  {
    id: "inaccurate_listing",
    points: TRUST_VIOLATION_PENALTIES.inaccurate_listing,
    titleVI: "Đăng thông tin không chính xác",
    titleEN: "Inaccurate listing information",
    actionVI: "An ninh gỡ bài vi phạm.",
    actionEN: "Security removes the violating listing.",
  },
  {
    id: "stock_photo_spam",
    points: TRUST_VIOLATION_PENALTIES.stock_photo_spam,
    titleVI: "Dùng ảnh mạng / spam bài ảo",
    titleEN: "Stock photos / fake spam listings",
    actionVI: "Tạm ẩn bài đăng.",
    actionEN: "Listing is temporarily hidden.",
  },
  {
    id: "abusive_communication",
    points: TRUST_VIOLATION_PENALTIES.abusive_communication,
    titleVI: "Thái độ giao tiếp độc hại",
    titleEN: "Abusive communication",
    actionVI: "Cảnh cáo hệ thống.",
    actionEN: "System warning issued.",
  },
  {
    id: "concealed_illness",
    points: TRUST_VIOLATION_PENALTIES.concealed_illness,
    titleVI: "Che giấu bệnh nặng (Care/Parvo…)",
    titleEN: "Concealing serious illness",
    actionVI: "Yêu cầu đền bù theo chính sách sàn.",
    actionEN: "Compensation may be required per platform policy.",
  },
  {
    id: "confirmed_scam",
    points: TRUST_VIOLATION_PENALTIES.confirmed_scam,
    titleVI: "Lừa đảo / tráo bé cưng (xác nhận)",
    titleEN: "Confirmed scam / bait-and-switch",
    actionVI: "Khóa tính năng nhận cọc 30 ngày (khi tính năng đặt cọc mở).",
    actionEN: "Deposit features locked for 30 days (when deposits ship).",
  },
];

export const TRUST_GUIDE_IMPACT: TrustGuideImpact[] = [
  {
    id: "buyer_trust",
    titleVI: "Niềm tin người mua",
    titleEN: "Buyer confidence",
    bodyVI:
      "Điểm và cấp độ (L0–L4) hiện trên hồ sơ công khai giúp khách nhanh chóng đánh giá mức minh bạch của trại trước khi nhắn tin.",
    bodyEN:
      "Score and tier (L0–L4) appear on your public farm page so buyers can gauge transparency before messaging.",
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
    bodyEN: `Points drop only after Admin confirms a report. Light penalties (≤${LIGHT_VIOLATION_MAX_POINTS}) may expire after ${LIGHT_VIOLATION_EXPIRY_DAYS} days if not repeated.`,
  },
];

export function trustGuideTierSummary(lang: Lang): string[] {
  return TRUST_TIERS.map((tier) => {
    const name = lang === "VI" ? tier.nameVI : tier.nameEN;
    const meaning = lang === "VI" ? tier.meaningVI : tier.meaningEN;
    return `${tier.level} (${tier.min}–${tier.max}): ${name} — ${meaning}`;
  });
}

export function pickLangText(
  lang: Lang,
  vi: string,
  en: string,
): string {
  return lang === "VI" ? vi : en;
}
