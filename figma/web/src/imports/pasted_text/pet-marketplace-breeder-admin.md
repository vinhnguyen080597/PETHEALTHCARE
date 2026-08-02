# Pet Marketplace — Figma brief (Web): Breeder + Admin

**Copy this one file into Figma** (page description, FigJam, or frame notes).  
**Updated:** 2026-08-02  
**Platform:** pet-marketplace.org (web only)  
**Language:** VI primary · EN for component / screen names  

| Part | Scope |
|------|--------|
| **A — Breeder** | Top Breeders, farm T1–T5, template picker, Farm Health, profile form, Phase Now sync |
| **B — Admin** | Ops console: queues, vaccine evidence, confirm violation, users, features, news |

**Out of this paste:** Mobile RN frames · Pet Care AI / Mai · PetCoin / PSP payment UI (Phase A+)  

**Canonical economy:** `BREEDER_COMPETITION_ECONOMY_DESIGN_CONTEXT.md` (Phase Now already shipped on app).

**How to use in Figma**
1. Create file page **Web / Breeder** → paste Part A into a sticky / text layer (or split by `##` into frame notes).
2. Create page **Web / Admin** → paste Part B.
3. Tag frames: `SHIPPED` · `NEW` · `DESIGN NOW / DATA LATER` · `OUT OF SCOPE MVP`.
4. Frames: **1280 / 768 / 390**.

---

# PART A — Breeder surfaces (Web)

**Đối tượng:** Designer Figma (handoff từ Product Owner)  
**Nền tảng:** Responsive **web** trên **pet-marketplace.org** (desktop-first marketing/marketplace + tablet; mobile web ≤640)  
**Phạm vi:** Chỉ bề mặt **Breeder** trong Pet Marketplace web — không thiết kế Pet Care AI / health check / Mai core UX  
**Ngôn ngữ UI:** **Tiếng Việt ưu tiên**; song ngữ VI/EN trên frame khi hữu ích (component name, screen name, a11y label)  
**Ngày brief:** 2026-07-30 · **Cập nhật Phase Now:** 2026-08-02  
**Trạng thái:** Design context — Cursor **không** thay designer; document này là input cho Figma  
**Parity:** Song song với brief mobile [`docs/MOBILE_BREEDER_DESIGN_CONTEXT.md`](./MOBILE_BREEDER_DESIGN_CONTEXT.md) — **cùng data fields, trust formula, template IDs T1–T5**; khác layout/IA/chrome web  
**Canonical economy:** [`docs/BREEDER_COMPETITION_ECONOMY_DESIGN_CONTEXT.md`](./BREEDER_COMPETITION_ECONOMY_DESIGN_CONTEXT.md) · Admin web: [`docs/WEB_ADMIN_DESIGN_CONTEXT.md`](./WEB_ADMIN_DESIGN_CONTEXT.md)

---

## 0. Ghi chú nhanh cho designer

| Mục | Hướng dẫn |
|-----|-----------|
| Scope note đầu file Figma | **Web Marketplace — Breeder surfaces only** (`pet-marketplace.org`) |
| Frames bắt buộc | **1280** (desktop), **768** (tablet), **390** (mobile web) — ưu tiên desktop layout trước, adapt xuống |
| Visual family | Inter, **Primary `#1E6FE8`**, nền `#F2F4F8`, card trắng `rounded-xl`; verified emerald; pending amber; danger red |
| Tránh | Purple-on-white mặc định, cream+serif terracotta, dark neon glow — **trừ** accent cố ý của template (T3 tím, T4 xanh, T5 gold/navy) |
| Brand header | **Pet Marketplace** (storefront/home icon) — **không** medkit; **không** đưa Mai vào trang public trại |
| Thanh toán | **Không** payment / checkout / escrow trong MVP |
| Chrome | Top nav / sticky filter bar / sticky CTA rail — **không** bottom tab bar, không Expo / RN safe-area |

**Code / product reference (shared API với app — đọc để khớp data):**

| Path / URL | Nội dung |
|------------|----------|
| `pet-health-frontend/src/screens/PetFeedScreen.tsx` | Tab Breeders / Top Breeders (UX nguồn) |
| `pet-health-frontend/src/screens/BreederDetailScreen.tsx` | Hồ sơ trại public |
| `pet-health-frontend/src/screens/BreederProfileScreen.tsx` | Đăng ký / sửa hồ sơ |
| `pet-health-frontend/src/utils/breederTrust.ts` | Công thức điểm tin cậy 0–100 |
| `pet-health-frontend/src/utils/breederQualityIndex.ts` | **Phase Now:** Quality Index + Home Breeder quota + `effectiveTrustScore` |
| `pet-health-frontend/src/utils/petFeedHealthEvidence.ts` | **Phase Now:** vaccine evidence khi khai đã tiêm |
| `pet-health-frontend/src/screens/FarmHealthScreen.tsx` | Farm Health: violations + penalty + stake “Sắp có” |
| `docs/MOBILE_BREEDER_DESIGN_CONTEXT.md` | Brief mobile — **parity bắt buộc** |
| `docs/WEB_DESIGN_CONTEXT.md` | Brief web marketplace tổng (landing, feed, messages…) |
| `docs/WEB_ADMIN_DESIGN_CONTEXT.md` | Brief **Admin console web** |
| Share listing (đã có) | `https://pet-marketplace.org/app/pet-feed/posts/{postId}/` |


---

## 0.1 Phase Now sync (app đã ship — web Figma cần cập nhật)

Đối chiếu **BREEDER_COMPETITION_ECONOMY Phase Now** (đã có trên mobile/API). Web brief cũ (07-30) chưa phản ánh đủ — cập nhật artboard theo bảng dưới. **PetCoin / Boost / Escrow / Stake flow thật = Phase A+** — vẫn **OUT** khỏi MVP Breeder web (chỉ empty “Sắp có” nếu đã vẽ).

| Surface | Trước (brief 07-30) | Phase Now (bắt buộc parity) | Tag Figma |
|---------|---------------------|-----------------------------|-----------|
| **Top Breeders sort** | Optional sort điểm / số tin / mới | Sort theo **Quality Index**: `0.40×Trust + 0.30×ListingQuality + 0.20×Freshness + 0.10×Completeness`; soft **Home Breeder quota ~25%** (`home_breeder` hoặc scale `1_3`, Trust ≥ 40) | `SHIPPED` logic · layout web `NEW` |
| **Top Breeders card** | Rank # optional, post count nổi | **Không** “#1 pay-to-win”; post count chỉ meta phụ; chip “Hộ gia đình” optional | `SHIPPED` |
| **Create / edit listing** | Vaccine status tự do | Vaccine ≠ unknown / “chưa tiêm” → **≥1 ảnh bằng chứng** (sổ/tem) → `metadata.health_evidence_urls` | `SHIPPED` gate · web form `NEW` |
| **Farm Health** | Reports = DATA LATER | **Violations** + `penaltyPoints` (Admin uphold only); empty “Chưa có báo cáo được xác nhận”; **effective trust** = max(0, trust − penalty) | `SHIPPED` |
| **Farm Health CTA** | Improve score | CTA disabled **“Ký quỹ khôi phục”** + “Sắp có” (Phase C) — không fake flow | `DESIGN NOW / DATA LATER` |
| **Deals / coin** | Coming soon | Giữ “Sắp có” — **không** vẽ nạp tiền / PSP trong brief Breeder | `OUT OF SCOPE MVP` |
| **Admin console** | “Phase khác” | [`WEB_ADMIN_DESIGN_CONTEXT.md`](./WEB_ADMIN_DESIGN_CONTEXT.md) | — |


---

## 1. Mục đích / audience

### 1.1 Brief này để làm gì?

Cung cấp **context thiết kế Figma cho WEB** các surface Breeder của Pet Marketplace: Top Breeders, hồ sơ trại public (5 template), chọn template, Farm Health (owner), và polish form đăng ký/sửa hồ sơ — trong kiến trúc thông tin web (header, sidebar, grid, sticky rail), không phải frame React Native.

### 1.2 Ai dùng document

| Vai trò | Cách dùng |
|---------|-----------|
| **Designer Figma** | Artboard, component, annotation `SHIPPED` / `NEW` / `DATA LATER` |
| **PO / PM** | Scope, PO questions (mục 15), parity với mobile |
| **FE web** | Spec layout responsive + mapping field (không invent metric) |

### 1.3 Nguyên tắc parity với mobile

- **Cùng:** roles, fields hồ sơ, trust score formula, template IDs T1–T5, Farm Health metric dictionary (SHIPPED vs DATA LATER), disclaimer, copy VI cốt lõi  
- **Khác:** breakpoints, mật độ grid, filter sidebar, hero rộng, sticky CTA desktop, SEO/OG farm URL, hover/focus/keyboard, SiteHeader thay app tabs  

---

## 2. Product & roles

### 2.1 One-liner (web)

**Pet Marketplace** (`pet-marketplace.org`): marketplace thú cưng có cấu trúc — Sen tìm / so sánh tin & breeder, liên hệ an toàn. Breeder xây **trang trại công khai** (SEO-friendly). **Không xử lý thanh toán** trong MVP.

App mobile liên quan: **Pet Health Care** (*PetCare*) — nơi có Pet Care AI; web chỉ cross-sell tải app, không replicate health flows.

### 2.2 Vai trò trên surface Breeder (web)

| Role | Mục tiêu trên web Breeder |
|------|---------------------------|
| **Sen** (buyer / pet owner) | Browse Top Breeders → mở hồ sơ trại → xem độ tin cậy → xem tin → Message / Zalo / Phone |
| **Breeder** | Đăng ký hồ sơ → chọn **template** → theo dõi **Farm Health** → sửa profile → đăng tin |
| **Visitor / chưa login** | Xem list & public profile (SEO/share); CTA login khi Message / Save |
| **Admin** | Xác minh / report — **không** thiết kế console admin trong brief này |
| **Vet** | Planned — **out of scope** brief này |

### 2.3 Value prop cần thể hiện

1. **Hồ sơ có cấu trúc** — loại hình, quy mô, giống, khu vực, checklist chăm sóc  
2. **Tín hiệu tin cậy** — verified badge + điểm / cấp (không hứa “an toàn tuyệt đối”)  
3. **Liên hệ trong hệ sinh thái** — Message + contact ngoài; disclaimer rõ  

### 2.4 Từ nên dùng / tránh

**Nên dùng:** trại, breeder, hồ sơ trại, điểm tin cậy, xác minh, báo cáo, tin đăng, liên hệ, minh bạch, cam kết, Farm Health / Sức khỏe trại, marketplace guidelines  

**Tránh:** mua ngay trên web, bảo đảm sức khỏe thú, chẩn đoán, thanh toán an toàn, escrow, “top 1 Việt Nam” hype  

**Disclaimer (bắt buộc trên Top Breeders, farm detail, form đăng tin — cùng tinh thần mobile):**

> **VI:** Tin đăng do người dùng đăng. Pet Health Care không phải bên bán, không xử lý thanh toán và không bảo lãnh sức khỏe thú, thông tin hay giao dịch. Hãy kiểm tra trực tiếp và đọc Nội quy Marketplace trước khi quyết định.  
> **EN:** Listings are posted by users. Pet Health Care is not the seller, does not process payments, and does not guarantee pets, health claims, or transactions. Verify in person and read our Marketplace Guidelines before deciding.

---

## 3. Visual constraints + web tokens

Giữ visual family với app / web marketplace tổng; **không** dùng severity colors Pet Care (low/med/high).

### 3.1 Màu

| Token | Hex / token | Dùng |
|-------|-------------|------|
| Primary / Header | `#1E6FE8` | SiteHeader, CTA chính, tab/link active |
| Primary alt | `#2563EB` | Link, focus ring companion |
| Primary dark | `#1D4ED8` | Hover CTA |
| Background | `#F2F4F8` | Page bg |
| Surface | `#FFFFFF` | Cards, modals, sidebar panels |
| Text primary | `#0F172A` | Headings |
| Text secondary | `#64748B` | Meta, captions |
| Border | `#E2E8F0` | Card stroke nhẹ |
| Verified | `#059669` emerald | VerifiedBadge |
| Warning / pending | `#D97706` amber | Pending verify, soft warning |
| Danger | `#DC2626` | Report, destructive |
| Unread badge | `#EF4444` | Messages / notifications |
| Disclaimer | `amber-50` + border `amber-200` | MarketplaceLegalNotice |

**Template accents (chỉ trên hero/accent strip của farm public — không đổi Primary app toàn site):**

| ID | Accent |
|----|--------|
| T1 Trust Minimal | `#1E6FE8` |
| T2 Cover Farm | `#0F172A` (overlay trên ảnh) |
| T3 Listings First | `#7C3AED` |
| T4 Rescue Soft | `#059669` |
| T5 Registered Kennel | `#B45309` (+ navy phụ nếu cần credentials) |

### 3.2 Typography & shape (web)

| Token | Spec |
|-------|------|
| Body | Inter 400 |
| Medium / Semibold / Bold | Inter 500 / 600 / 700 |
| Card | `rounded-xl` (12px); hero farm có thể `rounded-2xl` |
| Button / chip | `rounded-full` (pill) |
| Content max-width | **~1200px** marketplace grid; farm detail có thể tới **1280** với rail |
| Padding ngang | 20–24px (≤640), 32–40px (≥1024) |

### 3.3 Icon

- Lucide / Heroicons tương đương Ionicons/Feather app  
- Breeder: **storefront**, **ribbon** (empty) — **không** medkit  

### 3.4 Composition (web)

- Một section = một nhiệm vụ  
- Hero farm: một khối nhận diện (template quyết định); **không** collage floating badge trên hero media  
- Metric public: tối đa **2–4** số nổi; chi tiết trên Farm Health owner  
- Desktop: tận dụng chiều ngang (sidebar filter, 2-col overview, sticky CTA) — tránh “dashboard clutter” trên public profile  

---

## 4. Information architecture (web)

### 4.1 Vị trí trong site

```
pet-marketplace.org
├── /                              → Landing (có thể teaser Top Breeders / CTA Breeders)
├── /app/
│   ├── /pet-feed                  → Browse tabs: New Pets | News | Breeders
│   │   └── (tab Breeders)         → Top Breeders browse  [SHIPPED UX mobile → WEB NEW layout]
│   ├── /breeders/:id              → Public farm profile (Hồ sơ trại) + template T1–T5
│   │                               [SEO / share URL — đề xuất; annotate]
│   ├── /account
│   │   ├── /breeder-profile       → Đăng ký / sửa hồ sơ
│   │   ├── /breeder-template      → Template picker (owner)  [NEW]
│   │   ├── /farm-health           → Sức khỏe trại (owner)   [NEW]
│   │   └── /listings/...          → Tin của tôi / tạo tin
│   ├── /messages
│   └── /login | /signup
```

**IA đề xuất (breadcrumb / nav mental model):**

```
Marketplace → Breeders (Top Breeders) → Hồ sơ trại (/breeders/:id)
Account (Breeder) → Hồ sơ · Giao diện trang trại · Sức khỏe trại · Tin đăng
```

**SiteHeader (đề xuất):**  
`[Logo Pet Marketplace]  Browse  Breeders  [Search…]  💬  🔔  Account` + LanguageToggle  

Không có tab “Home / My Pets” trên web.

### 4.2 Deep link / SEO / share

| Surface | URL pattern (đề xuất) | Ghi chú |
|---------|----------------------|---------|
| Listing (đã có) | `/app/pet-feed/posts/{postId}/` | OG đã có pattern trên app share |
| Farm profile | `/app/breeders/{breederId}/` (hoặc `/breeders/{id}`) | **Public URL** — thiết kế frame **OG / share preview**: avatar/cover, tên trại, location, verified, trust level tóm tắt, CTA “Xem trên web” / “Mở trong app” |
| Top Breeders | `/app/pet-feed` + tab Breeders (query `?tab=breeders` optional) | |

Annotate: farm OG **không** claim bảo lãnh; không hiện số giao dịch thất bại.

### 4.3 User flows (web)

**Flow S1 — Sen khám phá**

```
Landing hoặc /app/pet-feed → tab Breeders → filter/sidebar
  → TopBreederCard → /breeders/:id → Listings → Post detail
  → Message / Contact ngoài
```

**Flow B1 — Breeder setup**

```
Login → Account → Breeder profile → (pending) → verified
  → Template picker → Apply
  → Farm Health (optional)
  → Create listing
```

**Flow B2 — Theo dõi uy tín**

```
Account → Sức khỏe trại → signal thiếu → CTA hoàn thiện profile
```

**Flow S2 — Báo cáo**

```
Farm detail → Báo cáo hồ sơ → ReportModal → success
```

**Flow V1 — Visitor từ share farm**

```
OG / link Zalo·FB → Farm public (web) → [Login] Message / Save
  → footer CTA tải Pet Health Care
```

---

## 5. Screen inventory

Đặt frame name EN + title VI trên artboard. Annotate breakpoint.

### 5.1 Top Breeders — `Web / Breeders browse` **[SHIPPED data · WEB layout NEW]**

| | |
|--|--|
| **Mục đích** | Sen khám phá breeder đã verified, có tin hoạt động |
| **Entry** | SiteHeader **Breeders** · tab **Breeders** trên Pet Feed · landing teaser |
| **Chrome** | SiteHeader + MarketplaceDisclaimerBanner + SearchBar |
| **Desktop (≥1024)** | **Filter sidebar** trái (species, province, breeder type) **hoặc** sticky top filter bar; main = **grid 2–3 cột** TopBreederCard; default sort = **Quality Index** (không raw postCount); optional sort phụ (mới / tên) — **không** Boost trong organic |
| **Tablet (768)** | Grid 2 cột; filter drawer hoặc sticky chips |
| **Mobile web (≤640)** | 1 cột; filter chips horizontal (gần mobile app) |
| **Card (TopBreederCard)** | Rank optional (#1…); avatar/storefront; display name; VerifiedBadge; location · species; metric mini: Điểm tin cậy, Quy mô, Số bài, Loại hình; CTA **Xem hồ sơ trại** (hover: elevation nhẹ + focus ring) |
| **States** | Skeleton grid; empty; empty filtered; error + retry |
| **Hiện trạng** | App: verified-only + **Quality Index** + Home quota (~25%); web cùng logic, khác chrome/grid |

**Nội dung mẫu:** Cattery Miu House · TP.HCM · Mèo · `78/100` · `4-10 bé` · `6` tin · Hộ gia đình nuôi sinh sản nhỏ  

### 5.2 Public farm detail — `Web / BreederDetail` × 5 templates

| | |
|--|--|
| **Mục đích** | Trang trại công khai (SEO + share) |
| **Header** | SiteHeader; breadcrumb `Breeders / {name}`; title **Hồ sơ trại** |
| **Desktop layout** | **Wider hero** full content width; dưới hero: **2 cột** — trái Overview + Story + Credentials; phải **Trust teaser** + sticky **CTA rail** (Nhắn tin, Liên hệ Zalo/Phone/FB, Lưu, Chia sẻ, Báo cáo); dưới cùng **Listings grid** 2–3 cột |
| **Tablet** | Hero full; overview xếp dọc; CTA bar sticky bottom hoặc top |
| **Mobile web** | Stack dọc gần mobile brief; sticky bottom CTA |
| **Sections** | 1) Hero (template) · 2) MetricStrip · 3) Overview · 4) Trust teaser (public-safe) · 5) Story · 6) Credentials · 7) Listings + filter/sort |
| **Own profile** | Chip “Đây là trang của bạn” + CTA **Chỉnh sửa** / **Sức khỏe trại** / **Đổi template** — ẩn Report/Hide |
| **Public vs private** | Public chỉ tóm tắt an toàn (điểm, cấp, verified). Breakdown report / failed tx → owner Farm Health |

**States:** empty listings; filtered empty; missing cover/avatar; long name wrap  

### 5.3 Template picker — `Web / BreederTemplatePicker` **[NEW]**

| | |
|--|--|
| **Mục đích** | Owner chọn **1** template preset cho trang public |
| **Entry** | Sau đăng ký · Account → “Giao diện trang trại” · banner trên own farm |
| **Desktop** | **Preview lớn** (mock hero ~16:9 hoặc 4:3); lưới **2–3 cột** TemplatePreviewCard; **optional** chế độ **so sánh cạnh nhau** 2 template (split preview) — không bắt buộc MVP nhưng nên có frame |
| **Selection** | Radio / border Primary; sticky footer hoặc side panel CTA **Áp dụng template** |
| **Confirm** | Modal (không bottom sheet bắt buộc trên desktop): “Có thể đổi sau. Nội dung hồ sơ giữ nguyên.” |
| **Không phải** | Theme builder, kéo-thả section, upload CSS, dark mode riêng |

### 5.4 Farm Health — `Web / BreederFarmHealth` **[NEW · metrics mixed]**

| | |
|--|--|
| **Mục đích** | Owner xem uy tín trại: **effective trust**, cấp, tín hiệu, **vi phạm đã xác nhận**, (tương lai) deals / stake |
| **Audience** | **Chỉ owner** — route account; không index SEO full dashboard |
| **Desktop** | ScoreHero rộng; **metric tiles** hàng 4–6 cột; checklist 2 cột; vùng **charts-friendly** (placeholder card “Biểu đồ — sắp có” — **OUT OF SCOPE** data chart thật, chỉ reserve layout) |
| **Hierarchy** | Giống mobile: ScoreHero (effective trust) → Snapshot → **Violations / penalty** → Signal checklist → Deals “Sắp có” → Improve → Stake CTA disabled → disclaimer |
| **CTA** | Cải thiện điểm → anchor profile edit; Xem tin đăng; Nội quy Marketplace |

### 5.5 Breeder profile edit / registration — `Web / BreederProfile` **[SHIPPED · polish]**

| | |
|--|--|
| **Mục đích** | Đăng ký / cập nhật gửi admin xác minh |
| **Layout web** | Form max-width ~720px centered hoặc 2-col (form + tips panel); verification banner sticky top |
| **Sections** | Thông tin đăng ký (tên, khu vực, phone, FB, Zalo); Loại hình; Đăng ký trại (nếu `registered_kennel`); Quy mô & loài; Checklist chăm sóc; Cam kết minh bạch |
| **Thêm** | Entry **Giao diện trang trại**; entry **Sức khỏe trại**; chip verification rõ |
| **Mai** | Optional banner nhẹ trên form owner — **không** trên public farm |
| **Link** | Có thể reuse pattern từ `WEB_DESIGN_CONTEXT.md` Account · Breeder profile form |

**Verification statuses:**

| Status | VI |
|--------|-----|
| `unverified` | Chưa xác minh |
| `pending_review` | Chờ duyệt |
| `verified` | Đã xác minh |
| `rejected` | Từ chối |
| `suspended` | Tạm khóa |

---

## 6. Template system (web layout differences)

### 6.1 Template nghĩa là gì?

Một **template** = bộ **layout + hierarchy section + hero treatment** cho farm public. **Cùng ID và ý nghĩa với mobile.**

| Template quyết định | Template **không** quyết định |
|---------------------|-------------------------------|
| Hero layout (compact / media-led / kennel banner) | Dữ liệu hồ sơ |
| Thứ tự nhấn section | Trust score logic |
| Placeholder cover / gallery | Payment |
| Density | SiteHeader / Primary toàn site (trừ accent hero) |

### 6.2 Section atoms (mọi template)

1. HeroIdentity · 2. MetricStrip · 3. ActionRow / sticky CTA rail · 4. OverviewBlock · 5. TrustSignalsList · 6. StoryBlock · 7. CredentialsBlock · 8. ListingsHeader + filters · 9. ListingGrid  

### 6.3 Năm template — khác biệt layout **WEB**

| ID | Tên VI (EN) | Accent | Hero web | Desktop section nhấn | Phù hợp |
|----|-------------|--------|----------|----------------------|---------|
| **T1** | **Tối giản tin cậy** (*Trust Minimal*) | `#1E6FE8` | Hero compact full-width gradient/primary strip; storefront icon lớn; identity + MetricStrip cùng hàng trên ≥1024 | Metric + Trust teaser (cột phải) → Overview (trái) → Listings grid | Home breeder, lần đầu |
| **T2** | **Trại có ảnh bìa** (*Cover Farm*) | `#0F172A` | Cover **full-bleed trong content well** (~21:9 desktop, 16:9 tablet); overlay tên; avatar góc; **không** floating badge | Hero media → Story 2-col với Overview → Listings → Trust | Kennel có ảnh môi trường |
| **T3** | **Ưu tiên tin đăng** (*Listings First*) | `#7C3AED` | Hero 1 hàng compact (accent bar tím nhạt) | Metric mỏng → **Listings grid ngay** (3 col) → Overview/Trust accordion dưới | Breeder nhiều tin |
| **T4** | **Cứu hộ / Foster** (*Rescue Soft*) | `#059669` | Surface trắng + badge soft emerald; spacing thoáng | Story + commitments nổi (2-col) → Listings → Trust | `rescue_foster`, `rehoming` |
| **T5** | **Kennel đăng ký** (*Registered Kennel*) | `#B45309` | Banner credentials + dòng “Trại đăng ký: {name}”; có thể navy phụ cho text | Credentials → Trust → Listings; sticky rail nhấn verified + contact | `registered_kennel` |

**Default chưa chọn:** `T1`.  

**Figma:** 5 full desktop farm frames + 1 tablet + 1 mobile web cho T1 (hoặc cả 5 nếu budget); annotation “Đổi template không xóa dữ liệu”.

---

## 7. Farm Health metrics (parity mobile)

### 7.1 Mục tiêu cảm xúc

Breeder hiểu vị trí uy tín và việc cần làm — **không** xếp hạng toxic / “điểm tín dụng”.

### 7.2 Hierarchy dashboard (top → bottom)

```
[1] Header: Sức khỏe trại
[2] ScoreHero: effective trust /100 + TrustLevel + penalty note
[3] SnapshotRow: metric tiles (rộng trên desktop)
[4] Violations / penalty (SHIPPED) + Stake CTA disabled
[5] SignalChecklist: tín hiệu đạt/chưa (2 cột desktop)
[6] Deals “Sắp có”
[7] How to improve
[8] Disclaimer điểm tham khảo
[+ optional] Chart placeholder panel — layout only, OUT OF SCOPE data
```

### 7.3 Metric dictionary — SHIPPED vs DATA LATER vs OUT

Gắn badge Figma: `SHIPPED` | `DESIGN NOW / DATA LATER` | `OUT OF SCOPE MVP`

| Metric | Label VI (EN) | Nguồn | Trạng thái | Public? | Empty / zero |
|--------|---------------|-------|------------|---------|--------------|
| **Trust score** | Điểm tin cậy | `computeBreederTrust` 0–100 | **SHIPPED** | Có (số) | `0/100` + “Hồ sơ còn thiếu thông tin” |
| **Verification** | Trạng thái xác minh | `verification_status` | **SHIPPED** | Có (badge) | “Chưa xác minh” |
| **Trust signals breakdown** | Chi tiết tín hiệu | verified 30 · checklist 15 · commitments 15 · contact 15 · care env 15 · listings 10 | **SHIPPED** | Teaser / optional | Amber + 0/max |
| **Active listings** | Tin đang hiển thị | Count published | **SHIPPED** | Có | `0` + CTA tạo tin |
| **Active violations / penalty** | Vi phạm / điểm lỗi | `metadata.violations` + `penaltyPoints` (Admin uphold only) | **SHIPPED** | Không (owner only) | “Chưa có báo cáo được xác nhận” |
| **Reports received (raw open)** | Báo cáo chưa xác nhận | Report create | **Không hiện raw** — chỉ violation sau Admin | Không | — |
| **Trust level** | Cấp tin cậy | Derive score + verification | **DESIGN NOW** (UI); có thể client-side | Có (tên cấp) | Cấp thấp khi 0 |
| **Successful transactions** | Giao dịch thành công | Chưa có payment / deal tracking | **DESIGN NOW / DATA LATER** | Thường không | “Chưa ghi nhận — MVP chưa theo dõi giao dịch trong app” |
| **Failed / disputed transactions** | Giao dịch thất bại / tranh chấp | Future | **DESIGN NOW / DATA LATER** | Không | `—` / ẩn tới feature flag |
| **Response time** | Thời gian phản hồi | Messaging analytics | **OUT OF SCOPE MVP** | — | — |
| **Profile views** | Lượt xem trang | Analytics | **OUT OF SCOPE MVP** | — | — |

### 7.4 Trust Level (UI — product có thể chỉnh)

| Level | VI | Gợi ý |
|-------|-----|-------|
| `L0` | Mới bắt đầu | Chưa verified hoặc score < 40 |
| `L1` | Đang xây dựng | 40–69 |
| `L2` | Đáng tin cậy | Verified + 70–89 |
| `L3` | Đối tác nổi bật | Verified + ≥90 + tin active |

Chip slate→blue→emerald; **không** 5 sao review-spam.

### 7.5 ScoreHero / snapshot / empty

- Body: “Điểm này là tín hiệu tham khảo… dựa trên mức độ minh bạch hồ sơ và bài đăng.”  
- ScoreHero dùng **effective trust** (= trust − penalty, floor 0); penalty > 0 → “−N từ vi phạm đã xác nhận”  
- Hàng 1 tiles: Điểm (effective) · Cấp · Số vi phạm active · Tin đăng  
- Section **Vi phạm / điểm lỗi**: list reason + ngày + −points, hoặc empty state  
- CTA **Ký quỹ khôi phục** disabled + “Sắp có” (Phase C)  
- Hàng deals (dim + “Sắp có”): Giao dịch thành công · thất bại  
- Score 0 → slate + checklist, **không** đỏ danger  
- Pending → banner amber; Rejected/suspended → banner đỏ nhẹ  

### 7.6 Trust score formula (không invent)

Tổng max **100**:

| Signal | Max | Điều kiện tóm tắt |
|--------|-----|-------------------|
| `verified` | 30 | `verification_status === 'verified'` |
| `careChecklist` | 15 | ≥3 mục (~3 điểm/mục) |
| `commitments` | 15 | ≥2 cam kết |
| `contact` | 15 | phone / zalo / facebook |
| `careEnvironment` | 15 | `care_environment` hoặc `bio` |
| `activeListings` | 10 | 2 điểm/tin, max 10 |

---

## 8. Component list cho Figma (web)

Page **Components / Breeder (Web)**.

### 8.1 Chrome & nav

- `SiteHeader` — Logo Pet Marketplace, Browse, Breeders, Search, Messages, Notifications, Account, LanguageToggle  
- `MarketplaceDisclaimerBanner`  
- `WebBreadcrumb` — Breeders / {Farm name}  
- `FilterSidebar` / `StickyFilterBar`  
- `SearchBar` / `FilterChips` / `SortDropdown`  
- `FeedTabs` — Tin mới | Tin tức | Breeders  

### 8.2 Top Breeders

- `TopBreederCard` — default / hover / focus / skeleton  
- `RankBadge`  
- `VerifiedBadge`  
- `MetricMiniCell`  
- `TopBreedersEmpty` / `FilteredEmpty`  
- `BreedersGrid` — 1 / 2 / 3 col variants  

### 8.3 Public farm

- `BreederHero` — **T1…T5** (web widths)  
- `MetricStrip`  
- `StickyCtaRail` — desktop  
- `StickyCtaBar` — mobile web  
- `OverviewInfoRow` / `TrustSignalRow`  
- `StoryBlock` / `CredentialsBlock`  
- `ListingCard` (reuse marketplace)  
- `ReportModal` / `HideConfirmDialog`  
- `FarmOgPreview` — share card  

### 8.4 Template picker

- `TemplatePreviewCard` — selected / unselected / large preview  
- `TemplateCompareSplit` (optional)  
- `TemplateApplyBar` / panel  
- `TemplateConfirmModal`  

### 8.5 Farm Health

- `FarmHealthScoreHero`  
- `TrustLevelChip` — L0…L3  
- `FarmHealthSnapshotTile` — value / zero / coming-soon  
- `TrustSignalChecklist`  
- `ImproveTaskRow`  
- `FarmHealthDisclaimer`  
- `ChartPlaceholderPanel` — annotated OUT OF SCOPE data  

### 8.6 Profile edit

- `VerificationStatusBanner`  
- `FormSectionCard`  
- `ChipSelect` / `CheckboxCommitment`  
- `PrimarySubmitButton`  
- `GoToTemplatePicker` / `GoToFarmHealth` entry rows  
- `AppDownloadBanner` — cross-sell Pet Care (account / footer)  

**Không build trên web:** PetCard, SeverityCard, MaiModal (core), HealthCheckUpload, bottom tab bar, Expo chrome.

---

## 9. Copy tone VI / EN

### 9.1 Tone

Ấm, rõ, thực tế. Tôn trọng Sen lo lừa đảo; tôn trọng Breeder xây uy tín. Không phóng đại. Song ngữ VI/EN trên marketing + UI chính.

### 9.2 Microcopy

| Context | VI | EN |
|---------|----|-----|
| Nav / tab | Breeders | Breeders |
| CTA card | Xem hồ sơ trại | View farm profile |
| Detail | Hồ sơ trại | Farm profile / Breeder detail |
| Trust | Điểm tin cậy | Trust score |
| Dashboard | Sức khỏe trại | Farm Health |
| Template | Chọn giao diện trang trại | Choose farm template |
| Apply | Áp dụng template | Apply template |
| Reports zero | Chưa có báo cáo | No reports |
| Tx coming soon | Chưa theo dõi giao dịch trong app | Transactions not tracked yet |
| Improve | Cải thiện điểm | Improve score |
| App cross-sell | Tải app Pet Health Care | Get Pet Health Care app |

### 9.3 Sample content

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
template: T1
```

### 9.4 Loại hình breeder (parity)

| Key | VI |
|-----|-----|
| `registered_kennel` | Trại đăng ký chính thức |
| `home_breeder` | Hộ gia đình nuôi sinh sản nhỏ |
| `rescue_foster` | Cứu hộ / foster |
| `rehoming` | Cá nhân tìm nhà mới cho bé |
| `other` | Khác |

---

## 10. Responsive & a11y constraints

### 10.1 Breakpoints

| BP | Layout Breeder |
|----|----------------|
| **≤640** | 1 cột; chips filter; sticky bottom CTA trên detail; template list dọc |
| **768** | Grid 2 cột Top Breeders; filter drawer; farm overview stack hoặc 2-col hẹp |
| **≥1024** | Sidebar filter; grid 2–3 cột; farm 2-col + sticky CTA rail |
| **≥1280** | Max content ~1200–1280; spacing thoáng; template compare optional |

### 10.2 Interaction & a11y

| Chủ đề | Spec |
|--------|------|
| Hover | Card elevation / border Primary nhẹ — không glow neon |
| Focus | Focus ring rõ (`#2563EB` / outline 2px) trên CTA, chips, cards clickable |
| Keyboard | Tab order: Search → Filters → Grid → CTA; Escape đóng modal |
| Hit target | Min ~44×44 trên mobile web; desktop link/button padding đủ |
| Contrast | Text trên hero T2 overlay ≥ WCAG AA; T3/T5 accent không giảm contrast body text |
| Motion | 2–3 motion có chủ đích (hero fade, sticky rail appear, template select) — giảm motion nếu `prefers-reduced-motion` |
| SEO | `h1` = tên trại trên public; landmark `main` / `nav` |
| Lang | `lang="vi"` / toggle EN cập nhật copy |

### 10.3 Performance (design-aware)

- Skeleton grid thay full-page spinner  
- Cover cố định aspect ratio (tránh CLS)  
- Ít shadow chồng trên grid 3 cột  

---

## 11. Annotation tags

Dùng nhất quán trên mọi frame:

| Tag | Nghĩa |
|-----|--------|
| `SHIPPED` | Đã có trên mobile/API — web redesign layout, giữ field |
| `NEW` | Chưa có UI web (Template picker, Farm Health layout web, sticky rail, OG farm, listing evidence upload web) |
| `DESIGN NOW / DATA LATER` | Vẽ UI + empty/coming-soon; deals/stake/PetCoin chưa ship |
| `OUT OF SCOPE MVP` | Không vẽ sâu (charts thật, payment, response time, profile views) |

---

## 12. Out of scope

| Không vẽ | Lý do |
|----------|--------|
| Pet Care Home, health check, results, core care, vet summary, breed recognition | Mobile Pet Care only |
| Mai onboarding / Mai trên public farm | Marketplace sạch |
| Native app chrome, bottom tabs, Expo safe-area | Brief này = **web** |
| Admin review console | Brief riêng: [`WEB_ADMIN_DESIGN_CONTEXT.md`](./WEB_ADMIN_DESIGN_CONTEXT.md) |
| In-app payment, checkout, escrow, ví, nạp PetCoin qua PSP | Phase A+ Economy — không MVP Breeder |
| Theme builder / upload font | Preset T1–T5 only |
| Leaderboard gamification nặng | Top Breeders = browse, không đấu hạng |
| Analytics charts phức tạp (views over time) | OUT — chỉ placeholder layout nếu cần |
| Dark mode riêng farm page | Theo system sau |
| Mobile RN frames 390-only như app | Đã có brief mobile riêng |

---

## 13. Deliverables Figma checklist

- [ ] Cover + scope note: **Web Marketplace — Breeder surfaces only**  
- [ ] Foundations: tokens Inter / `#1E6FE8` / emerald / amber / template accents  
- [ ] Components (mục 8)  
- [ ] Top Breeders: 1280 + 768 + 390  
- [ ] Farm detail: **5 templates** desktop; ít nhất T1 trên 768 + 390  
- [ ] Template picker (large preview ± compare)  
- [ ] Farm Health owner dashboard (effective trust + violations + coming-soon deals/stake)  
- [ ] Create listing: vaccine evidence gate (web form)  
- [ ] Top Breeders: Quality Index order (không postCount-only)  
- [ ] Profile edit polish + entries Template / Farm Health  
- [ ] OG / share preview farm URL  
- [ ] Flows S1, B1, B2, V1  
- [ ] Annotation `SHIPPED` / `NEW` / `DATA LATER`  
- [ ] Disclaimer trên browse + detail  
- [ ] App download CTA (footer / account) — Pet Health Care  
- [ ] VI copy trên frame; EN component/screen names  
- [ ] a11y: focus, hover, keyboard notes trên prototype  

---

## 14. Mapping to mobile brief (parity)

| Surface | Mobile brief | Web brief (file này) | Parity data |
|---------|--------------|----------------------|-------------|
| Top Breeders | List 1 cột tab Breeders | Grid 2–3 col + sidebar/sticky filters | Cùng fields card |
| Farm public | `BreederDetail` T1–T5 | Wider hero, 2-col, sticky CTA rail | Cùng sections & template IDs |
| Template picker | Vertical / 2-col mobile | Large preview ± side-by-side | Cùng T1–T5 |
| Farm Health | Owner dashboard | Wider tiles + chart placeholder | Cùng metric dictionary |
| Profile edit | `BreederProfile` | Form web + tips panel | Cùng verification & fields |
| Trust formula | Phụ lục A mobile | Mục 7.6 | **Identical** |
| Share | Chủ yếu post deep link | + **farm public URL / OG** | Listing share giữ; farm thêm |

**Giữ parity:** mọi field name, trust max points, breeder type keys, verification statuses, disclaimer tinh thần.  
**Không lệch:** invent payment, đổi công thức trust, thêm template ngoài T1–T5 mà không PO.

---

## 15. PO decisions still open

Cùng 4 câu với index / mobile — **chốt trước khi khóa Figma**:

1. **Message** trên farm detail hay chỉ qua listing?  
2. **Deal success/fail:** tạm empty state hay chờ nguồn data sau?  
3. **Trust** và **Farm Health:** một điểm duy nhất hay hai hệ điểm?  
4. **Template** ảnh hưởng cả Top Breeders card hay **chỉ** trang detail?

---

## 16. States & edge cases (checklist)

- [ ] Top Breeders: skeleton, empty, filtered empty, error  
- [ ] Detail: own vs other; unverified không vào Top nhưng mở từ URL trực tiếp? (annotate)  
- [ ] Template: default T1; selecting; just applied  
- [ ] Farm Health: score 0; pending; high score; **violations empty vs active**; stake/deals coming soon  
- [ ] Profile: validation; success; rejected banner  
- [ ] Long name; missing avatar/cover; missing bio  
- [ ] Hover/focus/keyboard trên grid & sticky rail  
- [ ] OG preview thiếu ảnh → placeholder  

---

## 17. Checklist trước handoff engineering

- [ ] Breakpoints annotated trên mọi màn chính  
- [ ] Template chỉ đổi layout, không đổi data model  
- [ ] Farm Health ghi rõ SHIPPED vs DATA LATER  
- [ ] Disclaimer / trust body không claim bảo lãnh giao dịch  
- [ ] Không có màn thanh toán / checkout  
- [ ] Sticky CTA + focus rings documented  
- [ ] Farm URL / OG annotated nếu PO đã chốt path  
- [ ] Spacing gần hệ web hiện tại (24/32/40 padding, `rounded-xl`)  

---

*Brief web Breeder surfaces — Pet Marketplace (`pet-marketplace.org`). Parity với `MOBILE_BREEDER_DESIGN_CONTEXT.md`. Cập nhật mục 7.3 khi product chốt data reports / transactions.*

---

# PART B — Admin console (Web)

**Đối tượng:** Designer Figma (handoff từ Product Owner)  
**Nền tảng:** Responsive **web** trên **pet-marketplace.org** (desktop-first ops console; tablet; mobile web ≤640)  
**Phạm vi:** Chỉ **Admin marketplace** — duyệt breeder / tin / báo cáo / users / feature flags / tin tức admin. **Không** thiết kế Pet Care AI admin, Mai, health check.  
**Ngôn ngữ UI:** **Tiếng Việt ưu tiên**; song ngữ VI/EN trên frame (component / screen / a11y)  
**Ngày brief:** 2026-08-02  
**Trạng thái:** Design context — Cursor **không** thay designer; document này là input cho Figma  
**Parity data:** Cùng API/actions với admin mobile (`AccountScreen` admin sections, `AdminHubScreen`, `AdminReviewScreen`, `AdminFeaturesScreen`, `CreateAdminPostScreen`)  
**Liên quan:** [`WEB_DESIGN_CONTEXT.md`](./WEB_DESIGN_CONTEXT.md) · [`WEB_BREEDER_DESIGN_CONTEXT.md`](./WEB_BREEDER_DESIGN_CONTEXT.md) · [`BREEDER_COMPETITION_ECONOMY_DESIGN_CONTEXT.md`](./BREEDER_COMPETITION_ECONOMY_DESIGN_CONTEXT.md)

---

## 0. Ghi chú nhanh cho designer

| Mục | Hướng dẫn |
|-----|-----------|
| Scope note đầu file Figma | **Web Marketplace — Admin console only** |
| Frames bắt buộc | **1280** (desktop ops), **768**, **390** — ưu tiên **desktop split layout** |
| Visual family | Inter, Primary `#1E6FE8`, nền `#F2F4F8`, card trắng; verified emerald; pending amber; danger / violation red |
| Tone UI | **Ops denser** hơn Sen/Breeder storefront — bảng, queue, filter, confirm modal — vẫn sạch, không dashboard analytics nặng |
| Brand | **Pet Marketplace Admin** — không medkit; không Mai |
| Thanh toán | **Không** PSP / PetCoin / escrow dispute tooling trong Phase Now |
| Chrome | SiteHeader + **left sidebar ops** (desktop) hoặc top tabs (tablet/mobile) — không bottom tab app |

**Code / product reference:**

| Path | Nội dung |
|------|----------|
| `AccountScreen.tsx` | Admin home: metrics + Requests / Breeders / Listings |
| `AdminHubScreen.tsx` | Users + Moderation tabs |
| `AdminReviewScreen.tsx` | Full review console (accounts, breeders, posts, reports) |
| `AdminUserDetailScreen.tsx` | Role / pets / act-as |
| `AdminFeaturesScreen.tsx` | Feature flags (pet feed tabs…) |
| `CreateAdminPostScreen.tsx` | Đăng tin tức / announcement |
| `AdminHealthEvidencePreview.tsx` | Strip ảnh bằng chứng vaccine |
| `utils/adminModerationDisplay.ts` | Reason label, target subtitle, penalty badge |
| `utils/adminConfirmModeration.ts` | Confirm trước uphold / suspend |

---

## 1. Mục đích / audience

### 1.1 Brief này để làm gì?

Cung cấp **context Figma cho WEB Admin console** của Pet Marketplace: queue duyệt, bằng chứng vaccine, xác nhận vi phạm → Farm Health penalty, quản lý user, feature flags, tạo news — trong chrome web (sidebar, bảng, modal), không copy pixel mobile.

### 1.2 Ai dùng

| Vai trò | Cách dùng |
|---------|-----------|
| **Designer Figma** | Artboard ops + annotation `SHIPPED` / `NEW` / `DATA LATER` |
| **PO / PM** | Scope Phase Now vs A+; PO questions |
| **FE web** | Mapping route + component; không invent metric |

### 1.3 Parity với mobile admin

- **Cùng:** actions (verify / reject / suspend / approve / archive / uphold / dismiss), confirm modal, health evidence, penalty badge, copy VI cốt lõi  
- **Khác:** desktop sidebar + multi-column queues; denser tables; keyboard shortcuts note; không Expo safe-area  

---

## 2. Product & roles

### 2.1 One-liner

**Admin** duy trì **minh bạch & an toàn** marketplace: xác minh trại, duyệt tin (kèm bằng chứng vaccine), xử lý báo cáo (chỉ trừ điểm khi **xác nhận vi phạm**), hỗ trợ user.

### 2.2 Role

| Role | Trên web Admin |
|------|----------------|
| **Admin** | Full console |
| Sen / Breeder / Visitor | Chỉ là **đối tượng** trong queue — không vào console |
| Vet | Out of scope |

---

## 3. Visual + tokens

| Token | Value |
|-------|--------|
| Primary | `#1E6FE8` |
| Success / verify | Emerald |
| Warning / pending | Amber |
| Danger / violation / suspend | Red |
| Surface | `#F2F4F8` + white cards `rounded-xl` |
| Density | Padding/card nhỏ hơn storefront; font 13–14px body ops |

Tránh purple-default, cream+serif terracotta, neon dark.

---

## 4. Information architecture (web)

```
/app/admin                     → Admin home (metrics + queues)     [SHIPPED mobile → WEB NEW]
/app/admin/requests            → Unified queue (filter)            [WEB NEW layout]
/app/admin/breeders            → Breeder directory + penalty       [WEB NEW]
/app/admin/listings            → Listing moderation + evidence     [WEB NEW]
/app/admin/reports             → Open reports only (actions)       [WEB NEW]
/app/admin/users               → Search / create / open user       [from Hub]
/app/admin/users/:id           → User detail (role, pets, act-as)
/app/admin/features            → Feature flags
/app/admin/news/new            → Create announcement
/app/admin/review              → Optional full console (= AdminReview)
```

**Desktop (≥1024):** Left nav (Queues · Breeders · Listings · Reports · Users · Features · News) + main content.  
**Tablet / mobile web:** Top segmented control hoặc hamburger; 1-column cards (gần mobile Account admin).

---

## 5. Screen inventory

### 5.1 Admin home — `Web / AdminHome` **[SHIPPED data · WEB layout NEW]**

| | |
|--|--|
| **Mục đích** | Điểm vào ops: số việc chờ + nhảy queue |
| **Metrics** | Requests chờ · Breeders active · Listings chờ duyệt |
| **CTA** | Tạo tin tức · Mở Users hub · Mở Full review |
| **Desktop** | Metric row 3 cột + “Việc cần làm hôm nay” (top 5 open items) |

### 5.2 Unified request queue — `Web / AdminRequests` **[SHIPPED]**

| | |
|--|--|
| **Types** | Breeder · Listing · Report |
| **Filters** | Type / Status (waiting · approved · rejected · resolved) / Date |
| **Card** | Type chip · status · date · title · subtitle · body · actions |
| **Breeder actions** | Verify · Reject · Suspend (**confirm** suspend) + **penalty badge** nếu có |
| **Listing actions** | Approve · Archive + **HealthEvidencePreview** |
| **Report actions** | Chỉ khi `open`: Confirm violation (**confirm modal**) · Dismiss · (optional) Archive listing / Suspend breeder |
| **Resolved reports** | Chỉ status text — **không** action lại |

### 5.3 Listing review + vaccine evidence — `Web / AdminListingReview`

| | |
|--|--|
| **Mục đích** | Duyệt tin `pending_review` có kiểm tra độ chính xác vaccine |
| **Evidence strip** | Amber panel: vaccine status + thumbnails `health_evidence_urls` |
| **Nếu thiếu evidence** khi tin khai đã tiêm | Highlight danger + không khuyến khích Approve (backend đã reject; UI cảnh báo) |
| **Desktop** | 2 cột: media/evidence trái · metadata + actions phải |

### 5.4 Breeder directory — `Web / AdminBreeders`

| | |
|--|--|
| **Filters** | Status (active / inactive / waiting) · Species · Date |
| **Card** | Verification chip · species · **penalty badge** (−N pts · M violations) · location · application summary |
| **Actions** | Verify / Reject / Suspend (confirm) |

### 5.5 Reports — `Web / AdminReports`

| | |
|--|--|
| **Default** | Chỉ **open** |
| **Card** | Reason (i18n) · target (Breeder: name / Listing: title) · note · Confirm violation · Dismiss |
| **Confirm violation modal** | Title “Xác nhận vi phạm?” · body giải thích trừ điểm Farm Health · CTA primary danger |
| **Success toast** | “Đã xác nhận vi phạm. Điểm trừ đã ghi vào Farm Health…” |

### 5.6 Users hub — `Web / AdminUsers` + detail

| | |
|--|--|
| Create account (role sen/breeder/admin) | |
| Search | |
| User detail | Change role · pets list · Add pet · **Act as user** |
| **Note** | Act-as chủ yếu hỗ trợ Pet Care mobile — trên web annotate “optional / support” |

### 5.7 Feature flags — `Web / AdminFeatures`

| | |
|--|--|
| Toggles marketplace / pet feed tabs | |
| Mobile-only flags | Annotate **không** áp dụng product web (nếu có) |

### 5.8 Create news — `Web / AdminCreateNews`

| | |
|--|--|
| Categories, photos/video, CTA, preview | Parity `CreateAdminPostScreen` |
| Sau publish | Xuất hiện tab News Pet Feed |

### 5.9 Full review console — `Web / AdminReview` (optional)

Gộp accounts + breeders theo status + pending posts + open reports — mirror `AdminReviewScreen`. Có thể là “advanced” entry từ home.

---

## 6. Moderation model (Phase Now)

```
Report create (Sen)     → status open          → Farm Health KHÔNG đổi
Admin Dismiss           → dismissed            → không penalty
Admin Confirm violation → reviewed + append
  metadata.violations[] + penaltyPoints (+10 flat Now)
                        → Farm Health owner thấy effective trust ↓
```

| Quy tắc | |
|---------|--|
| Không auto-penalty khi tạo report | Bắt buộc |
| Idempotent theo `reportId` | Bắt buộc |
| Post report → resolve owner breeder qua listing | Backend đã có |
| Confirm modal trước uphold / suspend | Bắt buộc UX |
| Clear violation / stake restore | **Phase C** — OUT Now |

---

## 7. Phase annotations

| Phase | Admin web |
|-------|-----------|
| **Now** | Queues, evidence strip, penalty badge, confirm violation, verify/approve |
| **Later A** | PetCoin ledger view, Boost sponsorship tools (sau PSP) |
| **Later B** | Escrow dispute console |
| **Later C** | Clear / stake remediation admin tools |
| **Perf** | Pagination / status filters API (thay full catalog) |

---

## 8. Component list (Figma)

- `AdminSidebar` / `AdminTopTabs`
- `AdminMetricChip`
- `AdminQueueCard` (breeder / listing / report variants)
- `AdminHealthEvidenceStrip`
- `AdminPenaltyBadge`
- `AdminConfirmModal` (violation / suspend)
- `AdminFilterBar`
- `AdminUserRow`
- `AdminFeatureToggle`
- `AdminToast`

---

## 9. Copy VI / EN (cốt lõi)

| Key ý | VI | EN |
|-------|----|----|
| Confirm violation | Xác nhận vi phạm (trừ điểm) | Confirm violation (−points) |
| Dismiss | Bỏ qua | Dismiss |
| Confirm title | Xác nhận vi phạm? | Confirm violation? |
| Confirm body | Trừ điểm tin cậy trên Farm Health… | Adds trust penalty on Farm Health… |
| Suspend confirm | Tạm khóa breeder này? | Suspend this breeder? |
| Penalty badge | −{{points}} điểm · {{count}} vi phạm | −{{points}} pts · {{count}} violation(s) |
| Health evidence | Bằng chứng vaccine | Vaccine evidence |
| Empty reports | Chưa có báo cáo mở | No open reports |
| Listings tab | Tin đăng | Listings |

Reuse i18n: `adminReview.*`, `adminHub.*`, `adminRequests.*`, `adminBreeders.*`.

---

## 10. Responsive & a11y

| Breakpoint | |
|------------|--|
| 1280 | Sidebar + 2-col review |
| 768 | Collapsed nav + card stack |
| 390 | Mobile-like cards; sticky action bar |

- Focus ring Primary; confirm destructive không one-tap  
- Keyboard: Esc đóng modal; Enter không auto-confirm danger  
- Loading / busy disable double-submit  

---

## 11. Annotation tags

| Tag | Nghĩa |
|-----|--------|
| `SHIPPED` | Đã có mobile/API — web redesign layout |
| `NEW` | Layout web chưa có (sidebar ops, table density) |
| `DESIGN NOW / DATA LATER` | Empty/coming-soon (PetCoin ops, charts) |
| `OUT OF SCOPE MVP` | PSP UI, escrow dispute, severity bands, analytics nặng |

---

## 12. Out of scope

| Không vẽ | Lý do |
|----------|--------|
| Nạp PetCoin / chọn PSP / bank transfer UI | Phase A + legal |
| Escrow / dispute tooling | Phase B |
| Clear penalty / stake admin | Phase C |
| Severity color matrix 10–80 | Flat +10 Now |
| Pet Care AI admin / Mai | Mobile Pet Care |
| Gamification leaderboard admin | Không |

---

## 13. Deliverables Figma checklist

- [ ] Cover: **Web Marketplace — Admin console only**  
- [ ] Foundations + danger/amber ops tokens  
- [ ] Components (mục 8)  
- [ ] Admin home 1280 + 768 + 390  
- [ ] Requests queue + filters  
- [ ] Listing review + health evidence (2-col desktop)  
- [ ] Breeders directory + penalty badge  
- [ ] Reports + **confirm violation modal**  
- [ ] Users + user detail  
- [ ] Features + Create news  
- [ ] Annotation SHIPPED / NEW / DATA LATER  
- [ ] VI copy trên frame  

---

## 14. Mapping mobile → web

| Mobile | Web |
|--------|-----|
| Account admin metrics + sections | AdminHome + sidebar routes |
| AdminHub Users/Moderation | `/admin/users`, queues |
| AdminReview (full) | `/admin/review` optional |
| AdminFeatures | `/admin/features` |
| CreateAdminPost | `/admin/news/new` |
| Confirm Alert | ConfirmModal desktop |

---

## 15. PO decisions still open

1. Admin web **bắt buộc Phase 1** hay giữ ops trên mobile trước?  
2. Act-as user có trên web không?  
3. Severity penalty bands bao giờ thay flat +10?  
4. Announcement edit/archive trên web (API đã có, UI chưa)?  
5. Khi nào gắn PetCoin admin tools (sau chọn PSP)?  

---

## 16. States & edge cases

- [ ] Empty queues / filtered empty / load error + retry  
- [ ] Double-click uphold (idempotent — UI busy)  
- [ ] Report thiếu post title / breeder name (fallback ID)  
- [ ] Listing vaccinated + 0 evidence (warn)  
- [ ] Breeder penalty 0 vs >0  
- [ ] Suspended / rejected banners  

---

## 17. Checklist trước handoff engineering

- [ ] Routes khớp mục 4  
- [ ] Confirm modal bắt buộc cho violation + suspend  
- [ ] Health evidence strip field = `metadata.health_evidence_urls`  
- [ ] Penalty từ `metadata.penaltyPoints` / `violations`  
- [ ] Không invent PetCoin admin trong PR Phase Now  
- [ ] Cross-link Farm Health owner brief (WEB_BREEDER §0.1 / §7)
