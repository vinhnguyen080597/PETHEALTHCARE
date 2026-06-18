# App Store / TestFlight Packet

Last updated: 2026-06-17

**v1.0.0 (build 18) submitted for App Review on Jun 17, 2026 — Waiting for Review.**

Actual Connect selections: [APP-STORE-CONNECT-SUBMISSION-RECORD.md](./APP-STORE-CONNECT-SUBMISSION-RECORD.md)

## App Identity

- App name: Pet Health Care
- Bundle ID: `com.pethealthcare.app`
- SKU suggestion: `pet-health-care-ios`
- Primary category suggestion: Health & Fitness
- Secondary category suggestion: Lifestyle
- Support URL: `https://vinhnguyen080597.github.io/PETHEALTHCARE/support/`
- Privacy Policy URL: `https://vinhnguyen080597.github.io/PETHEALTHCARE/privacy-policy/`
- Terms URL: `https://vinhnguyen080597.github.io/PETHEALTHCARE/terms-of-service/`

## Short Description

Pet Health Care helps pet owners manage pet profiles, care records, reminders, AI-assisted wellness observations, breed recognition, and trusted Pet Feed breeder listings.

## App Description Draft

Pet Health Care is a pet care companion for owners who want one place to organize pet profiles, care history, reminders, AI-assisted wellness observations, breed recognition, and Pet Feed listings.

Create profiles for your pets, record care notes, review reminders, upload photos for wellness screening or breed recognition, and keep a history you can revisit later. Pet Health Care uses AI to help summarize visible signs and care context, but it does not diagnose, treat, prescribe medication, or replace a licensed veterinarian.

Pet Feed helps users browse approved listings and breeder profiles. Community content includes reporting, moderation, and hide/block controls so users can avoid unsafe or misleading breeder content.

If your pet has urgent symptoms or may be in danger, contact a veterinarian or emergency clinic immediately.

## Keywords Draft

pet health, pet care, dog, cat, wellness, pet profile, reminder, breeder, pet feed, breed recognition

## Future App Review Notes Draft

Pet Health Care provides informational pet wellness support only. The app does not diagnose, treat, prescribe medication, or replace care from a licensed veterinarian.

Account deletion is available in the app from Account > Delete Account.

UGC safety controls are available in Pet Feed:
- Users can report listings.
- Users can report breeder profiles.
- Users can hide/block breeders.
- Admin moderation can archive listings and suspend breeders.

Suggested reviewer flow:
1. Create a new account or use the provided test account.
2. Create a pet profile.
3. Run a health check or breed recognition using a pet photo.
4. Open Pet Feed and test listing report/hide breeder controls.
5. Open Account and verify legal links plus account deletion.

Test credentials to provide in App Review notes:
- Sen user: `<provide email/login>` / `<provide password>`
- Admin user, if needed for moderation review: `<provide email/login>` / `<provide password>`

Production backend:
- API origin: `https://pet-health-backend-serb.onrender.com`
- Readiness: `https://pet-health-backend-serb.onrender.com/health/ready?deep=1`

## Privacy Nutrition Label Draft

Data types likely collected:
- Contact Info: email address.
- User Content: pet profiles, care notes, photos, videos, Pet Feed listings, breeder profile content, support messages.
- Health and Fitness: pet wellness context, symptoms, care history, AI-assisted results.
- Identifiers: user ID/account ID.
- Usage Data: app activity and feature usage needed for operation, moderation, troubleshooting, and AI credit accounting.
- Diagnostics: error details and technical logs if collected by backend/hosting.

Use purposes:
- App Functionality.
- User Support.
- Safety and moderation.
- Analytics/diagnostics, only if actually enabled in production.

Do not claim:
- Selling user data.
- Third-party advertising tracking.
- Cross-app tracking.

## Age Rating Notes

Consider factors:
- User-generated content in Pet Feed and breeder profiles.
- External contact links/phone links for breeder contact.
- Health and wellness guidance for pets.
- No in-app gambling, no unrestricted web browser, no human medical advice.

## Screenshot Shot List

Required iPhone screenshots should highlight:
1. Login / app intro.
2. Home with pet profile cards.
3. Health Check intake with urgent warning.
4. Results screen with disclaimer and safe AI wording.
5. Pet profile/history or Core Care timeline.
6. Pet Feed with search/filter drawer.
7. Top Breeder or Breeder Detail trust information.
8. Account screen with legal/support/delete account controls.

Tablet screenshots are not required for the first release because `ios.supportsTablet=false`.

## Internal TestFlight Go / No-Go Items

- EAS production env uses stable HTTPS backend, not ngrok.
- `/health/ready?deep=1` returns ready.
- TestFlight build passes real-device smoke test.
- Owner/tester credentials are created and verified.
- Render backend is upgraded to a non-sleeping plan before any later public App Review submission.
- Reviewer credentials and screenshots can be finalized later before public submission.
