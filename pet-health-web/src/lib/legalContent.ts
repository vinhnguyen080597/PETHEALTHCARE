import type { Lang } from "@/lib/types";

/** Customer support inbox (deal / account help). */
export const LEGAL_SUPPORT_EMAIL = "support@pet-marketplace.org";

/** Legal / report inbox (privacy, ToS, BCT correspondence). */
export const LEGAL_CONTACT_EMAIL = "contact@pet-marketplace.org";

export const LEGAL_EMAILS = [LEGAL_SUPPORT_EMAIL, LEGAL_CONTACT_EMAIL] as const;

export const LEGAL_OPERATOR_NAME_VI = "CÔNG TY TNHH PETCARE VIỆT NAM";
export const LEGAL_OPERATOR_NAME_EN = "PETCARE VIET NAM CO., LTD";

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

const UPDATED_EN = "Last updated: August 2026";
const UPDATED_VI = "Cập nhật lần cuối: tháng 8/2026";

const operatorBulletsVI = [
  `Đơn vị vận hành: ${LEGAL_OPERATOR_NAME_VI} (đang trong quá trình hoàn tất thủ tục ĐKKD).`,
  "Địa chỉ trụ sở: [Nhập_Địa_Chỉ_Công_Ty / Địa chỉ Văn phòng].",
  "Mã số doanh nghiệp: [Nhập_Mã_Số_Thuế].",
  "Đại diện pháp luật: [Tên_Của_Bạn] — Giám đốc.",
  `Email liên hệ / pháp lý: ${LEGAL_CONTACT_EMAIL}.`,
  `Email hỗ trợ khách hàng: ${LEGAL_SUPPORT_EMAIL}.`,
];

const operatorBulletsEN = [
  `Operator: ${LEGAL_OPERATOR_NAME_EN} (business registration in progress).`,
  "Registered address: [Company / office address].",
  "Enterprise code / tax ID: [Tax identification number].",
  "Legal representative: [Your name] — Director.",
  `Legal / report email: ${LEGAL_CONTACT_EMAIL}.`,
  `Customer support email: ${LEGAL_SUPPORT_EMAIL}.`,
];

export const privacyPolicyContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: UPDATED_EN,
    intro:
      "PetCare: Pet Marketplace (“we”) is committed to protecting personal data of Users (including Sen — pet seekers — and Breeders / farms) in line with Decree 13/2023/ND-CP on personal data protection.",
    sections: [
      {
        heading: "Operator",
        bullets: operatorBulletsEN,
      },
      {
        heading: "Information we collect",
        bullets: [
          "Account details: display name, email, phone number, profile photo, and location used for listings or contact.",
          "Breeder verification / listing data: identity or farm materials you upload, photos/videos, vaccine or health notes, and listing warranty text you publish.",
          "Communication content: in-app chat history, reports, and support tickets.",
          "Technical data: IP address, device type, OS version, and activity logs on web/app.",
          "Paid service data (if used): records related to listing promotion, advertising, or other technical fees you purchase from PetCare — not payment between Sen and Breeder.",
        ],
      },
      {
        heading: "How we use information",
        bullets: [
          "Operate the platform: publish and review listings, enable chat/contact, show advertising or promoted placements, and moderate content.",
          "Assess Breeder credibility signals and issue Verified or similar labels as technical classifications only (not a legal certification).",
          "Handle reports of scam, prohibited animals, guideline violations, or safety issues.",
          "Send system notices about messages, listing status, and policy updates.",
        ],
      },
      {
        heading: "Sharing and visibility",
        paragraphs: [
          "We do not sell personal data. Information you put in public listings or farm profiles is visible to other users. Contact details and chat content are shared with the people you message as part of normal marketplace use. Admins may access relevant records to investigate reports or safety issues. Pet photos and videos you upload may also be used to operate the product and for marketing as described in the Terms of Service and Marketplace Guidelines.",
          "PetCare does not receive, hold, or process purchase deposits or pet-sale payments between Sen and Breeder. Any money transfer for a pet happens outside the platform between the parties.",
        ],
      },
      {
        heading: "Data-subject rights (Decree 13/2023/ND-CP)",
        bullets: [
          "Access & correction: you may edit personal information in Account settings.",
          `Right to request deletion / account closure: you may ask us to close the account and delete personal data at any time by using Settings > Delete account in the app, or by emailing ${LEGAL_CONTACT_EMAIL}.`,
          "We will process and deactivate personal data within 72 business hours, except records we must retain under tax law, e-commerce regulations, or paid-service invoicing.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Privacy questions: ${LEGAL_CONTACT_EMAIL}`],
      },
    ],
  },
  VI: {
    updated: UPDATED_VI,
    intro:
      "PetCare: Pet Marketplace (“Chúng tôi”) cam kết bảo vệ thông tin cá nhân của Người dùng (bao gồm Sen — Người tìm thú cưng và Breeder — Nhà phối giống/Trại giống) theo đúng quy định tại Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân.",
    sections: [
      {
        heading: "Đơn vị vận hành",
        bullets: operatorBulletsVI,
      },
      {
        heading: "Dữ liệu thu thập",
        bullets: [
          "Thông tin tài khoản: tên hiển thị, email, số điện thoại, ảnh đại diện và địa điểm dùng cho tin đăng hoặc liên hệ.",
          "Dữ liệu xác minh Breeder / tin đăng: giấy tờ hoặc hồ sơ trại bạn tải lên, ảnh/video, ghi chú vaccine/sức khỏe và nội dung chính sách bảo hành bạn công bố trên tin.",
          "Nội dung giao tiếp: lịch sử chat trong app, báo cáo và phiếu hỗ trợ.",
          "Dữ liệu kỹ thuật: địa chỉ IP, loại thiết bị, phiên bản hệ điều hành và nhật ký hoạt động trên web/app.",
          "Dữ liệu dịch vụ trả phí (nếu dùng): hồ sơ liên quan phí đăng tin, quảng cáo/hiển thị hoặc dịch vụ kỹ thuật bạn mua từ PetCare — không phải thanh toán mua bán thú giữa Sen và Breeder.",
        ],
      },
      {
        heading: "Mục đích sử dụng dữ liệu",
        bullets: [
          "Vận hành nền tảng: đăng và duyệt tin, hỗ trợ chat/liên hệ, hiển thị quảng cáo hoặc tin ưu tiên, kiểm duyệt nội dung.",
          "Đánh giá tín hiệu uy tín Breeder và cấp nhãn Verified hoặc tương đương chỉ mang tính phân loại kỹ thuật (không phải chứng nhận pháp lý).",
          "Xử lý báo cáo lừa đảo, động vật cấm, vi phạm nội quy hoặc vấn đề an toàn.",
          "Gửi thông báo hệ thống về tin nhắn, trạng thái tin đăng và cập nhật chính sách.",
        ],
      },
      {
        heading: "Chia sẻ và hiển thị",
        paragraphs: [
          "Chúng tôi không bán dữ liệu cá nhân. Thông tin bạn đưa lên tin công khai hoặc hồ sơ trại có thể được người dùng khác xem. Thông tin liên hệ và nội dung chat được chia sẻ với người bạn nhắn tin trong quá trình dùng marketplace. Admin có thể truy cập hồ sơ liên quan để xử lý báo cáo hoặc vấn đề an toàn. Ảnh và video thú bạn tải lên cũng có thể được dùng để vận hành sản phẩm và truyền thông theo Điều khoản dịch vụ và Nội quy Marketplace.",
          "PetCare không tiếp nhận, không giữ và không xử lý tiền cọc hay thanh toán mua bán thú giữa Sen và Breeder. Mọi chuyển tiền liên quan thú cưng do hai bên tự thực hiện ngoài nền tảng.",
        ],
      },
      {
        heading: "Quyền của chủ thể dữ liệu (theo Nghị định 13/2023/NĐ-CP)",
        bullets: [
          "Quyền truy cập & chỉnh sửa: người dùng có thể tự chỉnh sửa thông tin cá nhân trong mục Cài đặt tài khoản.",
          `Quyền yêu cầu xóa dữ liệu / xóa tài khoản: người dùng có quyền yêu cầu hủy tài khoản và xóa toàn bộ dữ liệu cá nhân bất kỳ lúc nào bằng cách thao tác tại Cài đặt > Xóa tài khoản trên ứng dụng, hoặc gửi email đến ${LEGAL_CONTACT_EMAIL}.`,
          "Chúng tôi sẽ xử lý và vô hiệu hóa dữ liệu trong vòng 72 giờ làm việc, ngoại trừ các dữ liệu bắt buộc phải lưu trữ theo Luật Thuế, Luật Thương mại điện tử hoặc hóa đơn dịch vụ trả phí.",
        ],
      },
      {
        heading: "Liên hệ",
        paragraphs: [`Thắc mắc về bảo mật: ${LEGAL_CONTACT_EMAIL}`],
      },
    ],
  },
};

export const termsOfServiceContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: UPDATED_EN,
    intro:
      "These Terms govern use of PetCare: Pet Marketplace (web and app). By creating an account, posting, or browsing listings you agree to these Terms and the Marketplace Guidelines.",
    sections: [
      {
        heading: "Operator",
        bullets: operatorBulletsEN,
      },
      {
        heading: "Role of PetCare: Pet Marketplace",
        paragraphs: [
          "PetCare: Pet Marketplace is an intermediary technology platform that provides listing infrastructure, advertising/display services, and tools to connect Sellers (Breeders / pet shops) with Buyers (Sen).",
          "Important statement: we are NOT the seller, do not own the pets, and do not ourselves trade pets on the platform. Breed, health, vaccine, warranty, and legal-status information is declared by the Seller, who is solely legally responsible for that information.",
          "No money-holding / escrow: we do NOT receive, hold, or participate in any deposit or pet-sale payment between Buyer and Seller. Any agreement on deposit, payment, shipping, and handoff is made and performed entirely off-platform by the parties, at their own risk and responsibility.",
          "No legal licensing audit of Sellers: the platform does not own or operate breeding facilities and has no duty or practical ability to inspect, verify, or certify each Breeder’s business registration, veterinary hygiene certificates, breeding permits, tax compliance, or similar licenses. Listing display and any Verified or similar badges are technical information classifications only and do not constitute a legal guarantee or certification of the Breeder by PetCare.",
        ],
      },
      {
        heading: "Paid technical services",
        paragraphs: [
          "PetCare may charge Breeders (or other posters) for technical services such as listing publication, promotion, advertising, or featured placement. Those fees are for platform services only. They are not deposits, escrow, or payment for pets, and do not make PetCare a party to any pet-sale contract between Sen and Breeder.",
        ],
      },
      {
        heading: "User responsibilities",
        bullets: [
          "Sellers (Breeders): provide accurate information and real photos/videos of the pet. Honor any warranty policy you publish on the listing. You alone bear all risk and disputes arising from deposits or payments you receive directly from Buyers.",
          "Sellers (Breeders) — legal compliance: you warrant and accept full legal responsibility for business registration (where required), tax obligations, breeding/veterinary hygiene conditions, lawful ownership and origin of each animal, vaccination/health documentation, and compliance with Vietnamese and international wildlife law.",
          "Buyers (Sen): contact Sellers directly, inspect in person (meet the pet, check the vaccine book / health / documents) before transferring any money or completing handoff, and decide for yourselves. PetCare does not mediate or guarantee off-platform payments.",
        ],
      },
      {
        heading: "24-hour takedown of violating listings",
        bullets: [
          "It is strictly forbidden to list wildlife, endangered, rare, or otherwise legally prohibited animals under Vietnamese law.",
          "When we receive a violation report (scam, fake photos, prohibited content) from a user or a competent authority, the administration commits to review and remove the violating listing within 24 hours where the report is valid.",
        ],
      },
      {
        heading: "Content liability disclaimer",
        paragraphs: [
          "PetCare: Pet Marketplace administration operates listing review in good faith with the technical tools available. Because of the diversity of companion animals and the limits of remote review, the administration has no duty and does not have specialist expertise to make an in-depth legal assessment of the biological origin of each animal a user uploads, nor of each Breeder’s licenses and permits.",
          "If we detect or receive a report of a listing that appears to involve wildlife or otherwise illegal animals, the administration will remove the listing within 24 hours and may terminate the violating account without prior notice. The violating user remains solely liable for any administrative or criminal sanctions imposed by competent state authorities.",
          "PetCare is not liable for financial loss, illness of a pet, or other damage arising from off-platform agreements, deposits, payments, shipping, or handoffs between Users.",
        ],
      },
      {
        heading: "Photos, videos, and promotion",
        paragraphs: [
          "By uploading pet photos or videos to PetCare: Pet Marketplace (including listings, farm profiles, and related media), you grant PetCare: Pet Marketplace a non-exclusive, royalty-free license to use, reproduce, lightly edit (crop, compose, watermark), and publish that media to operate the product and for marketing or communications. You confirm you have the right to grant this license and that the content does not infringe third-party rights.",
        ],
      },
      {
        heading: "Accounts and moderation",
        paragraphs: [
          "We may review Breeder verification materials and listings, remove content, or suspend accounts that violate these Terms, the Marketplace Guidelines, or applicable law. Features and paid placement products may change as we improve the product.",
        ],
      },
      {
        heading: "Future payment and escrow services",
        paragraphs: [
          "PetCare may add or upgrade optional payment-support services in the future (for example deposit hold / escrow through a licensed payment partner). We will publish an update on the website/app and notify Users at least 15–30 days before such services take effect. When activated, Users may need to accept the updated Terms before continuing to use payment-related features.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Questions about these Terms: ${LEGAL_CONTACT_EMAIL}`],
      },
    ],
  },
  VI: {
    updated: UPDATED_VI,
    intro:
      "Điều khoản này áp dụng khi bạn dùng marketplace PetCare: Pet Marketplace (web và app). Khi tạo tài khoản, đăng tin hoặc xem tin, bạn đồng ý với Điều khoản và Nội quy Marketplace.",
    sections: [
      {
        heading: "Đơn vị vận hành",
        bullets: operatorBulletsVI,
      },
      {
        heading: "Vai trò của PetCare: Pet Marketplace",
        paragraphs: [
          "PetCare: Pet Marketplace là nền tảng công nghệ trung gian cung cấp hạ tầng đăng tin, dịch vụ quảng cáo/hiển thị và công cụ kết nối thông tin giữa Người bán (Breeder/Pet Shop) và Người mua (Sen).",
          "Tuyên bố quan trọng: Chúng tôi KHÔNG phải là người bán, không sở hữu thú cưng và không trực tiếp kinh doanh thú cưng trên Sàn. Các thông tin về giống, tình trạng sức khỏe, vắc-xin, bảo hành và tư cách pháp lý do Người bán tự kê khai và chịu trách nhiệm trước pháp luật.",
          "Tuyên bố miễn trừ giữ tiền: Chúng tôi KHÔNG tiếp nhận, giữ tiền cọc, hay tham gia vào bất kỳ công đoạn thanh toán/giao dịch tài chính nào giữa Người mua và Người bán liên quan mua bán thú cưng. Mọi thỏa thuận về cọc, thanh toán, vận chuyển và bàn giao hoàn toàn do hai bên tự thực hiện và chịu trách nhiệm ngoài ứng dụng.",
          "Tuyên bố miễn trừ tư cách pháp lý & giấy phép của Người bán: Ban quản trị Sàn không sở hữu, không quản lý cơ sở chăn nuôi và không có nghĩa vụ/khả năng kiểm tra, thẩm định giấy phép đăng ký kinh doanh, giấy chứng nhận điều kiện vệ sinh thú y hay giấy phép chăn nuôi của từng Breeder/Trại giống. Việc hiển thị bài đăng hoặc các nhãn nhận diện (Verified…) trên ứng dụng chỉ mang tính chất phân loại thông tin kỹ thuật, không cấu thành lời đảm bảo hay chứng nhận pháp lý từ phía Sàn đối với Breeder.",
        ],
      },
      {
        heading: "Dịch vụ kỹ thuật có thu phí",
        paragraphs: [
          "PetCare có thể thu phí từ Breeder (hoặc người đăng tin) cho các dịch vụ kỹ thuật như đăng tin, đẩy tin, quảng cáo hoặc hiển thị ưu tiên. Các khoản phí này chỉ là phí dịch vụ nền tảng, không phải tiền cọc, không phải escrow và không phải thanh toán mua thú; không làm PetCare trở thành bên trong hợp đồng mua bán thú giữa Sen và Breeder.",
        ],
      },
      {
        heading: "Trách nhiệm của Người dùng",
        bullets: [
          "Đối với Người bán (Breeder): cam kết cung cấp thông tin chính xác, ảnh/video thực tế của bé cưng; thực hiện đúng chính sách bảo hành đã niêm yết trên tin đăng (nếu có). Tự chịu mọi rủi ro và tranh chấp phát sinh từ việc nhận tiền cọc hoặc thanh toán trực tiếp từ Người mua.",
          "Đối với Người bán (Breeder) — tuân thủ pháp lý: tự chịu hoàn toàn trách nhiệm trước pháp luật về đăng ký kinh doanh (nếu thuộc diện phải đăng ký), nghĩa vụ thuế, điều kiện chăn nuôi/vệ sinh thú y, quyền sở hữu và nguồn gốc hợp pháp của từng thú, sổ tiêm/hồ sơ sức khỏe, và tuân thủ pháp luật Việt Nam cũng như quy định quốc tế về động vật hoang dã.",
          "Đối với Người mua (Sen): chủ động liên hệ Người bán, kiểm tra thực tế (gặp bé, kiểm tra sổ tiêm/sức khỏe/giấy tờ) trước khi chuyển bất kỳ khoản tiền nào hoặc hoàn tất bàn giao, và tự quyết định. PetCare không môi giới hay bảo lãnh thanh toán ngoài nền tảng.",
        ],
      },
      {
        heading: "Cơ chế kiểm duyệt & gỡ bỏ tin vi phạm trong 24 giờ",
        bullets: [
          "Nghiêm cấm mua bán các loài động vật thuộc danh mục động vật hoang dã, động vật nguy cấp, quý, hiếm bị cấm giao dịch theo pháp luật Việt Nam.",
          "Khi nhận được báo cáo vi phạm (lừa đảo, hình ảnh giả mạo, nội dung cấm) từ người dùng hoặc cơ quan chức năng, Ban quản trị cam kết thẩm định và gỡ bỏ tin đăng vi phạm trong vòng 24 giờ khi báo cáo hợp lệ.",
        ],
      },
      {
        heading: "Cơ chế miễn trừ trách nhiệm nội dung",
        paragraphs: [
          "Ban quản trị PetCare: Pet Marketplace vận hành hệ thống kiểm duyệt tin đăng dựa trên thiện chí và các công cụ kỹ thuật hiện có. Do sự đa dạng của các loài vật nuôi và giới hạn kiểm duyệt từ xa, Ban quản trị không có nghĩa vụ và không đủ chuyên môn để thẩm định tính pháp lý chuyên sâu về nguồn gốc sinh học của từng cá thể động vật do người dùng tải lên, cũng như không thẩm định đầy đủ giấy phép/đăng ký của từng Breeder.",
          "Khi phát hiện hoặc nhận được báo cáo về tin đăng có dấu hiệu vi phạm quy định về động vật hoang dã/trái phép, Ban quản trị sẽ tiến hành gỡ bỏ tin đăng trong vòng 24 giờ và có thể hủy bỏ tài khoản vi phạm mà không cần báo trước. Người dùng vi phạm sẽ phải tự chịu mọi hình phạt hành chính hoặc hình sự trước cơ quan nhà nước có thẩm quyền.",
          "PetCare không chịu trách nhiệm về tổn thất tài chính, bệnh tật thú cưng hoặc thiệt hại khác phát sinh từ thỏa thuận, đặt cọc, thanh toán, vận chuyển hay bàn giao ngoài nền tảng giữa Người dùng.",
        ],
      },
      {
        heading: "Ảnh, video và truyền thông",
        paragraphs: [
          "Khi bạn tải ảnh hoặc video thú cưng lên PetCare: Pet Marketplace (gồm tin đăng, hồ sơ trại và media liên quan), bạn cấp cho PetCare: Pet Marketplace quyền không độc quyền, miễn phí bản quyền để sử dụng, sao chép, chỉnh sửa nhẹ (cắt, ghép, gắn watermark) và công bố nội dung đó nhằm vận hành sản phẩm cũng như quảng bá, truyền thông. Bạn xác nhận mình có quyền cấp phép này và nội dung không xâm phạm quyền của bên thứ ba.",
        ],
      },
      {
        heading: "Tài khoản và kiểm duyệt",
        paragraphs: [
          "Chúng tôi có thể duyệt hồ sơ xác minh Breeder và tin đăng, gỡ nội dung, hoặc tạm khóa tài khoản vi phạm Điều khoản, Nội quy hoặc pháp luật. Tính năng và sản phẩm hiển thị trả phí có thể thay đổi khi sản phẩm được cải thiện.",
        ],
      },
      {
        heading: "Dịch vụ thanh toán / giữ cọc trong tương lai",
        paragraphs: [
          "PetCare có quyền bổ sung hoặc nâng cấp các dịch vụ hỗ trợ thanh toán tùy chọn trong tương lai (ví dụ giữ cọc/escrow thông qua đối tác thanh toán được cấp phép). Chúng tôi sẽ công bố trên website/ứng dụng và thông báo cho Người dùng ít nhất 15–30 ngày trước khi dịch vụ có hiệu lực. Khi kích hoạt, Người dùng có thể cần chấp nhận lại Điều khoản cập nhật trước khi tiếp tục dùng các tính năng liên quan thanh toán.",
        ],
      },
      {
        heading: "Liên hệ",
        paragraphs: [`Thắc mắc về Điều khoản: ${LEGAL_CONTACT_EMAIL}`],
      },
    ],
  },
};

export const marketplaceGuidelinesContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: UPDATED_EN,
    intro:
      "These Marketplace Guidelines apply to Sen, Breeders, and anyone using PetCare: Pet Marketplace listings, chat, or advertising. Violations may lead to removed listings or suspended accounts.",
    sections: [
      {
        heading: "Listings and farms",
        bullets: [
          "Only list pets you are legally allowed to sell or rehome. Do not list wildlife, endangered, rare, or otherwise prohibited animals under Vietnamese law.",
          "Describe age, breed, sex, vaccines, health, price, location, and any warranty honestly. Photos and videos must match the pet offered.",
          "If you publish a warranty policy on the listing, keep it clear and accurate; you alone are responsible for honoring it.",
          "Breeder / farm profiles must reflect real care practices; do not fake verification or trust signals.",
        ],
      },
      {
        heading: "Breeder legal and permit responsibility",
        paragraphs: [
          "By posting, the Breeder / Seller warrants that they alone are responsible for all licenses and compliance required to offer the animal, including (where applicable) business registration, tax obligations, veterinary hygiene conditions, breeding permits, lawful origin/ownership documents, and vaccination records.",
        ],
        bullets: [
          "PetCare does not verify or certify that any Breeder holds complete or valid business, veterinary, or breeding permits.",
          "Display of a listing or a Verified-style badge is not proof of legal compliance.",
          "The poster remains solely liable for false statements, missing permits, or illegal animals.",
        ],
      },
      {
        heading: "Prohibited animals and poster liability",
        paragraphs: [
          "Absolute prohibition: it is strictly forbidden to post, buy, sell, or otherwise trade any wildlife, endangered, rare, or precious species listed in Vietnam’s Red Data Book, the CITES Appendices, or any species whose harvest or commercial trade is prohibited under Vietnamese or international law.",
        ],
        bullets: [
          "The listing poster (Breeder / Seller) is solely legally responsible for the origin, lawfulness, and ownership of the pet or animal they list.",
          "The poster warrants that the animal is not a prohibited species, was not illegally captured, and (where documents are required) is accompanied by lawful proof of origin.",
          "In all cases, PetCare: Pet Marketplace is fully released from liability for wildlife-conservation offences caused by a poster’s intentional misrepresentation, fraud, or false information.",
        ],
      },
      {
        heading: "No platform shipping or payment holding",
        paragraphs: [
          "PetCare: Pet Marketplace does NOT itself provide pet shipping or delivery. Method, cost, and transport risk are agreed between Seller and Buyer.",
          "PetCare does NOT receive, hold, or manage deposits or pet-sale payments. Any deposit or payment happens directly between Users outside the app.",
        ],
      },
      {
        heading: "Connection and off-platform deal flow",
        paragraphs: [
          "Step 1 — Search & contact: the Buyer views listings and contacts the Seller via in-app chat or a public phone number.",
          "Step 2 — Self-negotiation: both sides agree on price, any deposit (if any), health warranty, timing, and transport — entirely between themselves.",
          "Step 3 — In-person check & handoff: the Buyer should meet the pet, check the vaccine book, health, and legal documents before transferring any money or completing the deal.",
        ],
      },
      {
        heading: "Chat and conduct",
        bullets: [
          "No spam, scams, harassment, or abusive messages.",
          "Do not pressure Sen to skip in-person checks or to pay without verifying the pet and documents.",
          "Prefer keeping early negotiation in-app so there is a message record if a report is needed later.",
        ],
      },
      {
        heading: "Disputes, scams, and financial claims",
        bullets: [
          `Because PetCare does not hold or manage deposits or pet-sale funds, the platform has no obligation to refund, compensate, or financially settle any deposit scam or payment dispute between Users.`,
          `If you suspect fraud or a Marketplace Guideline violation: tap Report in the app or email ${LEGAL_SUPPORT_EMAIL} with evidence (chat screenshots, listing URL, payment proof if any).`,
          "Within 3 business days, administration will review on-platform history where available and may permanently ban the violating account.",
          "We may provide chat/listing extracts to the police upon a valid request when there are signs of fraud or appropriation of property.",
          "PetCare does not replace civil or criminal remedies Users may pursue against each other off-platform.",
        ],
      },
      {
        heading: "Media for promotion",
        bullets: [
          "Photos and videos you publish on listings or farm profiles may be used by PetCare: Pet Marketplace to operate the product and for marketing or communications (including crop, compose, and watermark), under a non-exclusive, royalty-free license.",
          "Only upload media you have the right to share. Do not upload content that infringes others’ rights.",
        ],
      },
      {
        heading: "Enforcement",
        paragraphs: [
          "Admin may reject or remove listings (including within 24 hours of a valid violation report) and suspend accounts that break these Guidelines, the Terms of Service, or applicable law.",
        ],
      },
    ],
  },
  VI: {
    updated: UPDATED_VI,
    intro:
      "Nội quy Marketplace áp dụng cho Sen, Breeder và mọi người dùng tin đăng, chat hoặc quảng cáo trên PetCare: Pet Marketplace. Vi phạm có thể dẫn tới gỡ tin hoặc khóa tài khoản.",
    sections: [
      {
        heading: "Tin đăng và hồ sơ trại",
        bullets: [
          "Chỉ đăng thú bạn được phép bán hoặc tìm nhà mới. Nghiêm cấm mua bán động vật hoang dã, động vật nguy cấp, quý, hiếm hoặc bị cấm giao dịch theo pháp luật Việt Nam.",
          "Khai đúng tuổi, giống, giới tính, vaccine, sức khỏe, giá, khu vực và bảo hành (nếu có). Ảnh / video phải đúng bé đang chào bán.",
          "Nếu bạn niêm yết chính sách bảo hành trên tin, nội dung phải rõ ràng và chính xác; bạn tự chịu trách nhiệm thực hiện.",
          "Hồ sơ Breeder / trại phải phản ánh thực tế chăm sóc; không giả mạo xác minh hay tín hiệu uy tín.",
        ],
      },
      {
        heading: "Trách nhiệm pháp lý & giấy phép của Breeder",
        paragraphs: [
          "Khi đăng tin, Breeder / Người bán cam kết tự chịu hoàn toàn trách nhiệm về mọi giấy phép và nghĩa vụ pháp lý cần thiết để chào bán thú, bao gồm (nếu thuộc diện áp dụng): đăng ký kinh doanh, nghĩa vụ thuế, điều kiện vệ sinh thú y, giấy phép chăn nuôi, giấy tờ nguồn gốc/quyền sở hữu hợp pháp và sổ tiêm.",
        ],
        bullets: [
          "PetCare không thẩm định hay chứng nhận rằng Breeder đã có đầy đủ hoặc còn hiệu lực các giấy phép kinh doanh, thú y hay chăn nuôi.",
          "Việc hiển thị tin đăng hoặc nhãn dạng Verified không phải bằng chứng tuân thủ pháp luật.",
          "Người đăng tin tự chịu trách nhiệm về kê khai sai, thiếu giấy phép hoặc động vật trái phép.",
        ],
      },
      {
        heading: "Danh mục động vật cấm giao dịch và bảo hành trách nhiệm",
        paragraphs: [
          "Nghiêm cấm tuyệt đối: nghiêm cấm đăng tải, mua bán, giao dịch tất cả các loài động vật hoang dã, động vật nguy cấp, quý, hiếm thuộc Danh mục Sách Đỏ Việt Nam, Danh mục CITES, hoặc bất kỳ loài động vật nào bị cấm khai thác, cấm kinh doanh theo quy định của pháp luật Việt Nam và quốc tế.",
        ],
        bullets: [
          "Người đăng tin (Breeder/Người bán) phải tự chịu hoàn toàn trách nhiệm trước pháp luật về nguồn gốc, tính hợp pháp và quyền sở hữu đối với thú cưng/vật nuôi do mình đăng bán.",
          "Người đăng tin cam kết vật nuôi không thuộc danh mục cấm, không phải là động vật săn bắt trái phép, và có đầy đủ giấy tờ chứng minh nguồn gốc hợp pháp (đối với các dòng yêu cầu giấy tờ).",
          "Trong mọi trường hợp, PetCare: Pet Marketplace được miễn trừ toàn bộ trách nhiệm liên quan đến các vi phạm pháp luật về bảo tồn động vật do Người đăng tin cố tình giả mạo thông tin, gian lận hoặc cung cấp sai sự thật.",
        ],
      },
      {
        heading: "Miễn trừ vận chuyển và giữ tiền",
        paragraphs: [
          "PetCare: Pet Marketplace KHÔNG trực tiếp cung cấp dịch vụ vận chuyển hay giao nhận thú cưng. Phương thức, chi phí và rủi ro vận chuyển do Người bán và Người mua tự thỏa thuận.",
          "PetCare KHÔNG tiếp nhận, giữ hay quản lý tiền cọc hoặc thanh toán mua bán thú. Mọi khoản cọc hoặc thanh toán do Người dùng tự thực hiện trực tiếp ngoài ứng dụng.",
        ],
      },
      {
        heading: "Quy trình kết nối & giao dịch ngoài ứng dụng",
        paragraphs: [
          "Bước 1 — Tìm kiếm & liên hệ: Người mua xem tin đăng và chủ động liên hệ Người bán qua Chat trên app hoặc số điện thoại công khai.",
          "Bước 2 — Tự thỏa thuận: hai bên tự thỏa thuận giá, tiền cọc (nếu có), chính sách bảo hành sức khỏe, thời gian và phương thức vận chuyển — hoàn toàn giữa hai bên.",
          "Bước 3 — Kiểm tra trực tiếp & giao nhận: Người mua có trách nhiệm gặp trực tiếp bé cưng, kiểm tra sổ tiêm, tình trạng sức khỏe và giấy tờ pháp lý trước khi chuyển tiền hoặc hoàn tất giao dịch.",
        ],
      },
      {
        heading: "Chat và ứng xử",
        bullets: [
          "Không spam, lừa đảo, quấy rối hoặc nhắn tin xúc phạm.",
          "Không ép Sen bỏ qua kiểm tra trực tiếp hoặc chuyển tiền khi chưa xác minh thú và giấy tờ.",
          "Ưu tiên trao đổi ban đầu trong app để có nhật ký tin nhắn khi cần báo cáo sau này.",
        ],
      },
      {
        heading: "Tranh chấp, lừa đảo và khiếu nại tài chính",
        bullets: [
          "Do PetCare không thu giữ hay quản lý tiền cọc/thanh toán mua thú, Sàn không có nghĩa vụ hoàn tiền, bồi thường hay giải quyết đền bù tài chính cho bất kỳ tranh chấp cọc/lừa đảo nào giữa hai bên.",
          `Khi nghi ngờ lừa đảo hoặc vi phạm Nội quy: bấm “Báo cáo” trên app hoặc gửi email tới ${LEGAL_SUPPORT_EMAIL} kèm bằng chứng (ảnh chat, URL tin đăng, chứng từ thanh toán nếu có).`,
          "Trong vòng 03 ngày làm việc, Ban quản trị sẽ rà soát lịch sử trên Sàn (nếu có) và có thể khóa tài khoản vi phạm vĩnh viễn.",
          "Hỗ trợ cung cấp trích xuất dữ liệu lịch sử chat/tin đăng cho Cơ quan Công an khi có yêu cầu hợp lệ nếu có dấu hiệu lừa đảo chiếm đoạt tài sản.",
          "PetCare không thay thế các biện pháp dân sự hoặc hình sự mà Người dùng có thể tự theo đuổi ngoài nền tảng.",
        ],
      },
      {
        heading: "Media phục vụ truyền thông",
        bullets: [
          "Ảnh và video bạn đăng trên tin hoặc hồ sơ trại có thể được PetCare: Pet Marketplace dùng để vận hành sản phẩm và cho mục đích quảng bá, truyền thông (kể cả cắt, ghép, gắn watermark), theo giấy phép không độc quyền và miễn phí bản quyền.",
          "Chỉ tải lên media mà bạn có quyền chia sẻ. Không đăng nội dung xâm phạm quyền của người khác.",
        ],
      },
      {
        heading: "Xử lý vi phạm",
        paragraphs: [
          "Admin có thể từ chối / gỡ tin (kể cả trong vòng 24 giờ sau báo cáo vi phạm hợp lệ) và tạm khóa tài khoản vi phạm Nội quy, Điều khoản dịch vụ hoặc pháp luật.",
        ],
      },
    ],
  },
};

export const supportContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: UPDATED_EN,
    intro:
      "We help with PetCare: Pet Marketplace accounts, Breeder verification, listings, chat, advertising/listing fees, and reports.",
    sections: [
      {
        heading: "Contact",
        bullets: [
          `Customer support: ${LEGAL_SUPPORT_EMAIL}`,
          `Legal intake & reports: ${LEGAL_CONTACT_EMAIL}`,
          "Hours: 08:30 – 17:30 (Monday to Friday).",
          "Typical reply: within 24 to 48 business hours.",
        ],
      },
      {
        heading: "What to include",
        bullets: [
          "Your account email and whether you are Sen or Breeder.",
          "Listing URL or farm profile link (if relevant).",
          "For scam / prohibited-content reports: conversation context, screenshots, and a short timeline.",
          "For account, verification, or paid listing/ad services: what you tried and any error messages.",
        ],
      },
      {
        heading: "Before you write",
        paragraphs: [
          "PetCare connects Sen and Breeders and may sell listing/advertising services. We do not hold deposits or pet-sale payments, do not replace in-person verification, and do not ship pets. For money disputes between Users, use Report for moderation help and consider civil/police channels for financial recovery.",
        ],
      },
    ],
  },
  VI: {
    updated: UPDATED_VI,
    intro:
      "Chúng tôi hỗ trợ tài khoản PetCare: Pet Marketplace, xác minh Breeder, tin đăng, chat, phí đăng tin/quảng cáo và tiếp nhận báo cáo.",
    sections: [
      {
        heading: "Thông tin hỗ trợ & tiếp nhận phản ánh",
        bullets: [
          `Email hỗ trợ khách hàng: ${LEGAL_SUPPORT_EMAIL}`,
          `Email tiếp nhận pháp lý & báo cáo: ${LEGAL_CONTACT_EMAIL}`,
          "Thời gian làm việc: 08:30 – 17:30 (Thứ 2 đến Thứ 6).",
          "Thời gian phản hồi: trong vòng 24 đến 48 giờ làm việc.",
        ],
      },
      {
        heading: "Nên gửi kèm",
        bullets: [
          "Email tài khoản và bạn đang là Sen hay Breeder.",
          "URL tin đăng hoặc link hồ sơ trại (nếu có).",
          "Với báo cáo lừa đảo / nội dung cấm: ngữ cảnh hội thoại, ảnh chụp màn hình và dòng thời gian ngắn.",
          "Với tài khoản, xác minh hoặc dịch vụ đăng tin/quảng cáo trả phí: bước bạn đã thử và thông báo lỗi (nếu có).",
        ],
      },
      {
        heading: "Trước khi gửi",
        paragraphs: [
          "PetCare kết nối Sen và Breeder và có thể bán dịch vụ đăng tin/quảng cáo. Chúng tôi không giữ cọc hay thanh toán mua thú, không thay thế kiểm tra trực tiếp, và không vận chuyển thú. Với tranh chấp tiền giữa Người dùng, hãy dùng Báo cáo để hỗ trợ kiểm duyệt và cân nhắc kênh dân sự/Công an để đòi bồi thường tài chính.",
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

/** Markdown body for a single legal page (used by docs export). */
export function renderLegalMarkdown(title: string, doc: LegalDoc): string {
  const lines = [`## ${title}`, "", `*${doc.updated}*`, "", doc.intro, ""];
  for (const section of doc.sections) {
    if (section.heading) {
      lines.push(`### ${section.heading}`, "");
    }
    for (const paragraph of section.paragraphs ?? []) {
      lines.push(paragraph, "");
    }
    for (const bullet of section.bullets ?? []) {
      lines.push(`- ${bullet}`);
    }
    if (section.bullets?.length) lines.push("");
  }
  return lines.join("\n").trimEnd();
}
