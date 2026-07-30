# PetCare Pet Marketplace — Brief nghiên cứu: Cạnh tranh công bằng · Độ chính xác · Coin · Figma (Breeder)

**Đối tượng:** Product Owner, Designer Figma, Engineering (tham chiếu)  
**Phạm vi:** Hệ sinh thái **Breeder** trên **Pet Health Care / PetCare Pet Marketplace** (VN-first; song ngữ VI/EN trên UI)  
**Nền tảng:** Mobile (React Native / Expo) + Web (`pet-marketplace.org`)  
**Ngày brief:** 2026-07-30  
**Trạng thái:** Research + design strategy — **không** mô tả payment đã ship; mọi coin/escrow là đề xuất có nhãn phase  
**Annotation bắt buộc trên frame Figma:** `SHIPPED` | `PHASE 1 DESIGN` | `PHASE 2 DATA` | `NEW` | `DATA LATER`

> **Lưu ý pháp lý / sản phẩm:** Marketplace hiện **không xử lý thanh toán**. Brief này thiết kế UX tương lai (boost, deposit) để Figma vẽ được **ngay**, nhưng implementation payment/escrow chỉ sau khi PO chốt compliance + nhà cung cấp. Không được copy “thanh toán an toàn / bảo đảm sức khỏe thú” trên UI.

---

## 0. Tóm tắt điều hành (Executive summary)

Thị trường bán thú Việt Nam cạnh tranh khốc liệt (Facebook group, Zalo, Chợ Tốt, trang trại tư nhân). Sen thiếu tin cậy; breeder tốt bị át bởi tin ảo / spam. MVP Pet Marketplace đã có **discovery + liên hệ**, **trust score client-side 0–100**, template **T1–T5**, **Farm Health** (UI; reports/deals phần lớn `DATA LATER`), **Top Breeders chỉ hiện verified**. Chưa có ranking công bằng, chưa có enforcement độ chính xác, chưa có coin.

**Đề xuất chiến lược (3 trụ):**

1. **Cạnh tranh tích cực & công bằng** — xếp hạng đa tín hiệu (trust + minh bạch + chất lượng tin + hành vi lành mạnh), chống gaming, badge chất lượng theo tháng; **không** bán thứ hạng Top Breeders thuần túy.
2. **Ràng buộc thông tin chính xác** — verification ladder, evidence trên tin, report → penalty points, strike progressive; coin **không** xóa strike nặng / scam.
3. **Coin kiểu Chợ Tốt (tương lai)** — mua coin → boost visibility / (sau) deposit khi bàn giao / (sau nữa) clear điểm phạt **có giới hạn**. Phased: Now (không coin) → A ads → B deposit → C clear points.

**Cho Figma ngay:** bổ sung fairness signals trên Top Breeders; Farm Health + penalty + placeholder coin actions; Accuracy checklist khi tạo tin; Trust tiers rõ; Leaderboard “Chất lượng tháng”; Wallet / Boost / Deposit empty + happy path với nhãn phase — **không cần backend payment để vẽ**.

**Không làm:** pay-to-win Top 1; coin xóa báo cáo scam; hứa bảo đảm sức khỏe thú; biến coin thành cờ bạc / spin.

---

## 1. Framing vấn đề

### 1.1 Bối cảnh thị trường

| Áp lực | Hệ quả với Sen | Hệ quả với Breeder tốt |
|--------|----------------|------------------------|
| Tin FB/Zalo thiếu cấu trúc | Khó so sánh giống / vaccine / giá / khu vực | Bị át bởi tin copy-paste |
| Scam / bait-and-switch | Sợ đặt cọc ngoài app | Mất uy tín chung ngành |
| “Đua top” bằng spam tin | Feed nhiễu | Phải đăng ảo để cạnh tranh |
| Không có trust layer công khai | Tin “verified” tự xưng | Không có ROI minh bạch |

### 1.2 Deficit tin cậy (trust deficit)

- Sen cần tín hiệu **có thể kiểm chứng** (verified admin, evidence ảnh, lịch sử report), không phải “top 1 Việt Nam”.
- Breeder cần **lợi ích rõ** khi khai đúng (visibility, badge, ưu tiên review) — nếu chỉ bị kiểm soát mà không được thưởng, họ sẽ bỏ qua hoặc khai ảo tối thiểu.

### 1.3 Gap sản phẩm hiện tại (code-backed)

| Hạng mục | Hiện trạng | Gap |
|----------|------------|-----|
| Top Breeders | Chỉ `verification_status === 'verified'`; sort **postCount ↓ rồi latestPostAt ↓** (`PetFeedScreen.tsx`) | Ưu tiên số tin → khuyến khích spam; trust score hiện trên card nhưng **không** quyết định rank |
| Trust score | Client `computeBreederTrust` 0–100 (`breederTrust.ts`): verified 30, checklist 15, commitments 15, contact 15, care env 15, active listings 10 | Dễ “điền form” để tăng điểm; chưa trừ report; chưa gắn evidence tin |
| Trust level | L0–L3 theo ngưỡng 40/70/90 (`breederTrustLevel.ts`) | Chưa gate quyền boost / deposit / clear |
| Farm Health | UI ship: score ring, level, reports cứng `0`, deals dashed `comingSoon` | Chưa penalty points, chưa coin actions |
| Templates | T1–T5 cosmetic/layout | Không phải tín hiệu tin cậy |
| Listing review | Admin pending → published (đã có pattern) | Chưa accuracy checklist bắt buộc / evidence tiers |
| Report | API report post/breeder + admin queue | Chưa map → penalty points / strike UI |
| Payment / coin | Không có | Cần design phase trước khi build |

### 1.4 Mục tiêu brief này giải quyết

Công bằng cạnh tranh + độ chính xác thông tin + chuẩn bị coin economy — đủ cụ thể để Figma iterate **lần 3** (sau MOBILE/WEB breeder briefs), không generic “tăng engagement”.

---

## 2. Nguyên tắc thiết kế (Design principles)

| # | Nguyên tắc | EN label | Ý nghĩa vận hành |
|---|------------|----------|------------------|
| P1 | **Công bằng có điều kiện** | Fairness with gates | Visibility trả phí chỉ sau khi đạt trust/verification tối thiểu |
| P2 | **Chính xác > tốc độ đăng** | Accuracy over volume | Tin thiếu evidence bị chậm review / visibility thấp hơn tin đầy đủ |
| P3 | **Tin cậy tiến triển** | Progressive trust | L0→L3 mở dần quyền (boost, nhiều tin, deposit) |
| P4 | **Chống pay-to-win thuần** | Anti pay-to-win | Coin **không** mua slot Top Breeders organic; không xóa strike scam |
| P5 | **Cạnh tranh tích cực** | Positive competition | Badge chất lượng, minh bạch, phản hồi Sen — tránh đua “số tin / ngày” |
| P6 | **Minh bạch công thức** | Explainable ranking | Sen & Breeder thấy “vì sao bạn đứng #n” (rút gọn, không lộ anti-abuse raw) |
| P7 | **Enforcement bậc thang** | Progressive enforcement | Cảnh báo → điểm phạt → hạn chế tin → tạm khóa; có đường khiếu nại |
| P8 | **Pet welfare first** | Welfare over GMV | Không incentive số lượng thú / ép sinh sản; copy tránh “bán chạy nhất” |

---

## 3. Hệ thống cạnh tranh công bằng (Competitive fairness)

### 3.1 Mục tiêu cảm xúc

- Breeder: “Làm đúng được nhìn thấy; spam không thắng.”
- Sen: “Top không phải ai trả nhiều nhất.”

### 3.2 Eligibility vào Top Breeders / Leaderboard

| Điều kiện | Bắt buộc? | Ghi chú |
|-----------|-----------|---------|
| `verification_status = verified` | Có (giữ như hiện tại) | SHIPPED |
| Trust score ≥ ngưỡng (đề xuất **40 / L1+**) | Đề xuất NEW | Loại hồ sơ “verified nhưng trống” |
| Không đang `suspended` / strike nặng | Đề xuất | |
| ≥ 1 tin `published` trong N ngày (đề xuất 90) | Tùy PO | Tránh “verified ma” |
| Không vượt ngưỡng penalty points | Đề xuất | VD: penalty ≥ 50 → ẩn khỏi Top |

### 3.3 Đề xuất công thức xếp hạng (speculative — đánh dấu `PHASE 2 DATA`)

**Không ship công thức này ngay.** Figma vẽ UI “điểm xếp hạng + breakdown”, số liệu mock.

```
RankScore =
  0.35 * TrustScoreNormalized          // 0–100 từ trust (sau này có thể server-side)
+ 0.25 * ListingQualityScore           // đủ field bắt buộc, ảnh ≥ N, vaccine/deworm note, không bị reject gần đây
+ 0.15 * ResponseHealth                // tỉ lệ trả lời DM trong SLA (DATA LATER)
+ 0.15 * SenFeedbackProxy              // save rate / report inverse / (sau) deal success — cẩn trọng bias
+ 0.10 * RecencyBoost                  // tin mới có chất lượng, KHÔNG thưởng số lượng thô
− PenaltyWeight * PenaltyPoints
− SpamPenalty                          // tin trùng / đăng dày bất thường
```

**Tie-break:** trust score ↓ → listing quality ↓ → verified_at cũ hơn (ưu tiên “ổn định lâu”, không ưu tiên account mới spam).

### 3.4 Những gì KHÔNG được đưa vào RankScore

| Không dùng | Lý do |
|------------|-------|
| Số tin đăng thô (postCount) làm primary sort | Gaming bằng tin ảo — **đúng gap hiện tại** |
| Chi tiêu coin / số boost đã mua | Pay-to-win |
| Giá thú cao / GMV | Welfare + bias |
| Số follower MXH tự khai | Dễ giả |

### 3.5 Visibility layers (tách organic vs paid)

| Layer | Tên UI (VI / EN) | Ai kiểm soát | Rule |
|-------|------------------|--------------|------|
| Organic Top | Top Breeders / `TopBreedersList` | RankScore | Không bán |
| Featured slot | Được đề xuất / `FeaturedRail` | Boost coin (Phase A) | Badge **“Quảng cáo” / Sponsored** bắt buộc; tách khỏi organic rank |
| Monthly quality | Breeder chất lượng tháng / `QualityBadgeLeaderboard` | Admin + metric chất lượng | Không bán; 1 badge / category / vùng |

### 3.6 Anti-gaming (research-like controls)

| Vector gaming | Mitigation |
|-------------|------------|
| Đăng 20 tin clone | Dedup ảnh/hash; rate limit tin/ngày theo trust tier; quality score phạt tin thiếu field |
| Điền checklist giả | Verification ladder + evidence upload; random audit admin; report Sen |
| Mua/bán account verified | Device/KYC nhẹ (PO); cool-down khi đổi SĐT hàng loạt |
| Review / DM ảo | Chỉ đếm signal sau verified Sen + account age; anomaly detection (DATA LATER) |
| Boost stack vô hạn | Cap boost đồng thời / cool-down giữa 2 boost; trust gate |
| Clear penalty bằng coin vô hạn | Phase C: limit lần/tháng + không clear strike “scam/abuse” |

### 3.7 Cool-downs & fairness windows

| Sự kiện | Cool-down đề xuất (TBD PO) |
|---------|----------------------------|
| Sau khi bị hạ tin (reject) | 24–72h giảm RecencyBoost |
| Sau strike | 7–30 ngày không vào Quality Badge contest |
| Sau boost kết thúc | 6–12h trước boost lại cùng tin |
| Mới verified | 7 ngày “probation”: vào list nhưng không #1–3 nếu thiếu listing quality |

### 3.8 Positive contests vs toxic races

**Nên làm (positive):**

| Contest | Tiêu chí | Phần thưởng UI |
|---------|----------|----------------|
| Minh bạch tháng | % tin đủ Accuracy checklist + 0 report upheld | Badge `TransparencyMonth` + soft organic boost nhỏ (không coin) |
| Phản hồi tốt | SLA DM (khi có data) | Chip “Phản hồi nhanh” |
| Ảnh môi trường thật | Upload care environment được duyệt | Highlight trên Farm Health |

**Không làm (toxic):**

- Bảng đua “đăng nhiều nhất tuần”
- “Top doanh thu”
- Leaderboard realtime kiểu game (gây FOMO / spam)
- Spin / hộp quà random bằng coin

### 3.9 Copy fairness (Sen-facing)

VI: *“Thứ hạng dựa trên độ minh bạch và chất lượng tin đã duyệt — không bán vị trí Top.”*  
EN: *“Ranking reflects verified transparency and listing quality — Top slots are not for sale.”*

---

## 4. Độ chính xác & thực thi (Accuracy & enforcement)

### 4.1 Verification ladder (Breeder)

| Bậc | EN / VI | Điều kiện (đề xuất) | Quyền mở |
|-----|---------|---------------------|----------|
| V0 | Unverified / Chưa xác minh | Đăng ký hồ sơ | Xem UI; **không** Top; tin có thể bị hạn chế |
| V1 | Pending / Chờ duyệt | Nộp form + ảnh CCCD/giấy trại (PO chốt PII) | Chờ |
| V2 | Verified / Đã xác minh | Admin duyệt | Top eligible; đăng tin chuẩn |
| V3 | Verified+ / Đối tác | Trust L2+ + lịch sử sạch N tháng | Boost cao hơn; deposit ưu tiên (Phase B) |
| VX | Suspended / Tạm khóa | Strike / scam | Chỉ xem; không đăng / message |

*Figma:* chip verification trên profile + Farm Health; state machine rõ.

### 4.2 Evidence trên tin đăng (Listing evidence)

| Field / bằng chứng | Bắt buộc MVP UI? | Phase |
|--------------------|------------------|-------|
| Ảnh thú ≥ 3 góc | Có (Accuracy checklist) | Now DESIGN → ship dần |
| Ảnh sổ tiêm / vaccine note | Khuyến nghị → bắt buộc theo species (PO) | Now |
| Video ngắn | Optional; filter “có video” đã có | SHIPPED filter |
| Giấy tờ trại (nếu claim registered kennel) | Khi chọn type T5 / `registered_kennel` | Now DESIGN |
| Cam kết marketplace terms | Đã có pattern checkbox | SHIPPED pattern |

### 4.3 Accuracy checklist khi tạo / sửa tin (`ListingAccuracyChecklist` — NEW / Now)

Checklist UI (không phải payment):

1. Giống / loài / giới tính / tuổi tháng đã điền  
2. Địa bàn (quận-huyện + tỉnh) rõ  
3. Giá hoặc `price_note` không mơ hồ kiểu “inbox” *hoặc* có lý do “liên hệ báo giá” + giải thích  
4. Vaccine / tẩy giun: chọn trạng thái **hoặc** “Chưa có / không rõ” (cấm để trống im lặng)  
5. ≥ 3 ảnh đạt hướng dẫn (ánh sáng, không watermark lạ)  
6. Mô tả không copy nguyên văn tin khác (hint; enforce DATA LATER)  
7. Checkbox: *Thông tin đúng sự thật theo hiểu biết của tôi* + link Marketplace Guidelines  

**Gate submit:** thiếu mục bắt buộc → CTA disabled + giải thích. Admin vẫn review.

### 4.4 Report → Penalty points

| Nguồn | Ví dụ reason | Điểm phạt đề xuất (TBD PO) | Ghi chú |
|-------|--------------|----------------------------|---------|
| Report tin upheld | Sai giống / bait giá | +10–25 | |
| Report tin upheld | Claim sức khỏe sai lệch nghiêm trọng | +30–50 | |
| Report breeder | Lừa đảo / không giao thú | +80 + strike | Không clear bằng coin |
| Admin reject tin lặp | Thiếu evidence sau cảnh báo | +5–15 | |
| Self-correct kịp | Sửa tin trước khi uphold | 0 hoặc giảm | Khuyến khích sửa |

**Hiển thị Farm Health:** `PenaltyPointsMeter` (0–100 hoặc 0–∞ có tier). Reports count hiện hardcode `0` → thay bằng data thật (`PHASE 2 DATA`).

### 4.5 Strike system (progressive)

| Strike | Hậu quả UI + product |
|--------|----------------------|
| S1 Warning | Banner vàng Farm Health + email/push |
| S2 Restrict | Giảm số tin active; mất Featured; mất contest |
| S3 Suspend | Khóa đăng tin / boost; profile badge “Tạm hạn chế” |
| S4 Ban | Khóa tài khoản marketplace (PO/legal) |

Đường **Dispute / Khiếu nại:** form + trạng thái `under_review` — Figma frame `PenaltyDisputeSheet`.

### 4.6 Coin được / không được clear gì (Phase C)

| Được clear (giới hạn) | Không được clear |
|-----------------------|------------------|
| Điểm phạt nhỏ từ reject kỹ thuật / thiếu ảnh (sau khi đã sửa) | Strike scam / abuse / giả mạo verified |
| Một phần điểm từ report “misleading” mức thấp (admin approve) | Lệnh suspend đang hiệu lực |
| | Điểm trong thời gian probation |

Rule UX: *“Coin giúp phục hồi sau lỗi vận hành; không mua lại uy tín sau lừa đảo.”*

### 4.7 Commitments (đã có tín hiệu trust)

Giữ `transparencyCommitments` trong trust score; Figma thêm: commitments **có hậu quả** nếu vi phạm (link tới penalty) — không chỉ checkbox tăng điểm.

---

## 5. Kinh tế coin (Chợ Tốt–inspired) — speculative

> Toàn bộ mục 5 = **PHASE 1 DESIGN** (UI) / **PHASE 2 DATA** (ledger). Không invent gateway đã live.

### 5.1 Mục đích coin (`PetCoin` / tên PO TBD)

| Use case | Ai dùng | Phase | Trust gate đề xuất |
|----------|---------|-------|---------------------|
| **Boost listing** (đẩy tin / Featured rail) | Breeder | A | Verified + Trust ≥ L1 + penalty dưới ngưỡng |
| **Boost profile** (xuất hiện “Được đề xuất”) | Breeder | A | Verified + L2 khuyến nghị |
| **Deposit / escrow tay ba** khi bàn giao thú | Sen + Breeder | B | Cả hai theo policy; L2+ bên bán |
| **Clear penalty points** (có hạn) | Breeder | C | Không có strike scam; cap lần/tháng |
| Mua thêm lượt đăng tin (nếu có cap) | Breeder | A optional | Theo tier |

**Không dùng coin cho:** mua verified badge; mua organic Top rank; cược / random reward.

### 5.2 Wallet UX (`CoinWalletScreen`)

| State | Nội dung Figma |
|-------|----------------|
| Empty | Illustration + “Chưa có coin” + CTA “Tìm hiểu Boost” (Phase A) / “Sắp mở” nếu Now |
| Funded (mock) | Số dư, lịch sử: +mua / −boost / −deposit / −clear |
| Pending deposit | Dòng “Đang giữ ký quỹ — giao dịch #…” |
| Restricted | Wallet xem được nhưng CTA mua bị khóa kèm lý do strike |

Component: `CoinBalanceChip`, `CoinLedgerList`, `BuyCoinSheet` (giá **TBD PO**).

### 5.3 Boost listing flow (happy path)

1. Listing detail (owner) → **Đẩy tin** `BoostListingCTA`  
2. Sheet: chọn gói thời gian (24h / 72h / 7 ngày — placeholder) + preview vị trí Featured  
3. Xác nhận trừ coin + badge **Quảng cáo** trên card  
4. Farm Health / Wallet ghi ledger  
5. Hết hạn → về organic  

**Bắt buộc:** label Sponsored; không trộn số RankScore organic.

### 5.4 Deposit / escrow (Phase B) — happy path

```
Sen đồng ý điều khoản → Khóa coin/deposit
  → Breeder xác nhận giữ chỗ
  → Hai bên xác nhận bàn giao (otp/check-in)
  → Giải phóng cho Breeder (hoặc hoàn Sen nếu hủy hợp lệ)
```

Dispute path: `DepositDisputeFlow` — tạm giữ, admin mediate.  
**Disclaimer:** Pet Health Care không phải bên bán; deposit là công cụ giảm rủi ro, không bảo lãnh sức khỏe thú.

### 5.5 Clear points rules (Phase C)

| Rule | Đề xuất |
|------|---------|
| Tỉ lệ | X coin = Y penalty points (TBD PO) |
| Cap | ≤ 1 lần / 30 ngày; ≤ Z% điểm hiện có |
| Điều kiện | Đã sửa root cause (tin đã update / evidence mới) |
| UI | `ClearPenaltySheet` + cảnh báo ethics |

### 5.6 Pricing placeholders

| Gói | Giá | Coin nhận | Ghi chú |
|-----|-----|-----------|---------|
| Gói Starter | **TBD PO** | TBD | |
| Gói Standard | **TBD PO** | TBD | |
| Gói Pro | **TBD PO** | TBD | Có thể bonus % — **không** random loot |
| Boost 24h | **TBD PO** coin | — | |
| Deposit giữ chỗ | **TBD PO** theo % giá tin hoặc fixed tiers | — | Legal review |

Figma: dùng “—” hoặc “TBD” trong UI mock; annotation `PO_PRICING`.

### 5.7 So sánh cảm hứng Chợ Tốt (không copy pháp lý)

| Chợ Tốt (tham chiếu thị trường) | Pet Marketplace đề xuất |
|---------------------------------|-------------------------|
| Đẩy tin / tin ưu tiên bằng xu | Boost **có** badge Quảng cáo + trust gate |
| Tài khoản / gói đăng tin | Cap tin theo trust tier + optional coin |
| (Một số) cơ chế tin cậy / khiếu nại | Farm Health + penalty + dispute; deposit Phase B |
| Không phải pet-welfare native | Thêm constraint welfare + disclaimer sức khỏe |

---

## 6. Roadmap theo phase (để Figma & Eng đồng bộ)

| Phase | Tên | Ship thật? | Figma vẽ gì | Ghi chú |
|-------|-----|------------|-------------|---------|
| **Now** | Accuracy & fairness UI | Có thể ship dần không cần payment | Accuracy checklist; fairness copy trên Top; penalty UI empty/mock; trust tier gates copy; Quality badge mock | Ưu tiên |
| **A** | Coin ads only | Sau PSP | Wallet, Buy coin, Boost flows, Sponsored cards | Chưa deposit |
| **B** | Deposit | Sau legal + ops | Deposit happy + dispute; trạng thái giữ tiền | |
| **C** | Penalty clear | Sau A ổn định abuse | ClearPenaltySheet + caps | |

**Nguyên tắc phase:** UI Phase A/B/C có thể nằm trong cùng Figma file với sticker màu phase — Eng chỉ implement Now trước.

---

## 7. Checklist deliverables Figma

### 7.1 Artboards

| Frame size | Dùng cho |
|------------|----------|
| **390×844** | Mobile app |
| **1280×800+** | Web desktop (Pet Marketplace header) |
| Optional **768** | Web tablet |

### 7.2 Frame inventory (nhãn)

| Frame / component | Mobile | Web | Label |
|-------------------|--------|-----|-------|
| Top Breeders list + card (hiện tại) | ✓ | ✓ | SHIPPED |
| Top Breeders + `RankExplainSheet` + fairness footer | ✓ | ✓ | NEW / Now |
| `SponsoredBreederCard` / Featured rail | ✓ | ✓ | PHASE 1 DESIGN |
| `QualityBadgeLeaderboard` (tháng) | ✓ | ✓ | PHASE 1 DESIGN |
| Breeder detail templates T1–T5 | ✓ | ✓ | SHIPPED / polish |
| Farm Health dashboard (score, signals, deals coming soon) | ✓ | ✓ | SHIPPED + DATA LATER |
| Farm Health + `PenaltyPointsMeter` + strike banner | ✓ | ✓ | NEW / Now UI → PHASE 2 DATA |
| Farm Health + Coin actions (Boost, Clear — disabled/coming) | ✓ | ✓ | PHASE 1 DESIGN |
| `ListingAccuracyChecklist` trên Create/Edit | ✓ | ✓ | NEW / Now |
| `CoinWalletScreen` empty + funded mock | ✓ | ✓ | PHASE 1 DESIGN |
| `BoostListingSheet` | ✓ | ✓ | PHASE 1 DESIGN |
| `DepositFlow` + dispute | ✓ | ✓ | PHASE 1 DESIGN (Phase B product) |
| `ClearPenaltySheet` | ✓ | ✓ | PHASE 1 DESIGN (Phase C) |
| `BuyCoinSheet` giá TBD | ✓ | ✓ | PHASE 1 DESIGN |
| Trust tier matrix (L0–L3 rights) | ✓ | ✓ | NEW |
| Empty/error: wallet, boost ineligible, deposit locked | ✓ | ✓ | PHASE 1 DESIGN |
| OG/share unchanged disclaimer | — | ✓ | SHIPPED pattern |

### 7.3 Sticker annotation

Mỗi frame góc phải: màu  
- Xanh: SHIPPED  
- Xanh dương: NEW (Now)  
- Tím: PHASE 1 DESIGN  
- Xám dash: PHASE 2 DATA / DATA LATER  

---

## 8. Ghi chú UI từng màn (Screen-by-screen)

### 8.1 Top Breeders (`TopBreedersList`)

**Giữ:** verified-only, card trust score, rank badge 1–3 màu (`rankBadgeColor`).  
**Đổi:**

| Element | Hướng dẫn |
|---------|-----------|
| Sort explanation | Chip hoặc link “Cách xếp hạng” → sheet P6 |
| Quality vs quantity | Secondary metric: “Độ đầy đủ tin” thay vì chỉ “Số tin” (số tin có thể giữ nhưng không phải hero) |
| Fairness footer | 1 câu: không bán chỗ Top |
| Sponsored | Section riêng phía trên/ dưới organic, label Quảng cáo |
| Filter | Giữ species/province; thêm “Có badge tháng” (mock) |

### 8.2 Farm Health (`FarmHealthScreen`)

**Giữ:** ScoreRing, TrustLevelChip, signal list, tips, footnote “không phải tín dụng”.  
**Thêm:**

| Block | Label |
|-------|-------|
| Penalty points | `PenaltyPointsMeter` + lịch sử ngắn |
| Strike status | Banner S1–S3 |
| Coin snapshot | Số dư mock + CTA Boost / Wallet (disabled nếu Now) |
| Deals | Giữ dashed coming soon cho success/fail tới khi Phase B |
| Improve actions | Deep link Accuracy checklist / bổ sung evidence |

### 8.3 Create / Edit listing

- Chèn `ListingAccuracyChecklist` trước submit  
- Preview “Điểm chất lượng tin ước tính” (educational, không hứa rank)  
- Terms checkbox giữ disclaimer marketplace  

### 8.4 Wallet

- Empty state giáo dục: coin để **đẩy tin / ký quỹ**, không phải mua uy tín  
- Ledger icons rõ (+/−)  
- Link Guidelines + “Coin không hoàn lại sau boost đã chạy” (PO legal)  

### 8.5 Boost

- So sánh trước/sau vị trí (illustration)  
- Gate fail states: chưa verified / penalty cao / hết lượt  
- Badge Quảng cáo trên `PetFeedPostCard` variant  

### 8.6 Deposit

- Timeline 4 bước  
- Số coin bị khóa hiển thị realtime mock  
- CTA “Mở tranh chấp”  
- Disclaimer sức khỏe + không phải bên bán  

### 8.7 Trust tiers (matrix component `TrustTierMatrix`)

| Level | VI (i18n hiện có) | Quyền đề xuất (UI) |
|-------|-------------------|--------------------|
| L0 | Mới bắt đầu | Đăng tin giới hạn; không boost |
| L1 | Đang xây dựng | Boost cơ bản |
| L2 | Đáng tin cậy | Boost + deposit seller |
| L3 | Đối tác nổi bật | Ưu tiên review; contest eligible |

---

## 9. Rủi ro & đạo đức

| Rủi ro | Mitigation |
|--------|------------|
| Coin → cảm giác cờ bạc | Cấm loot box; giá cố định; không leaderboard chi tiêu |
| Pay-to-win làm Sen mất tin | Tách Sponsored; công bố không bán Top |
| Ép breeder nhỏ bỏ cuộc | Gói starter giá thấp (TBD); organic path mạnh |
| Scam dùng deposit để tạo trust giả | Deposit chỉ Phase B + KYC; admin dispute; clear points không cho scam |
| Welfare: khuyến khích đẻ hàng loạt | Không rank theo số thú; tip copy chăm sóc |
| PII verification | Minimize; retention policy; web/mobile cùng standard |
| “Bảo đảm thú khỏe” do trust UI | Footnote Farm Health giữ; legal banner |

---

## 10. Quyết định mở cho PO (Open decisions)

1. Tên coin & danh pháp VI (Xu / PetCoin / Coin trại…)?  
2. Có KYC bắt buộc trước Verified+ / deposit không?  
3. Trust score chuyển **server-side** khi nào? (hiện client-only)  
4. Ranking: trọng số cuối của công thức §3.3?  
5. Có bán “gói tin/tháng” ngoài boost không?  
6. Deposit: % giá thú hay mốc cố định? Ai chịu phí PSP?  
7. Clear penalty: có cho phép không, hay chỉ hết hạn theo thời gian?  
8. Top Breeders: bỏ hẳn sort postCount ngay trong Now hay chờ RankScore?  
9. Web có bán coin trước mobile hay đồng thời?  
10. Message trên farm detail vs chỉ qua listing (câu hỏi cũ index brief)?  
11. Deal success/fail metric: nguồn sự thật (self-report vs deposit completion)?  
12. Template có ảnh hưởng ranking không? (**Khuyến nghị: không**)

---

## 11. Mapping code / docs hiện có

| Artifact | Vai trò với brief này |
|----------|----------------------|
| [`docs/MOBILE_BREEDER_DESIGN_CONTEXT.md`](./MOBILE_BREEDER_DESIGN_CONTEXT.md) | Handoff Figma mobile surfaces (Top, detail T1–T5, Farm Health, picker) — **iteration 1** |
| [`docs/WEB_BREEDER_DESIGN_CONTEXT.md`](./WEB_BREEDER_DESIGN_CONTEXT.md) | Parity web layout/IA — **iteration 1** |
| [`docs/BREEDER_UI_FIGMA_BRIEF.md`](./BREEDER_UI_FIGMA_BRIEF.md) | Index trỏ 2 brief trên + brief strategy này |
| [`docs/WEB_DESIGN_CONTEXT.md`](./WEB_DESIGN_CONTEXT.md) | IA web marketplace tổng; disclaimer; không Pet Care AI trên web |
| `pet-health-frontend/src/utils/breederTrust.ts` | Công thức trust 0–100 hiện tại (6 signals) |
| `pet-health-frontend/src/utils/breederTrustLevel.ts` | L0–L3, màu, rank badge 1–3 |
| `pet-health-frontend/src/constants/breederTemplates.ts` | T1–T5 IDs |
| `pet-health-frontend/src/screens/FarmHealthScreen.tsx` | UI Farm Health SHIPPED; reports=0; deals coming soon |
| `pet-health-frontend/src/screens/PetFeedScreen.tsx` | Top Breeders verified + sort postCount |
| `pet-health-frontend/src/components/breeder/TopBreederCard.tsx` | Card UI |
| `pet-health-frontend/src/components/MarketplaceLegalNotice.tsx` | Disclaimer |
| `pet-health-frontend/src/api.ts` | `reportPetFeedPost`, `reportBreederProfile`, admin reports |
| i18n `breederTrustLevel.*`, `farmHealth.*`, `petFeed.topBreeders.*` | Copy VI/EN |

**Out of scope web/mobile (nhắc lại):** Health check, Mai core UX, pet profile care, thanh toán live chưa chốt PSP.

---

## Phụ lục A — Component list bổ sung (EN names cho Figma)

| Component | Phase |
|-----------|-------|
| `RankExplainSheet` | Now |
| `FairnessFooter` | Now |
| `SponsoredRail` / `SponsoredBadge` | A |
| `QualityBadgeLeaderboard` | Now mock / PHASE 2 DATA |
| `ListingAccuracyChecklist` | Now |
| `PenaltyPointsMeter` | Now UI / PHASE 2 DATA |
| `StrikeBanner` | Now UI |
| `PenaltyDisputeSheet` | Now UI |
| `TrustTierMatrix` | Now |
| `CoinBalanceChip` | A |
| `CoinWalletScreen` | A |
| `BuyCoinSheet` | A |
| `BoostListingSheet` | A |
| `BoostIneligibleModal` | A |
| `DepositTimeline` | B |
| `DepositDisputeFlow` | B |
| `ClearPenaltySheet` | C |

## Phụ lục B — Sample microcopy

| Key | VI | EN |
|-----|----|----|
| fairness.footer | Thứ hạng không bán bằng coin. | Rankings are not sold for coins. |
| boost.sponsored | Quảng cáo | Sponsored |
| accuracy.title | Kiểm tra độ chính xác tin | Listing accuracy check |
| penalty.clear.denied | Không thể xóa điểm phạt liên quan lừa đảo. | Fraud-related penalties cannot be cleared. |
| wallet.empty | Coin dùng để đẩy tin hoặc ký quỹ — không mua huy hiệu xác minh. | Coins boost listings or deposits — not verification badges. |
| deposit.disclaimer | Ký quỹ không bảo lãnh sức khỏe thú hay tư cách bên bán. | A deposit does not guarantee pet health or seller conduct. |

---

## Phụ lục C — Trust score hiện tại (tham chiếu code)

Từ `computeBreederTrust` (`breederTrust.ts`) — **SHIPPED**, client-side:

| Signal key | Max điểm | Điều kiện passed (rút gọn) |
|------------|----------|----------------------------|
| `verified` | 30 | `verification_status === 'verified'` |
| `careChecklist` | 15 | ≥ 3 mục metadata `careChecklist` |
| `commitments` | 15 | ≥ 2 mục `transparencyCommitments` |
| `contact` | 15 | phone / zalo / facebook |
| `careEnvironment` | 15 | `care_environment` hoặc `bio` |
| `activeListings` | 10 | số tin × 2, cap 10 |

Levels (`breederTrustLevel.ts`): L0 &lt;40 · L1 ≥40 · L2 ≥70 · L3 ≥90.  
Labels VI: Mới bắt đầu / Đang xây dựng / Đáng tin cậy / Đối tác nổi bật.

**Hướng evolution (speculative):** trừ `PenaltyPoints`; cộng listing evidence; chuyển server-side trước khi RankScore production — đánh dấu `PHASE 2 DATA` trên Figma.

---

## Phụ lục D — Ưu tiên vẽ Figma (sprint gợi ý)

| Sprint design | Frames ưu tiên | Lý do |
|---------------|----------------|-------|
| Sprint 1 (Now) | Accuracy checklist, RankExplain + FairnessFooter, Penalty meter empty, TrustTierMatrix | Ship được không cần PSP |
| Sprint 2 (A UI) | Wallet empty/funded, BuyCoin TBD, Boost sheet, Sponsored badge | Chốt narrative coin ads |
| Sprint 3 (B/C UI) | Deposit timeline + dispute, ClearPenalty | Legal/PO có thể cắt — vẫn cần mock để quyết định |

---

*Hết brief. Cập nhật §6–§10 khi PO chốt pricing / legal. Designer: ưu tiên Now frames trước khi tô màu Phase A–C.*
