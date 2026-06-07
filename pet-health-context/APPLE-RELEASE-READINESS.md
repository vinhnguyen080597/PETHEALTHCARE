# Apple Release Readiness Notes

Date: 2026-06-06

This file tracks the frontend and product requirements to address before submitting Pet Health Care to Apple App Review.

## Current Conclusion

Do not submit to Apple yet. The app has good foundations, but several App Review blockers remain around account deletion, UGC safety, privacy links, iOS build configuration, and health/AI wording.

## Priority 0 - Likely App Review Blockers

### 1. In-App Account Deletion

Apple requires apps that allow account creation to also let users initiate account deletion inside the app.

Current state:
- App supports signup/login.
- Account page currently supports logout.
- No visible delete account flow was found in the frontend.

Required work:
- Add "Delete account" in Account/Profile settings.
- Explain what data will be deleted and expected timeline.
- Add confirmation flow.
- Add backend API for account/data deletion if not already available.
- If Sign in with Apple is enabled in production, revoke Apple tokens when deleting account.

### 2. Privacy Policy, Terms, and Support Links

Apple requires a privacy policy in App Store Connect metadata and easily accessible in the app.

Current state:
- Login footer says users agree to Terms and Privacy Policy.
- The text is not clickable.
- No visible support/contact policy page was found in the app.

Required work:
- Add clickable Privacy Policy link.
- Add clickable Terms of Service link.
- Add Support/Contact link, ideally visible from Login and Account.
- Prepare public web URLs for these documents.

### 3. UGC Safety - Block User/Breeder

UGC means user-generated content, such as breeder profiles, Pet Feed posts, images, videos, descriptions, price notes, and contact info.

Apple requires UGC apps to include:
- Filtering objectionable content.
- Reporting content.
- Timely moderation.
- Ability to block abusive users.
- Published contact information.

Current state:
- Pet Feed posts can be reported.
- Breeder posts go through pending/admin review.
- Admin can review reports.
- No user-facing block breeder/user flow was found.

Required work:
- Add "Block breeder" or "Hide breeder" on breeder profile/detail and listing detail.
- Persist blocked breeders/users.
- Filter blocked breeders/posts out of Pet Feed and Top Breeder.
- Add unblock management in Account.

### 4. UGC Safety - Report Breeder Profile

Current state:
- Listings can be reported.
- Breeder profile/detail content cannot be reported directly.

Required work:
- Add "Report breeder profile" on Breeder Detail page.
- Let users choose reasons such as scam, misleading health claims, abusive content, fake contact, unsafe transaction.
- Send profile reports to admin moderation.
- Admin should be able to review the profile and suspend/reject breeder if needed.

### 5. iOS Permission Purpose Strings

The app uses image/video picker flows for:
- Pet avatar.
- Health check photos/videos.
- Breed recognition photos.
- Pet Feed post photos/videos.

Current state:
- `app.json` does not define custom iOS `infoPlist` purpose strings.

Required work:
- Add `NSPhotoLibraryUsageDescription`.
- Consider `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` if camera/video capture is enabled now or later.
- Make the text specific: photos/videos are used for pet profiles, wellness screening, breed recognition, and Pet Feed listings.
- Rebuild native iOS binary after changing these strings.

### 6. iOS Bundle and Build Configuration

Current state:
- `app.json` lacks a stable `ios.bundleIdentifier`.
- `app.json` lacks `ios.buildNumber`.
- No `eas.json` was found.
- `src/config.ts` falls back to local HTTP LAN backend.

Required work:
- Add production bundle identifier, for example `com.pethealthcare.app` or another final identifier.
- Add `ios.buildNumber`.
- Add EAS build/submit profiles.
- Ensure production builds use HTTPS backend via `EXPO_PUBLIC_API_ORIGIN`.
- Prevent release builds from falling back to `http://192.168.1.4:3000`.
- Ensure no internal admin secret is bundled into production.

## Priority 1 - High Risk Before Submission

### 7. App Icon and Splash Assets

Current state:
- `assets/icon.png`, `splash-icon.png`, and `adaptive-icon.png` still look like default Expo placeholder/grid assets.

Required work:
- Replace with polished Pet Health Care branded assets.
- Prepare App Store icon at required quality.
- Verify splash screen looks good on iPhone and iPad if tablet support remains enabled.

### 8. iPad Support Decision

Current state:
- `ios.supportsTablet` is `true`.

Risk:
- Apple may review on iPad.
- Layout has not had a full responsive audit yet.

Required work:
- Either test and support iPad properly, or consider setting tablet support based on release strategy.
- If keeping iPad support, test Login, Home, Pet Feed, Account, Breeder Detail, Health Check, Results, and forms on iPad sizes.

### 9. Health/AI Wording - Legacy Diagnosis Fields

Current state:
- Some saved check surfaces may still display legacy fields named `diagnosis` or `treatment`.
- Main Result screen uses safer labels like "Possible finding" and "Care guidance", but falls back to legacy fields.

Risk:
- Apple may interpret the app as providing diagnosis/treatment.

Required work:
- Avoid showing `diagnosis` and `treatment` labels anywhere in the UI.
- Rename display labels to "Possible finding", "Observed signs", "Care guidance", or equivalent Vietnamese wording.
- Audit History, Pet Profile, Core Care, Vet Summary, and Results.

### 10. Health/AI Disclaimer Placement

Current state:
- Results screen includes disclaimer, but it appears after AI output.

Required work:
- Move or duplicate disclaimer near the top of Results before the main finding.
- Add a clear warning on Health Check intake: do not wait for AI if symptoms are urgent.
- Keep emergency copy strong and visible.

### 11. AI Output Guardrails

Current state:
- Frontend trusts `care_guidance` / legacy `treatment` text from backend.
- Types include safety flags, but UI does not visibly suppress unsafe output.

Required work:
- If backend returns definitive diagnosis, medication dosage, or unsafe medical instruction, show a safe fallback message.
- Add frontend guardrails for fields such as `is_definitive_diagnosis` and `contains_medication_dosage` if present.
- Prefer "contact a veterinarian" guidance for high-risk or unsafe outputs.

### 12. Report UX and Moderation Actions

Current state:
- Report action exists but uses a fixed reason and is mostly available from detail view.
- Admin report items can be marked reviewed/dismissed, but report cards do not directly expose archive/suspend actions.

Required work:
- Add report reason picker and optional note.
- Make report action easy to find.
- In admin report queue, show enough content context to moderate.
- Add quick actions: archive listing, suspend breeder, mark reviewed, dismiss.

### 13. User-Controlled External Contact Links

Current state:
- Breeder/listing contact fields can open Facebook, Zalo, or phone links.

Risk:
- UGC contact links can be misleading or unsafe.

Required work:
- Validate URL formats where possible.
- Consider a safety confirmation before opening external contact links.
- Add copy that Pet Health Care does not handle payments and users should verify breeder identity.

### 14. Credits, Top-Up, Subscription, Rewarded Ads Copy

Current state:
- UI copy references buying credits, Premium quota, and watching ads.

Risk:
- If digital credits/subscriptions are sold, Apple requires In-App Purchase.
- If not implemented, this copy can confuse review.

Required work:
- Hide or reword monetization prompts for initial release unless IAP/rewarded ads are fully implemented.
- Avoid "Mua credits" / "Premium" release copy if no IAP exists.

## Priority 2 - Polish and Operational Readiness

### 15. Production API and Backend Availability

Required work:
- Confirm Render/Supabase production backend is stable.
- Confirm App Store reviewer can create account and use demo flow.
- Provide review credentials if needed.
- Ensure backend does not require local tunnel/ngrok.

### 16. App Store Metadata

Required work:
- Prepare privacy policy URL.
- Prepare support URL.
- Prepare marketing URL if available.
- Prepare app description that avoids diagnosis/treatment claims.
- Set age rating appropriately for UGC and health guidance.
- Prepare screenshots for iPhone, and iPad if `supportsTablet` remains true.

### 17. Sign in with Apple Strategy

Current state:
- `usesAppleSignIn` and plugin are configured.
- Social sign-in UI is currently commented out.

Required work:
- If only email/custom login is released, Apple Sign In is not necessarily required.
- If Google or other third-party login is enabled later, Sign in with Apple must also be visible and equivalent.
- If Sign in with Apple remains enabled in native config, verify App ID capability and backend OAuth flow.

### 18. Responsive Audit

Required work:
- Test small iPhone, large iPhone, and iPad if supported.
- Focus screens:
  - Login
  - Home
  - Pet Feed
  - Top Breeder
  - Breeder Detail
  - Account for Sen/Breeder/Admin
  - Breeder registration form
  - Create Pet Feed Post
  - Health Check
  - Results

## Suggested Implementation Order

1. Add iOS release config: bundle id, build number, EAS profiles, HTTPS production env, permission strings.
2. Replace icon/splash assets.
3. Add Privacy Policy, Terms, Support links.
4. Add account deletion flow.
5. Add UGC block breeder/user and report breeder profile.
6. Improve report UX and admin moderation actions.
7. Audit health/AI wording and remove diagnosis/treatment surfaces.
8. Add top-level health disclaimer and urgent warning.
9. Hide incomplete monetization/IAP copy.
10. Run responsive release audit.
11. Build TestFlight and test on real iPhone.
12. Prepare App Store metadata and reviewer notes.

## Release Readiness Checklist

- [ ] Production backend URL is HTTPS and configured in EAS.
- [ ] No release build can fall back to local LAN API.
- [ ] `ios.bundleIdentifier` is set.
- [ ] `ios.buildNumber` is set.
- [ ] `eas.json` has production build and submit profiles.
- [ ] iOS photo/video purpose strings are present and app-specific.
- [ ] App icon and splash are final branded assets.
- [ ] Privacy Policy link is accessible in app.
- [ ] Terms link is accessible in app.
- [ ] Support/contact link is accessible in app.
- [ ] Delete account is accessible in Account.
- [ ] Users can report Pet Feed listings.
- [ ] Users can report breeder profiles.
- [ ] Users can block/hide breeders.
- [ ] Admin can act on reports by removing content or suspending breeder.
- [ ] Health result UI avoids diagnosis/treatment wording.
- [ ] Disclaimer is visible before or near AI output.
- [ ] Health Check warns users not to wait for AI in urgent cases.
- [ ] Incomplete IAP/ad/credit purchase copy is hidden or fully implemented.
- [ ] iPhone small-screen smoke test passed.
- [ ] iPad smoke test passed, or tablet support disabled.
- [ ] TestFlight build installed and tested on real device.
