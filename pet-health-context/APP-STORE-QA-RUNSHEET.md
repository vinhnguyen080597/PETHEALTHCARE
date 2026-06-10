# App Store QA Runsheet

Use this runsheet for the release candidate installed from TestFlight or an EAS iOS build using production env.

## Environment

- Backend: `https://pet-health-backend-serb.onrender.com`
- Readiness check: `https://pet-health-backend-serb.onrender.com/health/ready?deep=1`
- Privacy Policy: `https://vinhnguyen080597.github.io/PETHEALTHCARE/privacy-policy/`
- Terms: `https://vinhnguyen080597.github.io/PETHEALTHCARE/terms-of-service/`
- Support: `https://vinhnguyen080597.github.io/PETHEALTHCARE/support/`

## Test Accounts

Record the accounts used for App Review:

- Sen reviewer account: `<email/login>` / `<password>`
- Admin reviewer account: `<email/login>` / `<password>`
- Breeder reviewer account, if needed: `<email/login>` / `<password>`

## Smoke Test Order

### 1. Launch And Auth

- [ ] App launches without local/ngrok dependency.
- [ ] Sign up with a new Sen account.
- [ ] Log out.
- [ ] Log back in.
- [ ] Wrong password shows a friendly error.

### 2. Legal And Support

- [ ] Login screen opens Terms.
- [ ] Login screen opens Privacy Policy.
- [ ] Login screen opens Support.
- [ ] Account screen opens Terms.
- [ ] Account screen opens Privacy Policy.
- [ ] Account screen opens Support.

### 3. Pet Profile

- [ ] Create a dog profile.
- [ ] Create a cat profile.
- [ ] Upload/change avatar.
- [ ] Edit pet details.
- [ ] Confirm pet list refreshes.

### 4. Health Check

- [ ] Health Check shows urgent warning before upload.
- [ ] Upload at least one photo.
- [ ] Start analysis.
- [ ] Progress screen appears.
- [ ] Results show disclaimer before AI output.
- [ ] Results do not use diagnosis/treatment labels.
- [ ] Open history/profile and confirm safe finding/severity text.

### 5. Breed Recognition

- [ ] Open breed recognition from pet profile or health flow.
- [ ] Upload required photos.
- [ ] Run recognition.
- [ ] Apply result to profile if confidence is acceptable.
- [ ] External source links require confirmation and use HTTPS.

### 6. Pet Feed

- [ ] Pet Feed opens.
- [ ] Search works.
- [ ] Filter drawer opens from icon next to search.
- [ ] Species filter works.
- [ ] Gender filter works.
- [ ] Age/price sort works.
- [ ] Listing detail opens.
- [ ] Report listing works with reason picker.
- [ ] Contact link requires confirmation.

### 7. Breeder Detail And Blocking

- [ ] Top Breeder opens.
- [ ] Breeder Detail opens.
- [ ] Report breeder profile works.
- [ ] Hide/block breeder works.
- [ ] Blocked breeder listings/profile disappear after refresh.

### 8. Breeder And Admin Flow

- [ ] Sen can submit breeder request.
- [ ] Pending breeder request disables duplicate registration.
- [ ] Admin account can open admin review.
- [ ] Admin can approve/reject/suspend breeder.
- [ ] Verified breeder can create a Pet Feed listing.
- [ ] Listing enters pending review.
- [ ] Admin can publish/archive listing.
- [ ] Admin can review/dismiss reports.

### 9. Account Deletion

- [ ] Account deletion is accessible from Account.
- [ ] Confirmation copy is clear.
- [ ] Delete account completes.
- [ ] Deleted account cannot log back in.
- [ ] User media/data is removed or no longer accessible.

### 10. Layout

- [ ] Small iPhone layout smoke test.
- [ ] Large iPhone layout smoke test.
- [ ] Tablet support remains disabled in config.

## Go / No-Go

- [ ] All P0 flows pass.
- [ ] Backend remains ready after idle period.
- [ ] No ngrok/local URLs in release build.
- [ ] Reviewer credentials are verified.
- [ ] Screenshots captured from final build.
