# PetCare Marketplace — Design brief: Admin console (Web)

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
