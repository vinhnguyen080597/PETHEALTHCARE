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
          "Account details: display name, email, phone number, profile photo, and transaction address.",
          "Breeder verification data: identity documents, real farm photos/videos, vaccine information, vaccination records, and the listing warranty policy.",
          "Transaction content: chat history, deposit logs, handoff evidence, and user reviews.",
          "Technical data: IP address, device type, OS version, and activity logs on web/app.",
        ],
      },
      {
        heading: "How we use information",
        bullets: [
          "Operate the platform: review listings, enable chat, and manage deposit-hold and pet handoff flows.",
          "Assess Breeder credibility and issue Verified labels.",
          "Handle disputes, complaints, scam reports, or Marketplace Guideline violations.",
          "Send system notices about deposit status, new messages, and policy updates.",
        ],
      },
      {
        heading: "Sharing and visibility",
        paragraphs: [
          "We do not sell personal data. Information you put in public listings or farm profiles is visible to other users. Contact details and chat content are shared with the people you message as part of normal marketplace use. Admins may access relevant records to investigate reports, disputes, or safety issues. Pet photos and videos you upload may also be used to operate the product and for marketing as described in the Terms of Service and Marketplace Guidelines.",
        ],
      },
      {
        heading: "Data-subject rights (Decree 13/2023/ND-CP)",
        bullets: [
          "Access & correction: you may edit personal information in Account settings.",
          `Right to request deletion / account closure: you may ask us to close the account and delete personal data at any time by using Settings > Delete account in the app, or by emailing ${LEGAL_CONTACT_EMAIL}.`,
          "We will process and deactivate personal data within 72 business hours, except transaction records we must retain under tax law and e-commerce regulations.",
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
          "Thông tin tài khoản: tên hiển thị, email, số điện thoại, ảnh đại diện, địa chỉ giao dịch.",
          "Dữ liệu xác minh Breeder: giấy tờ cá nhân, hình ảnh/video thực tế của trại giống, thông tin vắc-xin, sổ tiêm và chính sách bảo hành của bé cưng.",
          "Nội dung giao dịch: lịch sử nhắn tin (chat), nhật ký đặt cọc, bằng chứng bàn giao và đánh giá từ người dùng.",
          "Dữ liệu kỹ thuật: địa chỉ IP, loại thiết bị, phiên bản hệ điều hành và nhật ký hoạt động trên web/app.",
        ],
      },
      {
        heading: "Mục đích sử dụng dữ liệu",
        bullets: [
          "Vận hành nền tảng: duyệt tin đăng, hỗ trợ kết nối chat, quản lý quy trình giữ cọc và bàn giao thú cưng.",
          "Thẩm định độ uy tín của Breeder và cấp nhãn Verified.",
          "Giải quyết các tranh chấp, khiếu nại, báo cáo lừa đảo hoặc vi phạm nội quy Sàn.",
          "Gửi thông báo hệ thống về trạng thái cọc, tin nhắn mới và cập nhật chính sách.",
        ],
      },
      {
        heading: "Chia sẻ và hiển thị",
        paragraphs: [
          "Chúng tôi không bán dữ liệu cá nhân. Thông tin bạn đưa lên tin công khai hoặc hồ sơ trại có thể được người dùng khác xem. Thông tin liên hệ và nội dung chat được chia sẻ với người bạn nhắn tin trong quá trình dùng marketplace. Admin có thể truy cập hồ sơ liên quan để xử lý báo cáo, tranh chấp hoặc vấn đề an toàn. Ảnh và video thú bạn tải lên cũng có thể được dùng để vận hành sản phẩm và truyền thông theo Điều khoản dịch vụ và Nội quy Marketplace.",
        ],
      },
      {
        heading: "Quyền của chủ thể dữ liệu (theo Nghị định 13/2023/NĐ-CP)",
        bullets: [
          "Quyền truy cập & chỉnh sửa: người dùng có thể tự chỉnh sửa thông tin cá nhân trong mục Cài đặt tài khoản.",
          `Quyền yêu cầu xóa dữ liệu / xóa tài khoản: người dùng có quyền yêu cầu hủy tài khoản và xóa toàn bộ dữ liệu cá nhân bất kỳ lúc nào bằng cách thao tác tại Cài đặt > Xóa tài khoản trên ứng dụng, hoặc gửi email đến ${LEGAL_CONTACT_EMAIL}.`,
          "Chúng tôi sẽ xử lý và vô hiệu hóa dữ liệu trong vòng 72 giờ làm việc, ngoại trừ các dữ liệu giao dịch bắt buộc phải lưu trữ theo quy định của Luật Thuế và Luật Thương mại điện tử.",
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
          "PetCare: Pet Marketplace is an intermediary technology platform (e-commerce trading floor) connecting Sellers (Breeders / pet shops) and Buyers (Sen).",
          "Important statement: we are NOT the seller, do not own the pets, and do not ourselves trade pets on the platform. Breed, health, vaccine, and warranty information is declared by the Seller, who is legally responsible for that information.",
        ],
      },
      {
        heading: "User responsibilities",
        bullets: [
          "Sellers (Breeders): provide accurate information and real photos/videos of the pet. Honor the warranty policy published on the listing.",
          "Buyers (Sen): inspect in person (meet the pet, check the vaccine book / health) before completing handoff or paying the remaining amount.",
        ],
      },
      {
        heading: "24-hour takedown of violating listings",
        bullets: [
          "It is strictly forbidden to list wildlife, endangered, rare, or otherwise legally prohibited animals under Vietnamese law.",
          "When we receive a violation report (deposit scam, fake photos, prohibited content) from a user or a competent authority, the administration commits to review and remove the violating listing within 24 hours.",
        ],
      },
      {
        heading: "Content liability disclaimer",
        paragraphs: [
          "PetCare: Pet Marketplace administration operates listing review in good faith with the technical tools available. Because of the diversity of companion animals, the administration has no duty and does not have specialist expertise to make an in-depth legal assessment of the biological origin of each animal a user uploads.",
          "If we detect or receive a report of a listing that appears to involve wildlife or otherwise illegal animals, the administration will remove the listing within 24 hours and terminate the violating account without prior notice. The violating user remains solely liable for any administrative or criminal sanctions imposed by competent state authorities.",
        ],
      },
      {
        heading: "Photos, videos, and promotion",
        paragraphs: [
          "By uploading pet photos or videos to PetCare: Pet Marketplace (including listings, farm profiles, and handoff media), you grant PetCare: Pet Marketplace a non-exclusive, royalty-free license to use, reproduce, lightly edit (crop, compose, watermark), and publish that media to operate the product and for marketing or communications. You confirm you have the right to grant this license and that the content does not infringe third-party rights.",
        ],
      },
      {
        heading: "Accounts and moderation",
        paragraphs: [
          "We may review Breeder verification and listings, remove content, reverse abusive deposits, or suspend accounts that violate these Terms, the Marketplace Guidelines, or applicable law. Features may change as we improve the product.",
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
          "PetCare: Pet Marketplace là nền tảng công nghệ trung gian (Sàn giao dịch TMĐT) kết nối giữa Người bán (Breeder/Pet Shop) và Người mua (Sen).",
          "Tuyên bố quan trọng: Chúng tôi KHÔNG phải là người bán, không sở hữu thú cưng và không trực tiếp kinh doanh thú cưng trên Sàn. Các thông tin về giống, tình trạng sức khỏe, vắc-xin và chính sách bảo hành do Người bán tự kê khai và chịu trách nhiệm trước pháp luật.",
        ],
      },
      {
        heading: "Trách nhiệm của Người dùng",
        bullets: [
          "Đối với Người bán (Breeder): cam kết cung cấp thông tin chính xác, ảnh/video thực tế của bé cưng. Tự chịu trách nhiệm thực hiện đúng Chính sách bảo hành đã niêm yết trên tin đăng.",
          "Đối với Người mua (Sen): tuân thủ quy trình kiểm tra thực tế (trực tiếp gặp bé cưng, kiểm tra sổ tiêm/sức khỏe) trước khi chốt hoàn tất bàn giao hoặc thanh toán khoản tiền còn lại.",
        ],
      },
      {
        heading: "Cơ chế kiểm duyệt & gỡ bỏ tin vi phạm trong 24 giờ",
        bullets: [
          "Nghiêm cấm mua bán các loài động vật thuộc danh mục động vật hoang dã, động vật nguy cấp, quý, hiếm bị cấm giao dịch theo pháp luật Việt Nam.",
          "Khi nhận được báo cáo vi phạm (lừa đảo cọc, hình ảnh giả mạo, nội dung cấm) từ người dùng hoặc cơ quan chức năng, Ban quản trị cam kết thẩm định và gỡ bỏ tin đăng vi phạm trong vòng 24 giờ.",
        ],
      },
      {
        heading: "Cơ chế miễn trừ trách nhiệm nội dung",
        paragraphs: [
          "Ban quản trị PetCare: Pet Marketplace vận hành hệ thống kiểm duyệt tin đăng dựa trên thiện chí và các công cụ kỹ thuật hiện có. Do sự đa dạng của các loài vật nuôi, Ban quản trị không có nghĩa vụ và không đủ chuyên môn để thẩm định tính pháp lý chuyên sâu về nguồn gốc sinh học của từng cá thể động vật do người dùng tải lên.",
          "Khi phát hiện hoặc nhận được báo cáo về tin đăng có dấu hiệu vi phạm quy định về động vật hoang dã/trái phép, Ban quản trị sẽ tiến hành gỡ bỏ tin đăng trong vòng 24 giờ và hủy bỏ tài khoản vi phạm mà không cần báo trước. Người dùng vi phạm sẽ phải tự chịu mọi hình phạt hành chính hoặc hình sự trước cơ quan nhà nước có thẩm quyền.",
        ],
      },
      {
        heading: "Ảnh, video và truyền thông",
        paragraphs: [
          "Khi bạn tải ảnh hoặc video thú cưng lên PetCare: Pet Marketplace (gồm tin đăng, hồ sơ trại và media bàn giao), bạn cấp cho PetCare: Pet Marketplace quyền không độc quyền, miễn phí bản quyền để sử dụng, sao chép, chỉnh sửa nhẹ (cắt, ghép, gắn watermark) và công bố nội dung đó nhằm vận hành sản phẩm cũng như quảng bá, truyền thông. Bạn xác nhận mình có quyền cấp phép này và nội dung không xâm phạm quyền của bên thứ ba.",
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
        paragraphs: [`Thắc mắc về Điều khoản: ${LEGAL_CONTACT_EMAIL}`],
      },
    ],
  },
};

export const marketplaceGuidelinesContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: UPDATED_EN,
    intro:
      "These Marketplace Guidelines apply to Sen, Breeders, and anyone using PetCare: Pet Marketplace listings, chat, or deposits. Violations may lead to removed listings or suspended accounts.",
    sections: [
      {
        heading: "Listings and farms",
        bullets: [
          "Only list pets you are legally allowed to sell or rehome. Do not list wildlife, endangered, rare, or otherwise prohibited animals under Vietnamese law.",
          "Describe age, breed, sex, vaccines, health, price, location, and warranty honestly. Photos and videos must match the pet offered.",
          "Attach a clear warranty policy before confirming a deposit when the product requires it.",
          "Breeder / farm profiles must reflect real care practices; do not fake verification or trust signals.",
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
        heading: "No platform shipping service",
        paragraphs: [
          "PetCare: Pet Marketplace does NOT itself provide pet shipping or delivery. Method, cost, and transport risk are agreed between Seller and Buyer.",
        ],
      },
      {
        heading: "Four-step handoff & deposit release",
        paragraphs: [
          "Step 1 — Deposit via the app: the Buyer places a deposit on the listing. The system records “Deposited” to hold the pet for the Buyer and confirm intent to transact. The platform holds the deposit.",
          "Step 2 — Transport agreement: both sides contact each other (chat / phone) to agree time, place, and transport (pickup at the farm or a pet taxi / dedicated transfer).",
          "Step 3 — Handoff & inspection: the Buyer inspects health, alertness, vaccine book, and accompanying documents at the time of receiving the pet.",
          "Step 4 — Confirm completion: after inspection is satisfactory, both sides tap Confirm delivered / received in the app. When confirmation is complete, the order is closed and the deposit is released according to the original agreement.",
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
        heading: "Disputes and complaints",
        bullets: [
          `If there is a deposit scam, a communicable illness at the time of receipt, or the Seller fails to honor the published warranty: tap Report in the app or email ${LEGAL_SUPPORT_EMAIL} with evidence (chat screenshots, handoff video, vaccine book / veterinary certificate).`,
          "Within 3 business days, administration will work with both sides using on-platform history.",
          "If the Seller is at fault: the account may be permanently banned, the deposit returned to the Buyer (if still held), and the Seller added to a warning list.",
          "We may provide chat/transaction extracts to the police if there are signs of fraud or appropriation of property.",
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
          "Admin may reject or remove listings (including within 24 hours of a valid violation report), reverse abusive deposits, and suspend accounts that break these Guidelines, the Terms of Service, or applicable law.",
        ],
      },
    ],
  },
  VI: {
    updated: UPDATED_VI,
    intro:
      "Nội quy Marketplace áp dụng cho Sen, Breeder và mọi người dùng tin đăng, chat hoặc đặt cọc trên PetCare: Pet Marketplace. Vi phạm có thể dẫn tới gỡ tin hoặc khóa tài khoản.",
    sections: [
      {
        heading: "Tin đăng và hồ sơ trại",
        bullets: [
          "Chỉ đăng thú bạn được phép bán hoặc tìm nhà mới. Nghiêm cấm mua bán động vật hoang dã, động vật nguy cấp, quý, hiếm hoặc bị cấm giao dịch theo pháp luật Việt Nam.",
          "Khai đúng tuổi, giống, giới tính, vaccine, sức khỏe, giá, khu vực và bảo hành. Ảnh / video phải đúng bé đang chào bán.",
          "Gắn chính sách bảo hành rõ ràng trước khi chốt cọc khi sản phẩm yêu cầu.",
          "Hồ sơ Breeder / trại phải phản ánh thực tế chăm sóc; không giả mạo xác minh hay tín hiệu uy tín.",
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
        heading: "Miễn trừ trách nhiệm dịch vụ vận chuyển",
        paragraphs: [
          "PetCare: Pet Marketplace KHÔNG trực tiếp cung cấp dịch vụ vận chuyển hay giao nhận thú cưng. Phương thức, chi phí và rủi ro vận chuyển do Người bán và Người mua tự thỏa thuận và lựa chọn.",
        ],
      },
      {
        heading: "Quy trình 4 bước bàn giao & giải ngân cọc",
        paragraphs: [
          "Bước 1 — Đặt cọc qua Sàn: Người mua chốt cọc bài đăng trên ứng dụng. Hệ thống ghi nhận trạng thái “Đã đặt cọc” nhằm giữ bé cho Người mua và khẳng định thiện chí giao dịch. Hệ thống giữ cọc.",
          "Bước 2 — Thỏa thuận vận chuyển: hai bên tự liên hệ (qua chat/SĐT) để thống nhất thời gian, địa điểm và hình thức vận chuyển (đến tận trại nhận hoặc thuê Pet Taxi/chuyến xe chuyên dụng).",
          "Bước 3 — Giao nhận & kiểm tra: Người mua trực tiếp kiểm tra tình trạng sức khỏe, độ linh hoạt, sổ tiêm vắc-xin và giấy tờ kèm theo tại thời điểm nhận bé.",
          "Bước 4 — Xác nhận hoàn tất: sau khi kiểm tra đạt yêu cầu, hai bên bấm nút Xác nhận đã giao / nhận bé trên ứng dụng. Khi xác nhận hoàn tất, hệ thống chốt đơn thành công và khoản cọc được xử lý/giải ngân theo đúng thỏa thuận ban đầu.",
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
        heading: "Giải quyết tranh chấp & khiếu nại",
        bullets: [
          `Khi phát sinh tranh chấp liên quan lừa đảo tiền cọc, bé cưng bị bệnh truyền nhiễm ngay tại thời điểm nhận, hoặc Người bán không thực hiện đúng bảo hành: bấm “Báo cáo” trên app hoặc gửi email tới ${LEGAL_SUPPORT_EMAIL} kèm bằng chứng (ảnh chat, video bàn giao, sổ tiêm/giấy khám từ bác sĩ thú y).`,
          "Trong vòng 03 ngày làm việc, Ban quản trị sẽ làm việc trực tiếp với cả hai bên để đối soát thông tin lịch sử trên Sàn.",
          "Nếu Người bán vi phạm: khóa tài khoản vĩnh viễn, hoàn trả cọc cho Người mua (nếu khoản cọc đang tạm giữ) và đưa vào danh sách cảnh báo.",
          "Hỗ trợ cung cấp trích xuất dữ liệu lịch sử chat/giao dịch cho Cơ quan Công an nếu có dấu hiệu lừa đảo chiếm đoạt tài sản.",
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
          "Admin có thể từ chối / gỡ tin (kể cả trong vòng 24 giờ sau báo cáo vi phạm hợp lệ), xử lý cọc lạm dụng và tạm khóa tài khoản vi phạm Nội quy, Điều khoản dịch vụ hoặc pháp luật.",
        ],
      },
    ],
  },
};

export const supportContent: Record<"EN" | "VI", LegalDoc> = {
  EN: {
    updated: UPDATED_EN,
    intro:
      "We help with PetCare: Pet Marketplace accounts, Breeder verification, listings, chat, deposits, warranties, and complaints.",
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
          "For deposit / handoff / dispute issues: conversation context, screenshots, and a short timeline.",
          "For account or verification issues: what you tried and any error messages.",
        ],
      },
      {
        heading: "Before you write",
        paragraphs: [
          "For deal questions, first check the listing warranty, deposit-panel status, and Marketplace Guidelines. PetCare: Pet Marketplace moderates the platform but does not replace in-person verification between Sen and Breeder, and does not itself ship pets.",
        ],
      },
    ],
  },
  VI: {
    updated: UPDATED_VI,
    intro:
      "Chúng tôi hỗ trợ tài khoản PetCare: Pet Marketplace, xác minh Breeder, tin đăng, chat, đặt cọc, bảo hành và tiếp nhận phản ánh.",
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
          "Với cọc / bàn giao / tranh chấp: ngữ cảnh hội thoại, ảnh chụp màn hình và dòng thời gian ngắn.",
          "Với tài khoản hoặc xác minh: bước bạn đã thử và thông báo lỗi (nếu có).",
        ],
      },
      {
        heading: "Trước khi gửi",
        paragraphs: [
          "Với câu hỏi giao dịch, hãy xem trước chính sách bảo hành trên tin, trạng thái bảng đặt cọc và Nội quy Marketplace. PetCare: Pet Marketplace kiểm duyệt nền tảng nhưng không thay thế việc Sen và Breeder tự kiểm tra trực tiếp, và không trực tiếp vận chuyển thú cưng.",
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
