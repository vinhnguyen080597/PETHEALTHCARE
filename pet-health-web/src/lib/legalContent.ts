import type { Lang } from "@/lib/types";

export const LEGAL_SUPPORT_EMAIL = "cattieshealthcare@gmail.com";

export type LegalSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDoc = {
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export const privacyPolicyContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: "Last updated: August 2026",
    intro:
      "PetCare: Pet Marketplace (“we”) operates the app and marketplace that connects Sen (pet seekers) with Breeders and farms. This Privacy Policy explains what we collect and how we use it.",
    sections: [
      {
        heading: "Information we collect",
        bullets: [
          "Account details such as name, email, phone, and profile photos you provide.",
          "Farm / Breeder profile information, verification documents you upload for review, and listing content (photos, videos, pet details, warranty terms).",
          "Messages, comments, notifications, and soft-deposit / deal activity metadata needed to run conversations and deposit holds between users.",
          "Basic usage and device data (for example app version, pages viewed, crash diagnostics) to keep the product reliable and safe.",
        ],
      },
      {
        heading: "How we use information",
        bullets: [
          "Operate marketplace features: browse listings, farm pages, chat, deposits, handoff records, and warranties attached to listings.",
          "Review Breeder applications and listings, moderate abuse, and respond to support requests.",
          "Send service notifications (for example new messages, deposit updates, listing review results).",
        ],
      },
      {
        heading: "Sharing and visibility",
        paragraphs: [
          "We do not sell personal data. Information you put in public listings or farm profiles is visible to other users. Contact details and chat content are shared with the people you message as part of normal marketplace use. Admins may access relevant records to investigate reports, disputes, or safety issues.",
        ],
      },
      {
        heading: "Retention and your choices",
        paragraphs: [
          "We keep account and transaction-related records as long as needed to provide the service, resolve disputes, and meet legal obligations. You may update profile information in the app or request account help via Support.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Privacy questions: ${LEGAL_SUPPORT_EMAIL}`],
      },
    ],
  },
  VI: {
    updated: "Cập nhật lần cuối: tháng 8/2026",
    intro:
      "PetCare: Pet Marketplace (“chúng tôi”) vận hành ứng dụng và marketplace kết nối Sen (người tìm thú cưng) với Breeder / trại giống. Chính sách này mô tả dữ liệu chúng tôi thu thập và cách sử dụng.",
    sections: [
      {
        heading: "Dữ liệu thu thập",
        bullets: [
          "Thông tin tài khoản như tên, email, số điện thoại và ảnh hồ sơ bạn cung cấp.",
          "Hồ sơ trại / Breeder, giấy tờ xác minh bạn gửi để duyệt, và nội dung tin đăng (ảnh, video, thông tin thú, điều khoản bảo hành).",
          "Tin nhắn, bình luận, thông báo và metadata liên quan đặt cọc / giao dịch để vận hành hội thoại và giữ cọc giữa các bên.",
          "Dữ liệu sử dụng và thiết bị cơ bản (phiên bản app, trang đã xem, nhật ký lỗi) nhằm giữ sản phẩm ổn định và an toàn.",
        ],
      },
      {
        heading: "Mục đích sử dụng",
        bullets: [
          "Vận hành marketplace: xem tin, trang trại, chat, đặt cọc, bàn giao và chính sách bảo hành gắn với tin đăng.",
          "Duyệt hồ sơ Breeder và tin đăng, xử lý báo cáo / lạm dụng, và hỗ trợ người dùng.",
          "Gửi thông báo dịch vụ (tin nhắn mới, cập nhật cọc, kết quả duyệt tin…).",
        ],
      },
      {
        heading: "Chia sẻ và hiển thị",
        paragraphs: [
          "Chúng tôi không bán dữ liệu cá nhân. Thông tin bạn đưa lên tin công khai hoặc hồ sơ trại có thể được người dùng khác xem. Thông tin liên hệ và nội dung chat được chia sẻ với người bạn nhắn tin trong quá trình dùng marketplace. Admin có thể truy cập hồ sơ liên quan để xử lý báo cáo, tranh chấp hoặc vấn đề an toàn.",
        ],
      },
      {
        heading: "Lưu trữ và lựa chọn của bạn",
        paragraphs: [
          "Chúng tôi lưu hồ sơ tài khoản và dữ liệu liên quan giao dịch trong thời gian cần thiết để cung cấp dịch vụ, giải quyết tranh chấp và tuân thủ pháp luật. Bạn có thể cập nhật hồ sơ trong app hoặc liên hệ Hỗ trợ để được giúp về tài khoản.",
        ],
      },
      {
        heading: "Liên hệ",
        paragraphs: [`Thắc mắc về bảo mật: ${LEGAL_SUPPORT_EMAIL}`],
      },
    ],
  },
};

export const termsOfServiceContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: "Last updated: August 2026",
    intro:
      "These Terms govern use of PetCare: Pet Marketplace (web and app). By creating an account or posting/browsing listings you agree to these Terms and the Marketplace Guidelines.",
    sections: [
      {
        heading: "What PetCare: Pet Marketplace provides",
        paragraphs: [
          "We provide tools for Sen and Breeders to discover pets, view farm profiles, message each other, attach warranty policies to listings, and coordinate soft deposits / handoffs according to terms shown in the product. Listings and farm content are created by users.",
        ],
      },
      {
        heading: "We are not the seller",
        paragraphs: [
          "PetCare: Pet Marketplace is not the seller or owner of pets listed on the marketplace. We do not guarantee pet health, breed claims, vaccine status, or the outcome of any deal between users. Soft-deposit / escrow-style holds in the product help coordinate deposits under seller terms; they are not a platform guarantee against illness or a full payment-processing service for the entire purchase price unless clearly stated otherwise in-product.",
        ],
      },
      {
        heading: "Your responsibilities",
        bullets: [
          "Provide accurate information in accounts, Breeder applications, listings, chat, and deposit flows.",
          "Follow Marketplace Guidelines and applicable law (including rules on protected or illegal wildlife).",
          "Meet in person and verify identity, documents, and the pet before transferring significant money or taking the animal home.",
          "Honor warranty and deposit terms you publish or accept on a listing.",
        ],
      },
      {
        heading: "Accounts and moderation",
        paragraphs: [
          "We may review Breeder verification and listings, remove content, cancel abusive deals, or suspend accounts that violate these Terms, Guidelines, or law. Features may change as we improve the product.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Questions about these Terms: ${LEGAL_SUPPORT_EMAIL}`],
      },
    ],
  },
  VI: {
    updated: "Cập nhật lần cuối: tháng 8/2026",
    intro:
      "Điều khoản này áp dụng khi bạn dùng marketplace PetCare: Pet Marketplace (web và app). Khi tạo tài khoản, đăng tin hoặc xem tin, bạn đồng ý với Điều khoản và Nội quy Marketplace.",
    sections: [
      {
        heading: "PetCare: Pet Marketplace cung cấp gì",
        paragraphs: [
          "Chúng tôi cung cấp công cụ để Sen và Breeder tìm thú cưng, xem hồ sơ trại, nhắn tin, gắn chính sách bảo hành vào tin đăng, và phối hợp đặt cọc / bàn giao theo điều khoản hiển thị trong sản phẩm. Nội dung tin đăng và hồ sơ trại do người dùng tạo.",
        ],
      },
      {
        heading: "Chúng tôi không phải bên bán",
        paragraphs: [
          "PetCare: Pet Marketplace không phải người bán hay chủ sở hữu thú cưng trên marketplace. Chúng tôi không bảo lãnh sức khỏe thú, giống, tình trạng vaccine hay kết quả giao dịch giữa người dùng. Cơ chế đặt cọc / giữ cọc trong app giúp các bên theo dõi khoản cọc theo điều khoản người bán; đây không phải bảo lãnh bệnh tật từ nền tảng và không đồng nghĩa chúng tôi xử lý toàn bộ thanh toán giá thú trừ khi sản phẩm nêu rõ khác.",
        ],
      },
      {
        heading: "Trách nhiệm của bạn",
        bullets: [
          "Cung cấp thông tin chính xác trên tài khoản, hồ sơ Breeder, tin đăng, chat và luồng đặt cọc.",
          "Tuân thủ Nội quy Marketplace và pháp luật (kể cả quy định về động vật bảo tồn / cấm).",
          "Gặp trực tiếp và tự kiểm tra danh tính, giấy tờ, thú cưng trước khi chuyển khoản lớn hoặc nhận thú.",
          "Tuân thủ điều khoản bảo hành và đặt cọc mà bạn công bố hoặc chấp nhận trên tin đăng.",
        ],
      },
      {
        heading: "Tài khoản và kiểm duyệt",
        paragraphs: [
          "Chúng tôi có thể duyệt xác minh Breeder và tin đăng, gỡ nội dung, xử lý giao dịch lạm dụng, hoặc tạm khóa tài khoản vi phạm Điều khoản, Nội quy hoặc pháp luật. Tính năng có thể thay đổi khi sản phẩm được cải thiện.",
        ],
      },
      {
        heading: "Liên hệ",
        paragraphs: [`Thắc mắc về Điều khoản: ${LEGAL_SUPPORT_EMAIL}`],
      },
    ],
  },
};

export const marketplaceGuidelinesContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: "Last updated: August 2026",
    intro:
      "These Marketplace Guidelines apply to Sen, Breeders, and anyone using PetCare: Pet Marketplace listings, chat, or soft deposits. Violations may lead to removed listings or suspended accounts.",
    sections: [
      {
        heading: "Listings and farms",
        bullets: [
          "Only list pets you are legally allowed to sell or rehome. Do not list protected, illegal, or banned wildlife.",
          "Describe age, breed, sex, vaccines, health, price, location, and warranty honestly. Photos and videos must match the pet offered.",
          "Attach a clear warranty policy before confirming a soft deposit when the product requires it.",
          "Breeder / farm profiles must reflect real care practices; do not fake verification or trust signals.",
        ],
      },
      {
        heading: "Chat and conduct",
        bullets: [
          "No spam, scams, harassment, or abusive messages.",
          "Do not pressure Sen to pay outside agreed deposit terms or to skip in-person checks.",
          "Keep deal discussions and deposit/handoff steps inside the product when possible so both sides have a clear record.",
        ],
      },
      {
        heading: "Deposits, handoff, and disputes",
        bullets: [
          "Soft deposits follow the terms shown on the listing and in the deal panel. Cancel, confirm, handoff, and dispute steps must be used in good faith.",
          "Verify the pet and documents in person before completing handoff or releasing remaining payment.",
          "If a dispute is opened, provide evidence promptly. Admin may review and force-complete or cancel when needed for safety or abuse.",
        ],
      },
      {
        heading: "Enforcement",
        paragraphs: [
          "Admin may reject or remove listings, reverse abusive deposits, and suspend accounts that break these Guidelines, the Terms of Service, or applicable law.",
        ],
      },
    ],
  },
  VI: {
    updated: "Cập nhật lần cuối: tháng 8/2026",
    intro:
      "Nội quy Marketplace áp dụng cho Sen, Breeder và mọi người dùng tin đăng, chat hoặc đặt cọc trên PetCare: Pet Marketplace. Vi phạm có thể dẫn tới gỡ tin hoặc khóa tài khoản.",
    sections: [
      {
        heading: "Tin đăng và hồ sơ trại",
        bullets: [
          "Chỉ đăng thú bạn được phép bán hoặc tìm nhà mới. Không đăng động vật bảo tồn, trái phép hoặc bị cấm.",
          "Khai đúng tuổi, giống, giới tính, vaccine, sức khỏe, giá, khu vực và bảo hành. Ảnh / video phải đúng bé đang chào bán.",
          "Gắn chính sách bảo hành rõ ràng trước khi chốt cọc khi sản phẩm yêu cầu.",
          "Hồ sơ Breeder / trại phải phản ánh thực tế chăm sóc; không giả mạo xác minh hay tín hiệu uy tín.",
        ],
      },
      {
        heading: "Chat và ứng xử",
        bullets: [
          "Không spam, lừa đảo, quấy rối hoặc nhắn tin xúc phạm.",
          "Không ép Sen thanh toán ngoài điều khoản cọc đã thống nhất hoặc bỏ qua kiểm tra trực tiếp.",
          "Ưu tiên trao đổi và các bước cọc / bàn giao trong app để hai bên có lịch sử rõ ràng.",
        ],
      },
      {
        heading: "Đặt cọc, bàn giao và tranh chấp",
        bullets: [
          "Đặt cọc mềm theo điều khoản trên tin và bảng giao dịch. Các bước hủy, xác nhận, bàn giao, khiếu nại phải dùng thiện chí.",
          "Tự kiểm tra thú và giấy tờ trực tiếp trước khi hoàn tất bàn giao hoặc thanh toán phần còn lại.",
          "Khi có tranh chấp, cung cấp bằng chứng kịp thời. Admin có thể xem xét và buộc hoàn tất hoặc hủy khi cần vì an toàn hoặc lạm dụng.",
        ],
      },
      {
        heading: "Xử lý vi phạm",
        paragraphs: [
          "Admin có thể từ chối / gỡ tin, xử lý cọc lạm dụng và tạm khóa tài khoản vi phạm Nội quy, Điều khoản dịch vụ hoặc pháp luật.",
        ],
      },
    ],
  },
};

export const supportContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: "Last updated: August 2026",
    intro:
      "We’re here to help with PetCare: Pet Marketplace accounts, Breeder verification, listings, chat, soft deposits, and warranty questions.",
    sections: [
      {
        heading: "Contact",
        paragraphs: [
          `Email ${LEGAL_SUPPORT_EMAIL}. We usually reply within 1–2 business days.`,
        ],
      },
      {
        heading: "What to include",
        bullets: [
          "Your account email and whether you are Sen or Breeder.",
          "Listing URL or farm profile link (if relevant).",
          "For deposit / handoff / dispute issues: conversation context, screenshots, and a short timeline.",
          "For account or verification issues: what you tried and any error messages.",
        ],
      },
      {
        heading: "Before you write",
        paragraphs: [
          "For deal questions, first check the listing warranty, deposit panel status, and Marketplace Guidelines. PetCare: Pet Marketplace moderates the platform but does not replace in-person verification between Sen and Breeder.",
        ],
      },
    ],
  },
  VI: {
    updated: "Cập nhật lần cuối: tháng 8/2026",
    intro:
      "Chúng tôi hỗ trợ tài khoản PetCare: Pet Marketplace, xác minh Breeder, tin đăng, chat, đặt cọc và câu hỏi về bảo hành.",
    sections: [
      {
        heading: "Liên hệ",
        paragraphs: [
          `Email ${LEGAL_SUPPORT_EMAIL}. Thường phản hồi trong 1–2 ngày làm việc.`,
        ],
      },
      {
        heading: "Nên gửi kèm",
        bullets: [
          "Email tài khoản và bạn đang là Sen hay Breeder.",
          "URL tin đăng hoặc link hồ sơ trại (nếu có).",
          "Với cọc / bàn giao / tranh chấp: ngữ cảnh hội thoại, ảnh chụp màn hình và dòng thời gian ngắn.",
          "Với tài khoản hoặc xác minh: bước bạn đã thử và thông báo lỗi (nếu có).",
        ],
      },
      {
        heading: "Trước khi gửi",
        paragraphs: [
          "Với câu hỏi giao dịch, hãy xem trước chính sách bảo hành trên tin, trạng thái bảng đặt cọc và Nội quy Marketplace. PetCare: Pet Marketplace kiểm duyệt nền tảng nhưng không thay thế việc Sen và Breeder tự kiểm tra trực tiếp.",
        ],
      },
    ],
  },
};

export function legalDocFor(
  kind: "privacy" | "terms" | "guidelines" | "support",
  lang: Lang,
): LegalDoc {
  const key = lang === "VI" ? "VI" : "EN";
  switch (kind) {
    case "privacy":
      return privacyPolicyContent[key];
    case "terms":
      return termsOfServiceContent[key];
    case "guidelines":
      return marketplaceGuidelinesContent[key];
    case "support":
      return supportContent[key];
  }
}

/** Flatten doc text for unit tests / search. */
export function flattenLegalDoc(doc: LegalDoc): string {
  const parts = [doc.updated, doc.intro];
  for (const section of doc.sections) {
    if (section.heading) parts.push(section.heading);
    if (section.paragraphs) parts.push(...section.paragraphs);
    if (section.bullets) parts.push(...section.bullets);
  }
  return parts.join("\n");
}
