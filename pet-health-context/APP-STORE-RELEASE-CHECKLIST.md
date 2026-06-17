# App Store Release Checklist — Pet Health Care

Checklist cho team tick trực tiếp trên GitHub. Dùng cho **iOS App Store** release v1.

**Liên quan:**
- QA chi tiết: [APP-STORE-QA-RUNSHEET.md](./APP-STORE-QA-RUNSHEET.md)
- Metadata / copy draft: [APP-STORE-SUBMISSION-PACKET.md](./APP-STORE-SUBMISSION-PACKET.md)
- Readiness notes: [APPLE-RELEASE-READINESS.md](./APPLE-RELEASE-READINESS.md)
- Backend ops: [PRE-RELEASE-CHECKLIST.md](./PRE-RELEASE-CHECKLIST.md)

**App identity**
- App name: Pet Health Care
- Bundle ID: `com.pethealthcare.app`
- ASC App ID: `6778684107`
- API: `https://pet-health-backend-serb.onrender.com`

---

## Go / No-Go

Chỉ submit App Review khi **tất cả mục Priority 0** đã tick và TestFlight QA pass.

- [ ] Priority 0 hoàn tất
- [ ] `yarn release:check` pass trong `pet-health-frontend`
- [ ] TestFlight build đã test trên iPhone thật
- [ ] Reviewer account hoạt động 100%
- [ ] Team đồng ý submit

---

## 1. Backend & uptime

- [ ] UptimeRobot (hoặc monitor tương đương) ping `/health` mỗi 5 phút
- [ ] Monitor status = **Up**
- [ ] `yarn release:verify:backend` pass
- [ ] `/health/ready?deep=1` trả `status: "ready"`
- [ ] Cold start chấp nhận được (lần 2 thường < 5s) hoặc đã nâng Render plan không sleep
- [ ] Không phụ thuộc ngrok / LAN IP trong production
- [ ] EAS production env có `EXPO_PUBLIC_API_ORIGIN` trỏ HTTPS backend

**Lệnh kiểm tra:**
```bash
cd pet-health-frontend
yarn release:verify:backend
```

---

## 2. Trang pháp lý & support (public URLs)

- [ ] `docs/` đã push lên `main`
- [ ] GitHub Pages bật từ branch `main`, folder `/docs`
- [ ] `yarn release:verify:public-links` pass
- [ ] Legal Center mở được: https://vinhnguyen080597.github.io/PETHEALTHCARE/
- [ ] Privacy Policy: https://vinhnguyen080597.github.io/PETHEALTHCARE/privacy-policy/
- [ ] Terms: https://vinhnguyen080597.github.io/PETHEALTHCARE/terms-of-service/
- [ ] Support: https://vinhnguyen080597.github.io/PETHEALTHCARE/support/
- [ ] Email support hiển thị rõ: `cattieshealthcare@gmail.com`
- [ ] EAS production env có `EXPO_PUBLIC_PRIVACY_POLICY_URL`, `EXPO_PUBLIC_TERMS_OF_SERVICE_URL`, `EXPO_PUBLIC_SUPPORT_URL`

**Lệnh kiểm tra:**
```bash
cd pet-health-frontend
yarn release:verify:public-links
```

---

## 3. Code quality & release scripts

- [ ] `yarn typecheck` pass
- [ ] `yarn test` pass (unit tests)
- [ ] `npx expo-doctor` pass
- [ ] `yarn release:check` pass (full gate)
- [ ] Không có secret / admin key trong frontend build config
- [ ] `.env` thật không được commit

**Lệnh kiểm tra:**
```bash
cd pet-health-frontend
yarn release:check
```

---

## 4. iOS app config (đã có sẵn — xác nhận lại)

- [x] `ios.bundleIdentifier` = `com.pethealthcare.app`
- [x] `ITSAppUsesNonExemptEncryption` = `false`
- [x] `NSPhotoLibraryUsageDescription` có và mô tả đúng use case
- [x] `ios.supportsTablet` = `false`
- [ ] Icon & splash là asset **chính thức** (không còn placeholder) — đã kiểm tra trên thiết bị thật
- [ ] Permission strings vẫn đúng sau mọi thay đổi gần đây (nếu có rebuild)

---

## 5. EAS build & TestFlight

- [x] `eas.json` có production profile + auto increment
- [x] `eas.json` submit iOS có `ascAppId`
- [ ] Apple distribution certificate & provisioning profile còn hạn
- [ ] EAS production environment variables đầy đủ
- [ ] Production iOS build thành công:
  ```bash
  cd pet-health-frontend
  yarn build:ios:production
  ```
- [ ] Build đã upload TestFlight (EAS auto hoặc `eas submit`)
- [ ] Cài build trên **iPhone thật** (không dùng Expo Go)
- [ ] Ghi lại build number đang submit: `________`

---

## 6. In-app compliance (Apple guidelines)

### Account
- [x] Có đăng ký / đăng nhập
- [x] Có **Delete account** trong Account screen
- [x] Copy xóa tài khoản giải thích dữ liệu bị xóa
- [ ] Flow xóa account test end-to-end trên TestFlight

### Legal links trong app
- [x] Login mở Terms, Privacy, Support
- [x] Account mở Terms, Privacy, Support
- [ ] Các link mở đúng URL production trên thiết bị thật

### Health / AI wording
- [x] UI không dùng label diagnosis / treatment
- [x] Disclaimer hiển thị trước / gần kết quả AI
- [x] Health Check có cảnh báo khẩn cấp (không chờ AI khi nguy hiểm)
- [ ] Rà lại copy EN + VI trên build release

### UGC (Pet Feed / Breeder)
- [x] Report listing
- [x] Report breeder profile
- [x] Hide / block breeder
- [x] Admin moderation (archive, suspend, dismiss reports)
- [ ] Test UGC flows trên TestFlight (xem [APP-STORE-QA-RUNSHEET.md](./APP-STORE-QA-RUNSHEET.md))

### Monetization
- [x] Không hiện copy mua credits / Premium / rewarded ads nếu chưa có IAP
- [ ] Xác nhận không có nút thanh toán ẩn trong build release

---

## 7. QA trên thiết bị thật

Tick theo [APP-STORE-QA-RUNSHEET.md](./APP-STORE-QA-RUNSHEET.md). Tóm tắt P0:

### Auth
- [ ] App launch không cần local backend
- [ ] Sign up / login / logout OK
- [ ] Sai password → lỗi thân thiện

### Pet & AI
- [ ] Tạo pet, upload avatar
- [ ] Wellness check end-to-end
- [ ] Breed recognition end-to-end

### Pet Feed
- [ ] Search / filter / listing detail
- [ ] Report listing + contact confirmation

### Breeder
- [ ] Breeder detail, report, block
- [ ] Blocked content biến mất sau refresh

### Account deletion
- [ ] Delete account hoàn tất
- [ ] Account đã xóa không login lại được

### Layout & idle
- [ ] iPhone nhỏ + iPhone lớn OK
- [ ] Sau 15+ phút idle, app vẫn login / gọi API được

---

## 8. App Store Connect metadata

- [ ] App record tạo trên App Store Connect
- [ ] Bundle ID khớp `com.pethealthcare.app`
- [ ] Version: `1.0.0` (hoặc version đang release)
- [ ] Category: Health & Fitness (+ Lifestyle nếu dùng)
- [ ] Age rating questionnaire hoàn thành (UGC + health guidance)
- [ ] App description — không claim chẩn đoán / kê đơn
- [ ] Subtitle + keywords
- [ ] Screenshots iPhone (sizes Apple yêu cầu)
- [ ] App Preview video (optional)
- [ ] Support URL + Privacy Policy URL điền đúng
- [ ] Privacy Nutrition Labels khớp data thật (email, user content, photos, pet wellness, identifiers, diagnostics nếu có)
- [ ] Export compliance: không dùng non-exempt encryption

**Copy draft:** [APP-STORE-SUBMISSION-PACKET.md](./APP-STORE-SUBMISSION-PACKET.md)

---

## 9. App Review Information

Điền trong App Store Connect trước khi submit.

### Reviewer accounts
- [ ] Sen reviewer: `________________` / `________________`
- [ ] Admin reviewer (nếu cần): `________________` / `________________`
- [ ] Đã login thử account trên TestFlight build đang submit

### Review notes (gợi ý nội dung)
- [ ] Ghi app chỉ cung cấp **informational wellness guidance**, không chẩn đoán / điều trị
- [ ] Ghi path xóa account: **Account → Delete account**
- [ ] Ghi UGC controls: report listing, report breeder, hide/block breeder
- [ ] Ghi backend URL production
- [ ] Nếu vẫn Render Free: ghi *first launch may take 15–30s after idle*
- [ ] Support email: `cattieshealthcare@gmail.com`

### Suggested reviewer flow
1. [ ] Đã ghi trong notes: create account hoặc dùng test account
2. [ ] Create pet profile
3. [ ] Run wellness check hoặc breed recognition
4. [ ] Test Pet Feed report / block
5. [ ] Verify legal links + account deletion

---

## 10. Submit for Review

- [ ] Chọn đúng TestFlight / production build trên App Store Connect
- [ ] Metadata + privacy labels + screenshots đầy đủ
- [ ] Submit:
  ```bash
  cd pet-health-frontend
  eas submit --platform ios --profile production
  ```
  hoặc submit thủ công trên App Store Connect
- [ ] Trạng thái: **Waiting for Review** / **In Review**
- [ ] UptimeRobot vẫn chạy trong suốt thời gian review
- [ ] Không đổi backend URL / env giữa chừng khi đang review

---

## 11. Nếu bị reject

- [ ] Đọc message trong Resolution Center (ghi guideline number: `____`)
- [ ] Phân loại: **Metadata rejected** hay **Binary rejected**
- [ ] Sửa đúng điểm Apple nêu (không sửa lan man)
- [ ] Metadata only → sửa Connect, submit lại (có thể cùng build)
- [ ] Binary → fix code → build mới → submit lại
- [ ] Reply Resolution Center kèm screenshot / video nếu cần
- [ ] Cập nhật checklist này với lesson learned

**Lưu ý:** Reject **không mất phí submit thêm**. Membership $99/năm vẫn giữ.

---

## 12. Sau khi approved

- [ ] App status = **Ready for Sale** hoặc đã schedule release
- [ ] Kiểm tra listing trên App Store (tên, mô tả, link support)
- [ ] Theo dõi crash / review đầu tiên từ user
- [ ] Giữ backend uptime monitor
- [ ] Ghi lại build number + version đã release: `________`

---

## Quick commands

```bash
cd pet-health-frontend

# Full pre-release gate
yarn release:check

# Individual checks
yarn typecheck
yarn test
yarn release:verify:public-links
yarn release:verify:backend
yarn release:smoke:native

# Build & submit
yarn build:ios:production
eas submit --platform ios --profile production
```

---

## Đã hoàn thành trong codebase (không cần implement lại)

- Account deletion (`DELETE /auth/me`)
- Legal links từ Login + Account
- UGC report / block breeder
- iOS bundle ID, encryption flag, photo permission string
- EAS production + iOS submit config
- Release verification scripts

---

Last updated: 2026-06-17
