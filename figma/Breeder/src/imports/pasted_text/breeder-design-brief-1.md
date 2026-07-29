# PetCare Marketplace — Design brief: Breeder surfaces (Mobile)

**Đối tượng:** Designer Figma (handoff từ Product Owner)  
**Nền tảng:** React Native / Expo — app **Pet Health Care** (*PetCare* trên store)  
**Phạm vi:** Chỉ bề mặt **Breeder** trong tab marketplace (Pet Feed), không thiết kế Pet Care AI / health check  
**Ngôn ngữ UI:** **Tiếng Việt ưu tiên**; gắn label EN trong frame khi hữu ích (component name, screen name)  
**Ngày brief:** 2026-07-29  
**Trạng thái:** Design context — Cursor **không** thay designer; document này là input cho Figma

---

## 0. Ghi chú nhanh cho designer

| Mục | Hướng dẫn |
|-----|-----------|
| Scope note đầu file Figma | **Mobile Marketplace — Breeder surfaces only** |
| Frames bắt buộc | **390×844** (iPhone), tùy chọn **360** Android nhỏ |
| Visual family | Giữ app hiện tại: Inter / system, **Primary `#1E6FE8`**, nền `#F2F4F8`, card trắng bo góc |
| Tránh | Purple-on-white, cream+serif terracotta, dark neon glow, pill cluster trang trí, emoji làm UI |
| Mai | Có thể giữ banner nhẹ trên form đăng ký/sửa hồ sơ (đã có trong app); **không** đưa Mai vào trang public trại |
| Thanh toán | **Không** có payment / escrow trong MVP — mọi “giao dịch” là ngoài app hoặc metric tương lai |

**Code reference (đã ship — đọc để khớp UX hiện tại):**

| Path | Nội dung |
|------|----------|
| `pet-health-frontend/src/screens/PetFeedScreen.tsx` | Tab Breeders / Top Breeders cards |
| `pet-health-frontend/src/screens/BreederDetailScreen.tsx` | Hồ sơ trại public |
| `pet-health-frontend/src/screens/BreederProfileScreen.tsx` | Đăng ký / sửa hồ sơ breeder |
| `pet-health-frontend/src/utils/breederTrust.ts` | Công thức điểm tin cậy hiện tại (0–100) |
| `pet-health-frontend/src/components/PetFeedPostCard.tsx` | Card tin đăng (reuse trên detail) |
| `pet-health-frontend/src/components/MarketplaceLegalNotice.tsx` | Disclaimer marketplace |

> **Gợi ý lưu trữ:** Có thể copy file này vào `docs/MOBILE_BREEDER_DESIGN_CONTEXT.md` cạnh `WEB_DESIGN_CONTEXT.md` nếu team muốn gom brief trong thư mục docs.

---

## 1. Sản phẩm & vai trò

### 1.1 One-liner

Marketplace thú cưng **có cấu trúc** trong app Pet Health Care: Sen tìm tin / so sánh / liên hệ; Breeder đăng tin và xây dựng **trang trại công khai**. Không xử lý thanh toán trong MVP.

### 1.2 Vai trò liên quan brief này

| Role | Mục tiêu trên surface Breeder |
|------|-------------------------------|
| **Sen** (buyer / pet owner) | Browse Top Breeders → mở hồ sơ trại → xem độ tin cậy → xem tin → Message / Zalo / Phone |
| **Breeder** | Đăng ký hồ sơ → chọn **template** trang trại → theo dõi **Farm Health** → sửa profile → đăng tin |
| **Visitor / chưa login** | Có thể xem list & detail ở mức read-only (theo policy hiện tại); CTA login khi Message / Save |
| **Admin** | Xác minh breeder, xử lý report — **không** thiết kế console admin trong brief này |

### 1.3 Value prop cần thể hiện trên UI Breeder

1. **Hồ sơ có cấu trúc** — loại hình, quy mô, giống, khu vực, checklist chăm sóc  
2. **Tín hiệu tin cậy** — verified badge + điểm / cấp độ (không hứa “an toàn tuyệt đối”)  
3. **Liên hệ trong hệ sinh thái** — Message + contact ngoài; disclaimer rõ  

### 1.4 Từ nên dùng / tránh

**Nên dùng:** trại, breeder, hồ sơ trại, điểm tin cậy, xác minh, báo cáo, tin đăng, liên hệ, minh bạch, cam kết, Farm Health / Sức khỏe trại  

**Tránh:** mua ngay trong app, bảo đảm sức khỏe thú, chẩn đoán, thanh toán an toàn, escrow, “top 1 Việt Nam” hype  

**Disclaimer (giữ tinh thần — có thể rút gọn trên card, full trên feed/detail):**

> Tin đăng do người dùng đăng. Pet Health Care không phải bên bán, không xử lý thanh toán và không bảo lãnh sức khỏe thú, thông tin hay giao dịch. Hãy kiểm tra trực tiếp và đọc Nội quy Marketplace trước khi quyết định.

---

## 2. Kiến trúc thông tin (Breeder-related)

```
Pet Feed (Marketplace tab)
├── Tab: New Pets | News | Breeders
│   └── Breeders = Top Breeders list (+ filter species / province / search)
│       └── Tap card → Breeder public detail (Hồ sơ trại)
│           ├── Hero theo template
│           ├── Trust / Farm Health summary (public-safe)
│           ├── Overview + care + listings
│           └── Report / Hide / Message / Contact
│
Account (Breeder role)
├── Đăng ký / Sửa hồ sơ Breeder          [đã có — redesign polish]
├── Chọn template trang trại             [MỚI — design]
├── Farm Health dashboard                [MỚI — design; metric mixed exist/future]
├── Bài đăng của tôi / Tạo tin
└── Messages
```

**Deep link / share (đã có pattern):** share chủ yếu theo **post**; profile trại mở in-app từ Top Breeders hoặc từ card tin (tên breeder). Không bắt buộc thiết kế web URL trong brief mobile này.

---

## 3. Hệ thống thị giác (ràng buộc từ app)

Giữ **cùng visual family** với Pet Feed hiện tại — designer nâng cấp layout/hierarchy, không invent brand mới.

### 3.1 Màu

| Token | Hex / token | Dùng |
|-------|-------------|------|
| Primary | `#1E6FE8` | Header accent, CTA chính, tab active, icon nhấn |
| Primary dark | `#1D4ED8` / `blue-700` | Pressed / link đậm |
| Background | `#F2F4F8` | Screen bg |
| Surface | `#FFFFFF` | Cards, sheets |
| Text primary | `#0F172A` / `slate-900` | Title |
| Text secondary | `#64748B` / `slate-500` | Meta, caption |
| Border | `gray-200` / `#E2E8F0` | Card stroke nhẹ |
| Success / verified | `#059669` emerald | Check signal, verified |
| Warning | `#D97706` amber | Signal chưa đạt, disclaimer soft |
| Danger | `#DC2626` | Report destructive, hide |
| Unread / alert badge | `#EF4444` | Badge số (nếu dùng) |
| Disclaimer | `amber-50` + border `amber-200` | Legal banner |

**Không dùng** severity palette Pet Care (low/med/high) trên surface Breeder trừ khi sau này map trust tier — nếu map, ưu tiên emerald / blue / amber / slate, không traffic-light “chẩn đoán”.

### 3.2 Shape & type

- Card: `rounded-2xl` / `rounded-3xl` (hero), nội dung `rounded-xl`  
- Chip / filter: `rounded-full`  
- Avatar / storefront icon box: `rounded-2xl`  
- Padding ngang nội dung: **20px** (khớp detail hiện tại)  
- Typography: Inter hoặc system tương đương; **Bold / Semibold** cho title; caption uppercase nhỏ cho metric label (app đã dùng pattern này)

### 3.3 Icon

- Ionicons / Feather family như app  
- Breeder identity: **`storefront-outline`**, **`ribbon-outline`** (Top Breeders empty) — **không** medkit trên marketplace  

### 3.4 Composition rules

- Một màn = một nhiệm vụ chính  
- Hero trang trại: một khối nhận diện rõ (template quyết định layout), không collage nhiều floating badge  
- Metric: tối đa **2–4** số nổi bật phía trên; phần còn lại accordion / section  
- Empty state: icon + title + 1 câu body (đã có pattern Top Breeders)

---

## 4. Screen inventory (thiết kế trong Figma)

Đặt frame name EN + title VI trên artboard.

### 4.1 Top Breeders — `PetFeed / Breeders tab`

| | |
|--|--|
| **Mục đích** | Sen khám phá breeder đã verified, có tin hoạt động |
| **Entry** | Pet Feed → tab **Breeders** |
| **Header** | Giống Pet Feed: title marketplace / feed; disclaimer; search; filter chips (species, province, gender nếu áp dụng) |
| **List item (TopBreederCard)** | Rank optional (#1…), avatar/storefront, display name, verified chip, location · species, 2×2 metric mini: Điểm tin cậy, Quy mô, Số bài, Loại hình; CTA **Xem hồ sơ trại** |
| **States** | Loading skeleton; empty (chưa có breeder); empty filtered; error + retry |
| **Ghi chú hiện trạng** | App đã lọc `verification_status === 'verified'` và aggregate từ posts; redesign được nhưng giữ thông tin cốt lõi |

**Nội dung mẫu (VI):**

- Tên: `Cattery Miu House`  
- Meta: `TP.HCM · Mèo`  
- Điểm: `78/100`  
- Quy mô: `4-10 bé`  
- Bài đăng: `6`  
- Loại hình: `Hộ gia đình nuôi sinh sản nhỏ`

---

### 4.2 Breeder public detail — `BreederDetail`

| | |
|--|--|
| **Mục đích** | Trang trại công khai khi Sen tap từ Top Breeders / từ tin |
| **Header** | Back + title **Hồ sơ trại** |
| **Hero** | Theo **template** đã chọn (mục 5) — tên, verified, location, species; metric strip: điểm + số tin (tối thiểu) |
| **Actions (không phải own)** | Báo cáo hồ sơ · Ẩn breeder · (optional sticky) Nhắn tin / Liên hệ |
| **Sections (thứ tự đề xuất)** | 1) Overview · 2) Trust / Farm Health teaser (public) · 3) Về trại (bio, care env) · 4) Thông tin xác thực · 5) Listings + gender/sort chips · list `PetFeedPostCard` compact |
| **Own profile** | Ẩn Report/Hide; có thể hiện chip “Đây là trang của bạn” + CTA **Chỉnh sửa** / **Farm Health** |
| **States** | Empty listings; filtered empty; media missing trên card |

**Public vs private metrics:** Chỉ show số Sen cần để quyết định liên hệ. Chi tiết “failed transactions”, breakdown report nội bộ → ưu tiên trên dashboard breeder (4.4); trên public chỉ **tóm tắt an toàn** (ví dụ: cấp tin cậy + điểm + “Đã xác minh”).

---

### 4.3 Breeder template picker — `BreederTemplatePicker` **[MỚI]**

| | |
|--|--|
| **Mục đích** | Breeder chọn **1 template sẵn** để khởi tạo layout trang trại public |
| **Entry** | Sau đăng ký thành công / từ Account → “Giao diện trang trại” / lần đầu mở Farm page |
| **UI** | Vertical list hoặc 2-col preview cards; mỗi card: thumbnail mock hero, tên template, 1 dòng mô tả, chip “Phù hợp với…” |
| **Selection** | Radio / selected border Primary; CTA sticky **Áp dụng template** |
| **Confirm** | Bottom sheet: “Có thể đổi sau trong cài đặt trang trại. Nội dung hồ sơ (tên, bio…) giữ nguyên.” |
| **States** | Loading previews; apply success toast; error |

**Không phải:** theme builder tự do, kéo-thả section, upload CSS, dark mode riêng.

---

### 4.4 Farm Health dashboard — `BreederFarmHealth` **[MỚI]**

| | |
|--|--|
| **Mục đích** | Breeder xem “sức khỏe” uy tín trại: điểm, cấp, tín hiệu, (tương lai) report & giao dịch |
| **Entry** | Account → **Sức khỏe trại** / từ own BreederDetail |
| **Audience** | **Chỉ breeder (owner)** — không public full dashboard |
| **Hierarchy đề xuất** | Xem mục 6 |
| **CTA phụ** | “Cải thiện điểm” → deep link section còn thiếu trên profile edit; “Xem tin đăng”; “Nội quy Marketplace” |

---

### 4.5 Breeder profile edit / register — `BreederProfile` **[ĐÃ CÓ — polish]**

| | |
|--|--|
| **Mục đích** | Đăng ký / cập nhật thông tin gửi admin xác minh |
| **Sections hiện có** | Banner Mai (optional giữ); Thông tin đăng ký (tên, khu vực, phone, FB, Zalo); Loại hình; Đăng ký trại (nếu registered_kennel); Quy mô & loài; Checklist chăm sóc; Cam kết minh bạch |
| **Cần thiết kế thêm** | Entry tới Template picker; link tới Farm Health; trạng thái verification chip rõ (unverified / pending / verified / rejected / suspended) |
| **Validation** | Field required đã có; error inline + scroll-to-first-error |

**Verification statuses (EN key → VI label):**

| Status | VI |
|--------|-----|
| `unverified` | Chưa xác minh |
| `pending_review` | Chờ duyệt |
| `verified` | Đã xác minh |
| `rejected` | Từ chối |
| `suspended` | Tạm khóa |

---

## 5. Hệ thống Template (trang trại public)

### 5.1 Template nghĩa là gì?

Một **template** = bộ **layout + hierarchy section + hero treatment** cho `BreederDetail` public, khởi tạo từ preset.

| Template quyết định | Template **không** quyết định |
|---------------------|-------------------------------|
| Hero layout (compact / media-led / kennel banner) | Dữ liệu hồ sơ (tên, bio, contact…) |
| Thứ tự nhấn mạnh section (listings-first vs story-first) | Màu brand app (vẫn Primary blue family) |
| Placeholder vùng ảnh cover / gallery môi trường | Logic trust score |
| Density (thoáng vs thông tin dày) | Payment / checkout |

**Nội dung động luôn bind từ profile + posts.** Template chỉ là “khung”.

### 5.2 Section atom (mọi template dùng subset)

1. **HeroIdentity** — name, verified, location, species  
2. **MetricStrip** — trust score, listing count (± public health teaser)  
3. **ActionRow** — Message / Contact / Report  
4. **OverviewBlock** — type, scale, breeds…  
5. **TrustSignalsList** — checklist điểm (public hoặc collapsed)  
6. **StoryBlock** — bio + care_environment  
7. **CredentialsBlock** — registered kennel, checklist, commitments  
8. **ListingsHeader** + filters  
9. **ListingStack** — compact cards  

### 5.3 Đề xuất 3–5 hướng template (đặt tên + brief visual)

Thiết kế **preview card + 1 frame detail full** cho mỗi template. Không over-custom.

| ID | Tên VI (EN) | Hướng | Hero | Section order nhấn | Phù hợp |
|----|-------------|-------|------|--------------------|---------|
| `T1` | **Tối giản tin cậy** (*Trust Minimal*) | Gọn, metric rõ | Icon storefront + tên trên nền Primary/blue gradient nhẹ | Metric → Trust → Overview → Listings | Home breeder, lần đầu |
| `T2` | **Trại có ảnh bìa** (*Cover Farm*) | Media-led | Cover photo full-bleed (tỉ lệ ~16:9) + overlay tên; avatar góc | Hero media → Story → Listings → Trust | Kennel có ảnh môi trường |
| `T3` | **Ưu tiên tin đăng** (*Listings First*) | Commerce browse | Hero compact 1 dòng | Metric nhỏ → **Listings ngay** → Overview accordion | Breeder nhiều tin |
| `T4` | **Cứu hộ / Foster** (*Rescue Soft*) | Ấm, nhấn cam kết | Hero surface trắng + badge soft emerald “Cứu hộ / foster” | Story + commitments → Listings → Trust | `rescue_foster`, `rehoming` |
| `T5` | **Kennel đăng ký** (*Registered Kennel*) | Chuyên nghiệp, credentials | Banner + dòng “Trại đăng ký: {name}” | Credentials → Trust → Listings | `registered_kennel` |

**Default khi chưa chọn:** `T1 Trust Minimal` (khớp UI detail hiện tại nhất).

**Figma deliverable:**  
- Component `TemplatePreviewCard`  
- 5 variants hero trên cùng dummy data  
- Annotation: “Đổi template không xóa dữ liệu”

---

## 6. Farm Health metrics UX

### 6.1 Mục tiêu cảm xúc

Breeder hiểu: *“Trại mình đang đứng ở đâu, thiếu gì để tăng tin cậy, có rủi ro report không?”* — **không** tạo cảm giác xếp hạng toxic hoặc “điểm tín dụng ngân hàng”.

### 6.2 Hierarchy màn dashboard (top → bottom)

```
[1] Header: Sức khỏe trại
[2] ScoreHero: điểm lớn /100 + TrustLevel chip + 1 câu giải thích
[3] SnapshotRow: 3–4 metric tiles
[4] SignalChecklist: từng tín hiệu đạt/chưa (từ trust hiện tại)
[5] Activity / Risk (future-ready, có thể empty)
[6] How to improve: CTA list
[7] Footnote disclaimer điểm tham khảo
```

### 6.3 Metric dictionary — Exist vs Future

Gắn badge trên Figma: `SHIPPED` | `DESIGN NOW / DATA LATER` | `OUT OF SCOPE MVP`

| Metric | Label VI (EN) | Nguồn ý tưởng | Trạng thái | Public? | Empty / zero |
|--------|---------------|---------------|------------|---------|--------------|
| **Trust score** | Điểm tin cậy (Trust score) | `computeBreederTrust` 0–100 | **SHIPPED** | Có (số) | `0/100` + “Hồ sơ còn thiếu thông tin” |
| **Verification** | Trạng thái xác minh | `verification_status` | **SHIPPED** | Có (badge) | Chip “Chưa xác minh” |
| **Trust signals breakdown** | Chi tiết tín hiệu | verified 30 · checklist 15 · commitments 15 · contact 15 · care env 15 · listings 10 | **SHIPPED** | Teaser / optional | Icon amber + điểm 0/max |
| **Active listings** | Tin đang hiển thị | Count posts published | **SHIPPED** | Có | `0` + CTA tạo tin |
| **Reports received** | Số báo cáo | Report profile/posts | **DESIGN NOW / DATA LATER** | Không (hoặc chỉ “Có báo cáo đang xử lý” rất thận trọng) | `0` = “Chưa có báo cáo” (positive calm, không celebration quá) |
| **Trust level** | Cấp tin cậy | Derive từ score + verification | **DESIGN NOW** (map UI); logic có thể client-side | Có (tên cấp) | Cấp thấp nhất khi 0 |
| **Successful transactions** | Giao dịch thành công | Chưa có payment; có thể self-report / future | **DESIGN NOW / DATA LATER** | Thường không | `0` + “Chưa ghi nhận — MVP chưa theo dõi giao dịch trong app” |
| **Failed / disputed transactions** | Giao dịch thất bại / tranh chấp | Future moderation | **DESIGN NOW / DATA LATER** | Không | `0` / hidden until feature flag |
| **Response time** | Thời gian phản hồi tin nhắn | Messaging analytics | **OUT OF SCOPE MVP** | — | — |
| **Profile views** | Lượt xem trang | Analytics | **OUT OF SCOPE MVP** | — | — |

### 6.4 Đề xuất Trust Level (UI labels — product có thể chỉnh số)

| Level | VI | Gợi ý điều kiện (chỉ để design) |
|-------|-----|----------------------------------|
| `L0` | Mới bắt đầu | Chưa verified hoặc score &lt; 40 |
| `L1` | Đang xây dựng | Score 40–69 |
| `L2` | Đáng tin cậy | Verified + score 70–89 |
| `L3` | Đối tác nổi bật | Verified + score ≥ 90 + có tin active |

Hiển thị: chip text + màu slate→blue→emerald; **không** ngôi sao 5 cánh kiểu review spam.

### 6.5 ScoreHero copy

- Title: **Sức khỏe trại** / *Farm Health*  
- Body: “Điểm này là tín hiệu tham khảo trong Pet Health Care, dựa trên mức độ minh bạch hồ sơ và bài đăng.” (đã có tinh thần `breederDetail.trustBody`)  
- Improve: “Hoàn thiện checklist chăm sóc (+15)”, “Thêm ảnh môi trường”, “Đăng tin đang bán”

### 6.6 Snapshot tiles (owner dashboard)

Hàng 1 (ưu tiên):

1. Điểm tin cậy — `78`  
2. Cấp — `Đáng tin cậy`  
3. Báo cáo — `0` (hoặc `2 đang mở` khi có data)  
4. Tin đăng — `6`

Hàng 2 (future, có thể dim + lock icon “Sắp có”):

5. Giao dịch thành công — `—`  
6. Giao dịch thất bại — `—`

### 6.7 Empty / zero principles

| Trường hợp | UI |
|------------|-----|
| Score 0 | Không đỏ “danger”; dùng slate + checklist việc cần làm |
| 0 reports | Text secondary: “Chưa có báo cáo nào” |
| 0 listings | CTA Primary outline: “Tạo tin đăng” |
| Pending verification | Banner amber: “Hồ sơ đang chờ admin duyệt (~1 ngày)” |
| Rejected / suspended | Banner đỏ nhẹ + CTA hỗ trợ / sửa hồ sơ — không cho đổi template hoa mỹ |

---

## 7. Component list cho Figma

Đặt trong page **Components / Breeder**.

### 7.1 Navigation & chrome

- `FeedTabs` — New Pets | News | Breeders (VI: Tin mới | Tin tức | Breeders)  
- `MarketplaceDisclaimerBanner`  
- `SearchBar` / `FilterChips` / `SortChips`  
- `ScreenHeader` — back + title  

### 7.2 Top Breeders

- `TopBreederCard` — default / pressed / skeleton  
- `RankBadge` (optional #1–3)  
- `VerifiedBadge`  
- `MetricMiniCell`  
- `TopBreedersEmpty` / `FilteredEmpty`  

### 7.3 Public detail

- `BreederHero` — variants **T1…T5**  
- `MetricStrip`  
- `BreederActionRow`  
- `OverviewInfoRow`  
- `TrustSignalRow` — passed / not passed  
- `StoryBlock` / `CredentialsBlock`  
- `ListingsFilterChip`  
- `PetFeedPostCard` compact (reuse)  
- `ReportModal` / `HideConfirmDialog`  

### 7.4 Template picker

- `TemplatePreviewCard` — selected / unselected  
- `TemplateApplyBar` sticky  
- `TemplateConfirmSheet`  

### 7.5 Farm Health

- `FarmHealthScoreHero`  
- `TrustLevelChip` — L0…L3  
- `FarmHealthSnapshotTile` — value / zero / coming-soon  
- `TrustSignalChecklist`  
- `ImproveTaskRow`  
- `FarmHealthDisclaimer`  

### 7.6 Profile edit

- `VerificationStatusBanner`  
- `FormSectionCard`  
- `ChipSelect` / `CheckboxCommitment`  
- `PrimarySubmitButton`  
- Entry rows: `GoToTemplatePicker`, `GoToFarmHealth`  

---

## 8. Giọng điệu & copy

### 8.1 Tone

Ấm, rõ, thực tế. Tôn trọng Sen đang lo sợ lừa đảo; tôn trọng Breeder đang xây uy tín. Không marketing phóng đại.

### 8.2 Microcopy gợi ý (VI / EN label)

| Context | VI | EN label (frame) |
|---------|----|------------------|
| Tab | Breeders | Breeders |
| CTA card | Xem hồ sơ trại | View farm profile |
| Detail title | Hồ sơ trại | Breeder detail |
| Trust | Điểm tin cậy | Trust score |
| Dashboard | Sức khỏe trại | Farm Health |
| Template | Chọn giao diện trang trại | Choose farm template |
| Apply | Áp dụng template | Apply template |
| Reports zero | Chưa có báo cáo | No reports |
| Tx coming soon | Chưa theo dõi giao dịch trong app | Transactions not tracked yet |
| Improve | Cải thiện điểm | Improve score |

### 8.3 Sample content cho frame

```
display_name: Cattery Miu House
location: Quận 7, TP.HCM
breederType: home_breeder → Hộ gia đình nuôi sinh sản nhỏ
species: Mèo · British Shorthair, Scottish Fold
trust.score: 78/100
trust.level: Đáng tin cậy
listings: 6
reports: 0
verification: verified
```

---

## 9. Ràng buộc mobile (Expo / RN)

| Chủ đề | Spec |
|--------|------|
| Safe area | Tôn trọng notch / home indicator; sticky CTA cách bottom inset ≥ 8–12px |
| Touch | Min hit ~44×44; chip filter dễ tap bằng ngón cái |
| Thumb zone | Primary CTA (Áp dụng template, Gửi xác minh, Nhắn tin) nằm nửa dưới màn |
| List density | TopBreederCard: đủ thở — tránh khoảng cách &lt; 12px giữa cards; metric 2×2 readable (không &lt; 11pt) |
| Scroll | Một ScrollView chính; filter chips horizontal không bị che bởi header |
| Keyboard | Profile form: tránh CTA bị bàn phím che (KeyboardAvoiding / sticky ngoài keyboard) |
| Image | Cover template: placeholder tỉ lệ cố định; không layout shift; pattern `expo-image` |
| Performance | Card list memo-friendly: ít shadow chồng, ít blur; skeleton thay spinner full-screen khi có thể |
| a11y | Label nút: “Xem hồ sơ trại {name}”; contrast text trên Primary hero đủ trắng / blue-50 |

---

## 10. User flows cần frame flow (không chỉ màn lẻ)

### Flow S1 — Sen khám phá breeder

```
Pet Feed → Tab Breeders → (filter) → TopBreederCard
  → BreederDetail → Listings → Post detail
  → Message / Contact ngoài
```

### Flow B1 — Breeder setup trang trại

```
Account → Đăng ký Breeder → (pending) → verified
  → Template picker → Apply
  → (optional) Farm Health xem điểm
  → Tạo tin đăng
```

### Flow B2 — Breeder theo dõi uy tín

```
Account → Sức khỏe trại → xem signal thiếu
  → CTA hoàn thiện profile → quay lại score tăng (mock)
```

### Flow S2 — Sen báo cáo

```
BreederDetail → Báo cáo hồ sơ → ReportModal → success
```

---

## 11. States & edge cases (checklist Figma)

- [ ] Top Breeders: skeleton, empty, filtered empty, error  
- [ ] Detail: own vs other user; unverified không vào Top list nhưng có thể mở từ deep link? (annotate assumption)  
- [ ] Template: chưa chọn (default T1); đang chọn; vừa apply  
- [ ] Farm Health: score 0; pending verify; verified high score; reports &gt; 0 (mock); transactions “coming soon”  
- [ ] Profile: validation errors; submit success; rejected banner  
- [ ] Long display name (2 dòng); missing avatar; missing bio  

---

## 12. Out of scope — **không thiết kế trong phase này**

| Không vẽ | Lý do |
|----------|--------|
| Pet Care Home, Health check, Results, Core Care, Vet summary, Breed recognition | Mobile Pet Care — ngoài marketplace brief |
| Mai onboarding full / chat Mai trên trang public trại | Giữ marketplace sạch |
| Web pet-marketplace.org frames | Có brief web riêng; brief này = **mobile app** |
| Admin review console | Phase khác |
| In-app payment, checkout, escrow, ví | Không có trong MVP |
| Theme builder kéo-thả / upload font riêng | Template preset only |
| Leaderboard toàn quốc kiểu gamification nặng | Top Breeders = browse list, không “đấu hạng” |
| Analytics charts phức tạp (views over time) | Out of scope MVP |
| Dark mode riêng cho farm page | Theo system app sau |
| Desktop / tablet layout | Mobile-first 390 |

---

## 13. Deliverables Figma đề xuất

1. Cover + **scope note** (mobile breeder only)  
2. Foundations: color, type, radius, badges (link tới app tokens)  
3. Components (mục 7)  
4. Screens: Top Breeders · Detail × 5 templates · Template picker · Farm Health · Profile edit polish  
5. Flows S1, B1, B2  
6. Annotation đỏ: `SHIPPED` vs `NEW` vs `DATA LATER`  
7. VI copy trên frame; EN screen/component names  

---

## 14. Mapping nhanh: hiện trạng code → việc design

| Surface | Code hôm nay | Việc designer |
|---------|--------------|---------------|
| Top Breeders | Card trong `PetFeedScreen` | Nâng visual hierarchy, rank?, skeleton chuẩn hóa |
| Breeder detail | `BreederDetailScreen` hero blue cố định | Tách thành template variants T1–T5 |
| Trust score | `breederTrust.ts` | Giữ thang 0–100; thêm Trust Level chips |
| Profile form | `BreederProfileScreen` | Polish + entry Template & Farm Health |
| Template picker | Chưa có | **Thiết kế mới** |
| Farm Health dashboard | Chưa có (trust đang nằm trong detail) | **Thiết kế mới**; tách public teaser vs owner dashboard |
| Reports / transactions metrics | Chưa đủ product data | UI sẵn + empty/coming-soon |

---

## 15. Checklist trước khi handoff engineering

- [ ] Mọi màn có safe-area & sticky CTA annotated  
- [ ] Template chỉ đổi layout, không đổi data model fields  
- [ ] Farm Health ghi rõ metric shipped vs placeholder  
- [ ] Disclaimer / trust body không claim bảo lãnh giao dịch  
- [ ] Không có màn thanh toán  
- [ ] Spec spacing 8pt grid gần với NativeWind hiện tại (`p-4`, `gap-3`, `rounded-2xl`)  

---

### Phụ lục A — Trust score hiện tại (để designer không invent công thức sai)

Tổng tối đa **100**, cộng các tín hiệu:

| Signal key | Max | Điều kiện đạt (tóm tắt) |
|------------|-----|-------------------------|
| `verified` | 30 | `verification_status === 'verified'` |
| `careChecklist` | 15 | ≥3 mục checklist (mỗi mục ~3 điểm) |
| `commitments` | 15 | ≥2 cam kết |
| `contact` | 15 | Có phone / zalo / facebook |
| `careEnvironment` | 15 | Có `care_environment` hoặc `bio` |
| `activeListings` | 10 | Có tin (2 điểm/tin, max 10) |

---

### Phụ lục B — Loại hình breeder (chip / filter copy)

| Key | VI |
|-----|-----|
| `registered_kennel` | Trại đăng ký chính thức |
| `home_breeder` | Hộ gia đình nuôi sinh sản nhỏ |
| `rescue_foster` | Cứu hộ / foster |
| `rehoming` | Cá nhân tìm nhà mới cho bé |
| `other` | Khác |

---

*Brief mobile Breeder surfaces — Pet Health Care Marketplace. Cập nhật mục 6.3 khi product chốt data nguồn cho reports / transactions.*
