# Onboarding Mai Guided Flow (Proposed)

## 1) Muc tieu

Thiet ke lai onboarding lan dau dang nhap de:

- Tang ty le hoan tat onboarding (user khong bi ngop boi full form).
- Thu thap du lieu theo tung buoc nho, co phan hoi som.
- Nang chat luong ket qua health-check cuoi cung bang cach tong hop ket qua tung section.
- Tao trai nghiem co nhan vat tro ly "Co Mai" xuyen suot.

## 2) Mai assistant assets

Tai nguyen hinh anh nhan vat Mai hien co:

- `pet-health-context/MaiAssistant/MAI-GREETING.png`
- `pet-health-context/MaiAssistant/MAI-GUIDING.png`
- `pet-health-context/MaiAssistant/MAI-CALMING.png`
- `pet-health-context/MaiAssistant/MAI-COMFORTING.png`

Goi y dung:

- Greeting/welcome: `MAI-GREETING`
- Huong dan tung buoc: `MAI-GUIDING`
- Cho xu ly / loading: `MAI-CALMING`
- Bao loi nhe nhang / can bo sung: `MAI-COMFORTING`

## 3) User flow tong the (lan dau login)

### Step 0 - Loi ngo (Welcome Intro)

Muc dich: dat ky vong, tao dong luc, giam bo roi.

Noi dung ket:

`"Okie, gio chung ta hay cung bat dau tao ho so dau tien cho be yeu nhe"`

CTA:

- Nut chinh: `Go`

Dieu kien hien thi:

- Chi hien thi cho user lan dau (flag `has_completed_onboarding = false`).
- User da onboarding roi thi bo qua va vao Home/My Pets.

### Step 1 - Tao ho so thu cung co Mai huong dan

Co Mai text:

`"Sen oi, hay giup Mai dien cac thong tin cua be nhe!"`

Input:

- Ten be
- Loai (species)
- Giong (breed, co the de trong)
- Tuoi
- Can nang (neu co)
- Gioi tinh

Output:

- Tao pet profile co ID de dung cho cac section tiep theo.

### Step 2 - Kiem tra suc khoe chia section (khong hien full fields ngay)

Muc tieu:

- Progressive disclosure (tung section nho).
- Moi section xong goi API rieng + hien ket qua section.
- Cuoi cung tong hop tat ca de goi API final triage.

Section de xuat:

1. Tong hop hinh anh
2. Moi truong song va thoi quen
3. Vaccine va lich su y te
4. Trieu chung hien tai
5. Tong hop va phan tich cuoi

## 4) Section 1 - Tong hop hinh anh (chi tiet)

### 4.1 Trai nghiem UI

- Moi field upload chi cho 1 anh.
- Upload field tiep theo chi hien sau khi field hien tai da hop le.
- Bong bong hoi thoai cua Mai chi tap trung vao field dang lam.
- Khi field moi hien, huong dan cua field truoc an di.

### 4.2 Anh can thiet de nhan dang loai/giong

#### A) Dog/Cat (MVP uu tien)

Bat buoc:

- Anh mat/chinh dien dau (nhan dien dac diem khuon mat, mui, mat, tai)
- Anh toan than dung nghieng (left/right profile)
- Anh toan than chinh dien
- Anh long/hoa tiet gan (coat texture/pattern)

Nen co:

- Anh duoi (hinh dang, do dai)
- Anh ban chan (kich thuoc, long ke ngot)
- Anh rang/mieng (neu can bo sung, phu hop tanh chat)

#### B) Cac loai khac (future-ready)

- Hamster/rabbit: mat + toan than + long + tai
- Chicken/bird: mat + toan than + canh + chan/ban chan + mao/mo

Ghi chu:

- MVP nen khoa species ho tro chinh la `dog/cat`.
- Neu species ngoai pham vi, dung generic photo checklist + thong bao "ket qua chi mang tinh tham khao".

### 4.3 API sau khi hoan tat section 1

Muc tieu API:

- Kiem tra chat luong anh
- Uoc luong species/breed candidate
- Tra ve "anh nao thieu/chua ro"

Response de xuat:

- `species_detected`
- `species_confidence`
- `breed_candidates[]`
- `missing_required_views[]`
- `quality_issues[]`
- `next_photo_suggestions[]`

Neu confidence thap:

- Yeu cau user chup lai dung goc cu the.

## 5) Section 2 - Moi truong song va thoi quen

Input:

- Trong nha/ngoai troi/hon hop
- Song cung nhieu thu cung khac?
- Tan suat di dao/van dong
- Che do an co ban

API section:

- Danh gia risk context (da, tai, ky sinh trung, stress...)
- Goi y du lieu can bo sung neu context xung dot.

## 6) Section 3 - Vaccine va lich su y te

Input:

- Da tiem vaccine chua
- Loai vaccine (neu co)
- Da triet san chua
- Benh nen/benh da tung mac
- Thuoc dang su dung

API section:

- Kiem tra nhat quan thong tin
- Danh sach warning can luu y
- Truong thong tin can bo sung cho final triage

## 7) Section 4 - Trieu chung hien tai

Input:

- Trieu chung mo ta text
- Thoi gian xuat hien
- Muc do nang nhe user danh gia
- Video ngan (neu co)

API section:

- Chuan hoa trieu chung ve symptom tags
- Danh dau red flag som (neu co)
- Goi y "khi nao can den phong kham ngay"

## 8) Section 5 - Tong hop va phan tich cuoi

Input tong hop:

- Pet profile + ket qua section 1..4 + media

API final:

- Goi AI triage final (schema JSON chuan dang dung)
- Uu tien safety, canh bao red flags
- Tra ve next actions ro rang theo ngon ngu user

Output:

- Ket qua tong hop day du cho user
- Luu lich su vao `analyses`

## 9) Data model de xuat (onboarding moi)

Them bang/field:

- `user_profiles.has_completed_onboarding` (boolean)
- `user_profiles.onboarding_version` (de migrate flow sau nay)
- `onboarding_sessions`:
  - `id`, `user_id`, `pet_id`, `status`
  - `section1_result`, `section2_result`, `section3_result`, `section4_result`
  - `final_result`
  - `created_at`, `updated_at`

## 10) Plan implementation (step-by-step)

### Phase A - Foundation

1. Them feature flag `ONBOARDING_V2_ENABLED` (BE + FE)
2. Them state/route cho flow moi:
   - welcome-intro
   - onboarding-pet-profile
   - onboarding-section-1..4
   - onboarding-final
3. Them `has_completed_onboarding` persistence

Deliverable:

- User lan dau thay page Loi Ngo + nut Go.

### Phase B - Section 1 (anh) truoc

1. Xay UI upload tuan tu (1 field xong moi hien field tiep)
2. Them API `POST /onboarding/section-1/image-summary`
3. Validate quality + species/breed candidates + missing views
4. Hien ket qua section 1 va cho user tiep tuc

Deliverable:

- Chay duoc full Section 1 voi ket qua trung gian.

### Phase C - Section 2/3/4

1. Tach form nho moi section
2. Goi API section rieng:
   - `/onboarding/section-2/context`
   - `/onboarding/section-3/medical`
   - `/onboarding/section-4/symptoms`
3. Luu ket qua section vao onboarding session

Deliverable:

- Co day du du lieu tong hop truoc final.

### Phase D - Final aggregation + finish

1. API `/onboarding/final-health-check`
2. Tong hop du lieu + goi triage AI final
3. Luu `analyses`, set `has_completed_onboarding = true`
4. Redirect ve My Pets/Home

Deliverable:

- Hoan tat onboarding end-to-end.

### Phase E - Hardening

1. Unit tests + integration tests cho tung section API
2. Tracking funnel:
   - vao section, bo giua chung, hoan tat
3. i18n full VN/EN cho toan flow
4. Retry/timeout/offline UX

## 11) API contract draft (de chot truoc khi code)

Can chot:

- Payload/response schema cho section 1..4
- Mapping field chung giua section API va final API
- Error code set rieng cho onboarding
- Rule cache/rate-limit cho section APIs

## 12) Risk & luu y

- Qua nhieu API calls co the tang latency -> can batching/hop ly hoa section.
- Species ngoai dog/cat can explicit messaging tranh ky vong sai.
- Can xu ly quyen rieng tu hinh anh (storage policy + retention).
- Prompt drift: can version prompt theo section.

## 13) De xuat thu tu thuc hien ngay

1. Implement Step 0 + Step 1 + flag has_completed_onboarding
2. Implement Section 1 (anh) full stack
3. Demo noi bo + chot UX
4. Sau do moi lam Section 2/3/4 va Final

