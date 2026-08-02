# Pet Marketplace — Web Design Context (Figma Brief)

> Brief thiết kế **web only** trên **pet-marketplace.org**.  
> **Phạm vi web: Pet Marketplace.** Pet Care (sức khỏe, AI, vaccine, Mai…) **chỉ trên mobile app** — web không build các flow đó.  
> Cập nhật: tháng 7/2026.

---

## 0. Phạm vi platform (quan trọng)

| Platform | Domain / App | Phạm vi |
|----------|--------------|---------|
| **Web** | pet-marketplace.org | **Pet Marketplace** — browse tin, breeder, DM, comment, đăng tin, legal, landing SEO |
| **Mobile app** | Pet Health Care (iOS/Android) | **Pet Care** — hồ sơ pet, AI health check, vaccine, Mai, breed recognition, vet summary **+** Pet Feed tab |

### Web — IN scope

- Marketing landing (marketplace-first)
- Pet Feed: list, search, filter, detail, share landing
- Breeder profiles
- Auth (login/signup) cho marketplace actions
- Messages, notifications (marketplace)
- Create/edit listing (breeder)
- Account: saved posts, my listings, breeder profile, settings
- Legal pages + marketplace guidelines
- CTA **“Tải app Pet Care”** cho tính năng sức khỏe

### Web — OUT of scope (mobile only)

- My Pets / Home
- Pet profile, add/edit pet
- AI wellness screening / health check / results / history
- Core care / vaccines & reminders
- Vet summary
- Breed recognition
- Mai onboarding & vaccination modals
- AI credits UI

> Thiết kế Figma **không cần** vẽ các màn hình OUT of scope cho web. Chỉ cần **CTA cross-sell** trỏ về app khi phù hợp (footer, landing, post-login banner nhẹ).

---

## 1. Tóm tắt sản phẩm (web)

| Mục | Nội dung |
|-----|----------|
| **Tên web / brand surface** | **Pet Marketplace** (domain: pet-marketplace.org) |
| **App mobile liên quan** | Pet Health Care (*PetCare* on store) — nơi có Pet Care |
| **One-liner web** | Marketplace thú cưng có cấu trúc — tìm tin breeder, so sánh thông tin, liên hệ an toàn. **Không xử lý thanh toán.** |
| **Backend API** | https://pet-health-backend-serb.onrender.com (shared với app) |
| **Đối tượng web** | Sen tìm mua/nuôi thú; breeder đăng tin; visitor từ link share Zalo/FB |
| **Ngôn ngữ** | Song ngữ **Tiếng Việt + English** |

### Value prop web (3 điểm cho landing)

1. **Tin có cấu trúc** — giống, tuổi, vaccine, giá, khu vực rõ ràng hơn post FB rải rác  
2. **Breeder đã xác minh** — profile, trust signals, lịch sử tin  
3. **Liên hệ trong app** — DM + comment; disclaimer marketplace rõ

### Cross-sell mobile (Pet Care)

Landing/footer/banner: *“Cần theo dõi sức khỏe thú cưng? Tải app Pet Health Care — AI sàng lọc sơ bộ, nhắc vaccine, nhật ký sức khỏe.”*

---

## 2. Brand & giọng điệu (web marketplace)

### Personality

- Ấm áp, đáng tin, thực tế — giúp sen **tìm và so sánh** tin an toàn  
- Không hype giá/bảo đảm sức khỏe thú  
- Song ngữ VI/EN

### Từ nên dùng (web)

`tin đăng`, `breeder`, `xác minh`, `liên hệ`, `so sánh`, `khu vực`, `giống`, `cam kết`, `marketplace guidelines`

### Từ tránh (web)

`mua ngay trên web`, `bảo đảm sức khỏe`, `chẩn đoán`, `thanh toán an toàn` (app không xử lý payment)

### Disclaimer marketplace (bắt buộc trên feed, detail, form đăng tin)

**VI:** Tin đăng do người dùng đăng. Pet Health Care không phải bên bán, không xử lý thanh toán và không bảo lãnh sức khỏe thú, thông tin hay giao dịch. Hãy kiểm tra trực tiếp và đọc Nội quy Marketplace trước khi quyết định.

**EN:** Listings are posted by users. Pet Health Care is not the seller, does not process payments, and does not guarantee pets, health claims, or transactions. Verify in person and read our Marketplace Guidelines before deciding.

### Mai & Pet Care branding

- **Mai không xuất hiện** trong core web marketplace UX  
- Có thể nhắc nhẹ trên landing hoặc footer như cross-sell app Pet Care  
- Header web dùng identity **Pet Marketplace**, không dùng medkit icon (mobile Home dùng medkit)

---

## 3. Hệ thống thị giác (Design tokens)

Giữ visual family với app (Inter + blue) nhưng web marketplace **không cần** severity colors (low/med/high) — đó là mobile Pet Care.

### Typography

| Token | Font | Weight |
|-------|------|--------|
| Body | **Inter** | 400 |
| Medium | Inter | 500 |
| Semibold | Inter | 600 |
| Bold | Inter | 700 |

### Màu chính (web)

| Token | Hex | Dùng cho |
|-------|-----|----------|
| **Primary / Header** | `#1E6FE8` | Header, CTA chính |
| **Primary alt** | `#2563EB` | Link, tab active, focus |
| **Primary dark** | `#1D4ED8` | Hover |
| **Background** | `#F2F4F8` | Page background |
| **Surface** | `#FFFFFF` | Cards, modals |
| **Text primary** | `#0F172A` | Headings |
| **Text secondary** | `#64748B` | Meta, captions |
| **Disclaimer** | `amber-50` / `amber-200` border | Marketplace legal banner |
| **Badge unread** | `#EF4444` | Messages, notifications |
| **Verified badge** | `emerald-600` hoặc blue | Breeder verified |

### Shape & spacing

- Card: `rounded-xl` (12px)  
- Button pill: `rounded-full`  
- Content max-width desktop: **~1200px** (marketplace grid)  
- Padding ngang: 20–24px mobile, 32–40px desktop  

### Icon set

- Reference app: Ionicons + Feather  
- Web: Lucide / Heroicons tương đương  
- Marketplace header icon: **home** hoặc **storefront** (không medkit)

---

## 4. Kiến trúc thông tin — Web only

```
pet-marketplace.org
├── /                              → Landing (marketplace + CTA app Pet Care)
├── /privacy-policy/
├── /terms-of-service/
├── /marketplace-guidelines/
├── /support/
└── /app/                          → Marketplace web app
    ├── /                          → redirect → /app/pet-feed
    ├── /pet-feed                  → Browse (tabs: New Pets | News | Breeders)
    │   └── /posts/:id             → Listing detail + comments
    ├── /breeders/:id              → Breeder profile + listings
    ├── /messages                  → Inbox DM
    ├── /messages/:conversationId  → Thread (desktop: split view)
    ├── /notifications
    ├── /account                   → Profile, saved, my listings, settings
    ├── /account/listings/new      → Create listing (breeder)
    ├── /account/listings/:id/edit
    ├── /account/breeder-profile
    ├── /login
    ├── /signup
    └── /forgot-password
```

**Deep link / share URL (đã có):**  
`https://pet-marketplace.org/app/pet-feed/posts/{postId}/`

**Không có route web:** `/home`, `/pets/*`, `/health-check`, `/core-care`, `/vet-summary`, `/breed-recognition`

---

## 5. Vai trò người dùng (web)

| Role | Quyền trên web |
|------|----------------|
| **Visitor** | Xem landing, legal; browse feed read-only (optional); xem post detail share link |
| **sen** (logged in) | Browse, search, save, comment, DM breeder, report |
| **breeder** | + Breeder profile, create/edit/submit listings, reply DM |
| **admin** | Phase sau: review queue web console (optional) |

Pet profiles / health check: **không có trên web** — user dùng mobile app.

---

## 6. Màn hình web (Screen inventory)

Chỉ liệt kê màn cần vẽ Figma cho web.

### 6.1 Public

| Screen | Mục đích | UI chính |
|--------|----------|----------|
| **Landing `/`** | SEO + conversion | Hero marketplace, search teaser, featured listings, value props, breeder CTA, **Download Pet Care app**, footer legal |
| **Legal pages** | Compliance | Privacy, Terms, Marketplace Guidelines, Support |
| **Share landing** | Link từ Zalo/FB | OG preview, listing summary, CTA mở app / xem full trên web |

### 6.2 Auth

| Screen | UI chính |
|--------|----------|
| **Login** | Email/password, forgot, sign up link, language toggle, terms links |
| **Sign up + OTP** | Email, password, display name, 8-digit OTP |
| **Forgot password** | OTP flow |

> Login web có thể dùng layout split (hero marketplace imagery + form), không cần full-screen medkit như mobile.

### 6.3 Marketplace core

| Screen | Header title | UI chính |
|--------|--------------|----------|
| **Pet Feed** | **Pet Marketplace** | Disclaimer banner; search; filter chips (species, province, gender, video); sort; tabs **New Pets \| News \| Breeders**; post grid/list |
| **Listing detail** | Listing details | Media gallery; title, price, meta; health info fields (do breeder điền); personality tags; message + external contact; comments; save/share/report |
| **Breeder profile** | Breeder profile | Avatar, bio, location, verified badge, trust signals, contact, listings grid |
| **News detail** | News details | Admin announcement (health tips có thể link **tải app** thay vì tool trên web) |

### 6.4 Messaging & social

| Screen | UI chính |
|--------|----------|
| **Messages inbox** | Conversation list theo tin, unread badge |
| **Message thread** | Chat bubbles, listing context header |
| **Notifications** | Comment trên listing của mình |

### 6.5 Account (marketplace scope)

| Screen | UI chính |
|--------|----------|
| **Account hub** | Display name, role badge; stats: **Saved**, **My listings** (không hiển thị pet count trừ khi cross-sell); breeder section; legal links; logout |
| **Saved listings** | Grid posts đã favorite |
| **My listings** | Draft / pending / published / archived |
| **Create / edit listing** | Multi-step form, media upload, marketplace terms checkbox |
| **Breeder profile form** | Register / update breeder info |
| **Settings** | Change email/password, language, delete account |

### 6.6 Admin (web console)

Brief Figma: [WEB_ADMIN_DESIGN_CONTEXT.md](./WEB_ADMIN_DESIGN_CONTEXT.md). Phase Now: queues, vaccine evidence, confirm violation. PetCoin admin = Phase A+.


## 7. User flows — Web only

### Flow A — Visitor từ share link

```
Zalo/FB link → Post detail (web) → [Login] Message / Save
  → hoặc CTA "Tải app Pet Care" (footer)
```

### Flow B — Sen browse & liên hệ

```
Landing hoặc /app/pet-feed → Search/filter → Listing detail
  → Message breeder | Zalo/Phone/FB | Comment
```

### Flow C — Breeder đăng tin

```
Login → Account → Breeder profile (verify) → Create listing
  → Marketplace terms ✓ → Submit → pending_review → published
```

### Flow D — Breeder quản lý tin nhắn

```
Notifications / Messages → Open thread → Reply
```

### Flow E — Cross-sell Pet Care (web → mobile)

```
Landing footer / News post / Account banner
  → "Tải Pet Health Care" → App Store / Play Store
```

---

## 8. Data models (sample Figma content)

### Listing (Pet Feed Post)

```
title: "Mèo Anh lông ngắn xám xanh"
species: "cat"
breed: "British Shorthair"
gender: "male"
age_months: 3
location: "Quận 7, TP.HCM"
price_note: "8.500.000 ₫"
description: "Bé đã tiêm 2 mũi, khỏe mạnh..."
personality: ["Hiền", "Ham chơi"]
vaccine_status: "Đã tiêm 2 mũi FVRCP"
deworming_status: "Đã tẩy giun"
paperwork: ["Sổ tiêm"]
media_urls: [3 ảnh]
video_url: optional
status: "published"
breeder_profile: { display_name: "Cattery Miu House", verification_status: "verified" }
```

### Breeder profile

```
display_name: "Cattery Miu House"
location: "TP.HCM"
verification_status: verified
primary_species: ["cat"]
main_breeds: ["British Shorthair", "Scottish Fold"]
care_environment: "Nuôi trong nhà, vệ sinh hàng ngày"
contact: { zalo: "090...", phone: "...", facebook: "..." }
```

### Filters (VN)

- Species: cat, dog, bird, fish, mouse, cow, pig, chicken  
- Province: 63 tỉnh/thành  
- Sort: date, age, price  
- Gender: all, male, female  

---

## 9. Copy quan trọng (EN / VI)

### Web identity

| | EN | VI |
|---|----|----|
| Site / header | **Pet Marketplace** | **Pet Marketplace** |
| Mobile app (cross-sell) | Pet Health Care | Pet Health Care |
| Tagline landing | Find structured pet listings from verified breeders | Tìm tin thú cưng có cấu trúc từ breeder uy tín |

### Tabs (marketplace)

| EN | VI |
|----|-----|
| New Pets | Tin mới |
| News | Tin tức |
| Breeders | Breeder |

### CTAs (web)

| EN | VI |
|----|-----|
| Message | Nhắn tin |
| Contact | Liên hệ |
| Save listing | Lưu tin |
| Share | Chia sẻ |
| Report listing | Báo cáo tin |
| Create listing | Đăng tin |
| Download the app | Tải app |
| Get Pet Health Care app | Tải app Pet Health Care |

### Public URLs

| Page | Path |
|------|------|
| Privacy | `/privacy-policy/` |
| Terms | `/terms-of-service/` |
| Marketplace Guidelines | `/marketplace-guidelines/` |
| Support | `/support/` |

---

## 10. Component library — Web marketplace

| Component | Mô tả |
|-----------|-------|
| **SiteHeader** | Logo Pet Marketplace, nav (Browse, Breeders, Messages), login/account, lang toggle |
| **MarketplaceDisclaimerBanner** | Amber box — legal marketplace |
| **SearchBar** | Breed, breeder, location… |
| **FilterChips** | Species, province, gender, video |
| **SortDropdown** | Date / age / price |
| **FeedTabs** | New Pets \| News \| Breeders |
| **ListingCard** | Media, title, price, location, verified badge, actions |
| **ListingCardSkeleton** | Loading state |
| **ListingDetailGallery** | Photos + video |
| **CommentThread** | Nested replies |
| **MessageThread** | Chat + listing header |
| **BreederCard** | Trust score, species, listing count |
| **VerifiedBadge** | Admin verified |
| **ReportModal** | Scam, misleading health claims, abusive… |
| **MarketplaceListingTermsCheckbox** | Required on create listing |
| **AppDownloadBanner** | Cross-sell Pet Care mobile — footer/landing |
| **LanguageToggle** | VI ⟷ EN |
| **EmptyState** | No listings / no messages / no saved |
| **Pagination / Load more** | Feed infinite scroll |

**Không build trên web:** PetCard, SeverityCard, MaiModal, HealthCheckUpload, VetSummary…

---

## 11. States & edge cases

| Context | States |
|---------|--------|
| Pet Feed | skeleton, empty, empty filtered, error + retry, end of list |
| Listing detail | media loading, comments empty, own listing (edit/delete) |
| Auth | field errors, OTP expired, rate limit |
| Messages | empty inbox, empty thread, sending |
| Create listing | draft, validation errors, pending review success |
| Breeder | unverified, pending, verified, rejected |
| Share landing | app installed deep link vs web-only visitor |

---

## 12. Layout web (responsive)

### Breakpoints

| BP | Layout |
|----|--------|
| `<768px` | Single column; bottom nav hoặc hamburger: Browse, Messages, Account |
| `768–1024px` | 2-col listing grid; filter drawer |
| `>1024px` | Top nav; filter sidebar; 3-col grid; messages split view |

### Desktop patterns

- **Landing:** Full-width hero + search + featured listings carousel + 2-col value prop + app download strip  
- **Feed:** Sidebar filter (species, province) + main grid  
- **Detail:** Gallery 60% + sticky info/CTA 40%  
- **Messages:** Inbox 320px + thread flex-1  

### Navigation web (đề xuất)

```
[Logo Pet Marketplace]  Browse  Breeders  [Search…]  💬 🔔  Account
```

Không có tab "Home" / "My Pets" trên web.

---

## 13. Roadmap thiết kế web

### Phase 1 — Public + browse (MVP Figma)

- Landing `/` (marketplace-first + app download)  
- Legal pages  
- Pet Feed list + filters + tabs  
- Listing detail + share landing  
- Breeder profile (read-only)  
- Marketplace disclaimer everywhere  

### Phase 2 — Auth + engagement

- Login / signup / OTP  
- Save listing, comment  
- Messages + notifications  
- Create / edit listing (breeder)  
- Account hub (marketplace scope)  

### Phase 3 — Growth & admin (optional)

- SEO category pages (e.g. `/cats/hcm`)  
- Admin review console web — see WEB_ADMIN_DESIGN_CONTEXT.md  
- Breeder analytics dashboard  

**Không có phase Pet Care trên web.**

---

## 14. Feature flags (web-relevant only)

| Flag | Ảnh hưởng web |
|------|---------------|
| `pet_feed_listings` | Tab New Pets |
| `pet_feed_news` | Tab News |
| `pet_feed_breeders` | Tab Breeders |

Flags `health_analysis`, `breed_recognition`, `rewarded_ads`, `subscription` — **mobile only**, bỏ qua khi thiết kế web.

---

## 15. Monetization

- Web marketplace: **không payment gateway**, không escrow  
- Breeder/sen giao dịch ngoài app (Zalo, chuyển khoản, gặp trực tiếp) — disclaimer rõ  
- Pet Care monetization (AI credits, subscription): **mobile only**

---

## 16. Deep links & app store

| | Value |
|---|-------|
| Share URL | `https://pet-marketplace.org/app/pet-feed/posts/{id}/` |
| iOS App Store ID | `6778684107` |
| URL scheme | `pethealthcare://` |
| Universal Links | `pet-marketplace.org/app/pet-feed/*` |

**Share landing OG:** ảnh listing, title, price, breeder name + CTA "Xem trên web" / "Mở trong app"

---

## 17. Personas — Web scenarios

### Persona A — Sen tìm mèo (primary web)

- Click link breeder trên FB → xem detail web → nhắn tin hoặc Zalo  
- Pain: tin FB thiếu thông tin, sợ lừa đảo  

### Persona B — Breeder

- Đăng tin có cấu trúc từ laptop → duyệt → trả lời DM  
- Pain: quản lý tin rải rác nhiều kênh  

### Persona C — Visitor chưa login

- Search Google "mua mèo anh lông ngắn hcm" → landing → browse feed  

### Persona D — Sen dùng Pet Care (cross-sell)

- Đã có app mobile → share tin lên web cho bạn bè xem không cần cài app  

---

## 18. Positioning web

- **FB group / Chợ Tốt:** unstructured, không trust layer, không DM trong ecosystem  
- **Pet Marketplace web:** structured listings, verified breeder signals, in-app messaging, legal disclaimer, SEO domain  

Pet Care AI là **differentiator mobile** — web chỉ **teaser + download CTA**, không replicate.

---

## 19. Checklist Figma

- [ ] Scope note đầu file: **Web = Marketplace only**  
- [ ] Design tokens (Inter, `#1E6FE8`, amber disclaimer)  
- [ ] Frames: 390 / 768 / 1280  
- [ ] VI + EN labels  
- [ ] Marketplace disclaimer on feed, detail, create listing  
- [ ] **App download CTA** on landing + footer (Pet Health Care)  
- [ ] Empty / error / loading states  
- [ ] **Không** vẽ health check, pet profile, Mai onboarding  
- [ ] OG / share preview frame for listing URL  

---

## 20. Tham chiếu codebase (marketplace)

| Path | Nội dung |
|------|----------|
| `pet-health-frontend/src/screens/PetFeedScreen.tsx` | Feed UI reference |
| `pet-health-frontend/src/screens/PetFeedPostDetailScreen.tsx` | Detail |
| `pet-health-frontend/src/screens/BreederDetailScreen.tsx` | Breeder |
| `pet-health-frontend/src/screens/CreatePetFeedPostScreen.tsx` | Create listing |
| `pet-health-frontend/src/screens/MessagesInboxScreen.tsx` | DM |
| `pet-health-frontend/src/components/PetFeedPostCard.tsx` | Listing card |
| `pet-health-frontend/src/components/MarketplaceLegalNotice.tsx` | Disclaimer |
| `pet-health-frontend/src/i18n/locales/*.json` | Keys `petFeed.*`, `legal.*`, `account.*` |
| `pet-health-frontend/src/utils/petFeedDeepLinkUrls.ts` | Share URLs |

Mobile-only screens (reference only, **không vẽ cho web**): `HomeScreen`, `HealthCheckScreen`, `ResultsScreen`, `CoreCareScreen`, `OnboardingIntroScreen`, …

---

## 21. Mobile app reference (Pet Care — không build web)

Giữ liên kết để designer hiểu ecosystem; **không vẽ cho web**.

| Nhóm | Màn hình mobile |
|------|-----------------|
| Pet Care | Home, Pet profile, Health check, Results, Core care, Vet summary, Breed recognition |
| Onboarding | Mai intro, add pet, health prompt |
| Marketplace | Pet Feed tab — **shared UX với web**, có thể reuse component design |

---

*Brief web marketplace — Pet Care stays mobile-only. Cập nhật mục 13 khi thay đổi phase.*
