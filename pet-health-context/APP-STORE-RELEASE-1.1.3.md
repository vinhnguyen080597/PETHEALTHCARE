# App Store Release Packet — PetCare: Pet Marketplace 1.1.3

Last updated: 2026-09-13

Use this file as the source of truth for the **current** iOS submission. Historical v1.0.0 Connect selections stay in [APP-STORE-CONNECT-SUBMISSION-RECORD.md](./APP-STORE-CONNECT-SUBMISSION-RECORD.md).

## App identity

| Field | Value |
|-------|--------|
| Store / display name | PetCare: Pet Marketplace (home screen: **PetCare**) |
| Version | `1.1.3` |
| Bundle ID | `com.pethealthcare.app` |
| ASC App ID | `6778684107` |
| EAS project | `657583fb-c196-40dc-884d-9db95f5be282` |
| Owner | `cattieshouse` |
| API | `https://pet-health-backend-serb.onrender.com` |
| Site | `https://pet-marketplace.org` |
| Monetization | Off (no AdMob, no IAP) |

## Public URLs for App Store Connect

Use no trailing slash. English is forced with `?lang=EN` or `Accept-Language: en`.

| Field | URL |
|-------|-----|
| Privacy Policy | `https://pet-marketplace.org/privacy-policy` |
| Privacy (EN) | `https://pet-marketplace.org/privacy-policy?lang=EN` |
| Terms | `https://pet-marketplace.org/terms-of-service` |
| Guidelines | `https://pet-marketplace.org/marketplace-guidelines` |
| Support | `https://pet-marketplace.org/support` |
| Support Hub | `https://pet-marketplace.org/app/support` |
| Marketing | `https://pet-marketplace.org` |

**Do not** reuse the old GitHub Pages URLs (`vinhnguyen080597.github.io/PETHEALTHCARE/...`).

## App description draft (EN)

PetCare: Pet Marketplace helps pet owners find dogs and cats from breeders, keep pet profiles and care reminders, and use AI-assisted wellness observations and breed recognition.

Browse approved listings and farm profiles, chat in-app, and use report / hide controls when content looks unsafe. PetCare is a classified marketplace: we are not the seller, we do not hold pet-sale payments, and we do not ship pets. Buyers should verify the animal and documents in person before transferring money.

AI wellness tools summarize visible signs and care context. They do not diagnose, treat, prescribe medication, or replace a licensed veterinarian. If a pet has urgent symptoms, contact a veterinarian or emergency clinic immediately.

## App description draft (VI)

PetCare: Pet Marketplace giúp Sen tìm chó/mèo từ trại, lưu hồ sơ thú cưng, nhắc lịch chăm sóc, và dùng AI hỗ trợ quan sát sức khỏe / nhận diện giống.

Duyệt tin đã duyệt, xem hồ sơ trại, chat trong app, và dùng báo cáo / ẩn khi nội dung không an toàn. PetCare là sàn đăng tin: không phải người bán, không giữ tiền mua thú, không vận chuyển thú. Sen nên kiểm tra bé và giấy tờ trực tiếp trước khi chuyển tiền.

Công cụ AI chỉ tóm tắt dấu hiệu quan sát được — không chẩn đoán, không điều trị, không kê thuốc, không thay thế bác sĩ thú y. Nếu thú cưng có dấu hiệu cấp cứu, hãy liên hệ phòng khám ngay.

## Subtitle + keywords

- Subtitle (30 chars): `Find pets. Care with peace.`
- Keywords: `pet marketplace,breeder,dog,cat,pet care,wellness,breed,pet feed,puppy,kitten`

## Review notes draft

PetCare: Pet Marketplace is a classified pet marketplace plus informational pet-wellness tools. The app does not diagnose, treat, prescribe medication, or replace a licensed veterinarian. We are not the seller and do not hold pet-sale payments.

Account deletion: Account → Delete account.

UGC safety:
- Report listings
- Report breeder profiles
- Hide/block breeders
- In-app chat between Sen and farms
- Admin moderation can archive listings and suspend breeders

Suggested reviewer flow:
1. Create an account or use the provided Sen test account.
2. Create a pet profile and upload a photo.
3. Run a wellness check or breed recognition.
4. Open Pet Feed, open a listing, test report and contact confirmation.
5. Open Messages / farm chat if a conversation exists.
6. Open Account and verify Privacy / Terms / Support plus Delete account.

Production backend: `https://pet-health-backend-serb.onrender.com`
Readiness: `https://pet-health-backend-serb.onrender.com/health/ready?deep=1`
First launch after idle may take 15–30 seconds if the backend was sleeping.

Support: `support@pet-marketplace.org` / `contact@pet-marketplace.org`

## Privacy Nutrition Labels — UPDATE from v1.0.0

v1.0.0 did **not** declare Name, Phone, Location, or Messages. The marketplace now collects those. Update App Privacy before submit.

| Data type | Collect? | Linked to identity? | Tracking? | Purpose |
|-----------|----------|---------------------|-----------|---------|
| Email Address | Yes | Yes | No | App Functionality |
| Name | Yes (display name) | Yes | No | App Functionality |
| Phone Number | Yes (if user adds it) | Yes | No | App Functionality |
| Physical Address / Location | Yes if used on listings or contact | Yes | No | App Functionality |
| Photos or Videos | Yes | Yes | No | App Functionality |
| Other User Content | Yes (listings, farm profiles, reports) | Yes | No | App Functionality |
| Other User Content / Messages | Yes (in-app chat) | Yes | No | App Functionality |
| Health | Yes (pet wellness context — animal, not human) | Yes | No | App Functionality |
| User ID | Yes | Yes | No | App Functionality |
| Product Interaction | Yes | Yes | No | App Functionality |
| Other Diagnostic Data | Yes if backend/host logs errors | Yes | No | App Functionality |

Do **not** claim advertising, tracking, or selling data. Ads/IAP are off.

## Age rating — UPDATE from v1.0.0

v1.0.0 set Messaging and Chat = **No**. In-app farm chat now exists. Set:

| Question | Answer |
|----------|--------|
| User-Generated Content | Yes |
| Messaging and Chat | **Yes** |
| Unrestricted Web Access | No |
| Advertising | No |
| Health or Wellness Topics | Yes |
| Medical or Treatment Information | None |
| Made for Kids | No |

Expected rating may rise above 9+ because of messaging + UGC. Accept the calculated rating.

## Screenshots (iPhone only)

`supportsTablet=false` — no iPad shots.

Capture from a production/TestFlight build (not Expo Go):

1. Login / brand intro
2. Home with pet cards
3. Health Check intake + urgent warning
4. Results with disclaimer (no diagnosis/treatment labels)
5. Pet Feed listings
6. Listing detail + report / contact
7. Breeder / farm detail
8. Messages / chat
9. Account with legal links + Delete account

Sizes: 6.1" and 6.5" (or current required slots in Connect).

## Go / No-Go before Submit

- [ ] `pet-health-web` production deploy includes public `/support` + `?lang=EN`
- [ ] `yarn release:check` pass in `pet-health-frontend`
- [ ] Operator placeholders removed from Privacy Policy
- [ ] Connect privacy labels + age rating updated
- [ ] New screenshots match 1.1.3 UI
- [ ] Reviewer accounts work on production
- [ ] TestFlight QA pass ([APP-STORE-QA-RUNSHEET.md](./APP-STORE-QA-RUNSHEET.md))
- [ ] Backend monitor up; do not change API URL during review

## Commands

```bash
cd pet-health-frontend
yarn release:check
yarn release:smoke:native
yarn build:ios:production
yarn submit:ios:production
```
