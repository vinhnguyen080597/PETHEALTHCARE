# App Store Connect — Submission Record (v1.0.0 build 18)

Ghi lại các lựa chọn đã điền trên App Store Connect khi submit App Review lần đầu.

**Related:**
- [APP-STORE-SUBMISSION-PACKET.md](./APP-STORE-SUBMISSION-PACKET.md)
- [APP-STORE-RELEASE-CHECKLIST.md](./APP-STORE-RELEASE-CHECKLIST.md)

---

## Submission status

| Field | Value |
|-------|--------|
| App name | Pet Health Care (ed13a7) |
| Version | 1.0.0 |
| Build | 18 |
| Bundle ID | `com.pethealthcare.app` |
| ASC App ID | `6778684107` |
| Submitted at | Jun 17, 2026, 11:20 PM (local) |
| Submitted by | Vinh Nguyen |
| Submission ID | `1cac9aaf-16e1-4044-8012-611948729952` |
| Review status | **Waiting for Review** |
| Release mode | Automatically release this version (after approval) |

---

## App Information

| Field | Selection |
|-------|-----------|
| Primary category | Health & Fitness |
| Secondary category | Lifestyle (if set) |
| Content Rights | **Yes** — app contains/shows/accesses third-party content, and we have the necessary rights (UGC: Pet Feed, user photos, breeder listings; covered by Terms of Service) |
| Regulated Medical Device | **No** — app is not a regulated medical device in any country or region |

---

## Pricing and Availability

| Field | Selection |
|-------|-----------|
| Base country / region | United States (USD) |
| Price | **$0.00 (Free)** |
| Countries | All available (default after Free tier setup) |

---

## App Privacy (Privacy Nutrition Label)

### Data collection

| Question | Answer |
|----------|--------|
| Do you or your third-party partners collect data from this app? | **Yes** |

### Data types selected

| Data type | Selected |
|-----------|----------|
| Email Address | Yes |
| Health | Yes |
| Photos or Videos | Yes |
| Other User Content | Yes |
| User ID | Yes |
| Product Interaction | Yes |
| Other Diagnostic Data | Yes |

**Not selected:** Name, Phone Number, Location, Financial Info, Contacts, Browsing History, Device ID, Advertising Data, Purchases, Sensitive Info, Fitness, and other categories.

### Per data type — usage, linking, tracking

For **all selected data types** above:

| Question | Answer |
|----------|--------|
| Purposes | **App Functionality** only |
| Third-Party Advertising | No |
| Developer's Advertising or Marketing | No |
| Analytics | No |
| Product Personalization | No |
| Other Purposes | No |
| Linked to user identity? | **Yes** |
| Used for tracking? | **No** |

### Privacy Policy URL

```
https://vinhnguyen080597.github.io/PETHEALTHCARE/privacy-policy/
```

---

## Age Ratings (calculated: **9+**)

### Step 1 — Features

| Question | Answer |
|----------|--------|
| Parental Controls | No |
| Age Assurance | No |
| Unrestricted Web Access | No |
| User-Generated Content | **Yes** |
| Messaging and Chat | **No** |
| Advertising | **No** |

### Step 2 — Mature Themes

| Theme | Frequency |
|-------|-----------|
| Profanity or Crude Humor | **None** |
| Horror/Fear Themes | **None** |
| Alcohol, Tobacco, or Drug Use or References | **None** |

### Step 3 — Medical or Wellness

| Question | Answer |
|----------|--------|
| Medical or Treatment Information | **None** |
| Health or Wellness Topics | **Yes** |

### Step 4–5 — Violence / Sexual content

| Category | Frequency |
|----------|-----------|
| All violence / sexual content questions | **None** |

### Step 6 — Chance-Based Activities

| Question | Answer |
|----------|--------|
| Simulated Gambling | **None** |
| Contests | **None** |
| Gambling (real money) | **No** |
| Loot Boxes | **No** |

### Step 7 — Additional Information

| Field | Selection |
|-------|-----------|
| Calculated rating | **9+** |
| Age Categories and Override | **Not Applicable** |
| Made for Kids | No |
| Override to Higher Age Rating | No |
| Age Suitability URL | (left blank) |

---

## Screenshots and media

| Display size | Status | Notes |
|--------------|--------|-------|
| iPhone 6.1" | Uploaded (up to 10) | Captured from physical device / original size `1179×2556` |
| iPhone 6.5" | Uploaded | Resized from 6.1" screenshots to `1284×2778` for App Store requirement |
| iPhone 6.3" | Not required for submit | Optional slot; 6.5" satisfied the blocker |
| App Previews (video) | None | Optional — not uploaded |
| iPad | Not required | `ios.supportsTablet=false` |

---

## Build and binary

| Field | Value |
|-------|--------|
| EAS submit | `eas submit --platform ios --profile production` |
| Build selected on Connect | 1.0.0 (18) |
| Export compliance | No non-exempt encryption (`ITSAppUsesNonExemptEncryption: false`) |

---

## App Review Information

| Field | Value |
|-------|--------|
| Sign-in required | Yes |
| Reviewer credentials | Provided in Connect (verify account works on production before review) |
| Contact name | Vinh Nguyen Trung |
| Contact email | `cattieshealthcare@gmail.com` |
| Attachment | None (optional — left blank) |

### Review notes themes (submitted or intended)

- App provides **informational pet wellness guidance only** — not diagnosis, treatment, or prescriptions.
- Account deletion: **Account → Delete account**.
- UGC safety: report listings, report breeder profiles, hide/block breeders, admin moderation.
- Production backend: `https://pet-health-backend-serb.onrender.com`
- First launch after idle may take **15–30 seconds** (Render cold start).
- Support: `cattieshealthcare@gmail.com`

---

## Public URLs (metadata)

| Field | URL |
|-------|-----|
| Privacy Policy | `https://vinhnguyen080597.github.io/PETHEALTHCARE/privacy-policy/` |
| Terms of Service | `https://vinhnguyen080597.github.io/PETHEALTHCARE/terms-of-service/` |
| Support | `https://vinhnguyen080597.github.io/PETHEALTHCARE/support/` |
| Legal Center | `https://vinhnguyen080597.github.io/PETHEALTHCARE/` |

---

## Operations during review

- [x] UptimeRobot pinging `/health` every 5 minutes
- [ ] Do not change production backend URL or EAS env during review
- [ ] Do not delete or change reviewer test account during review
- [ ] Monitor email from Apple (Resolution Center)

---

## If Apple rejects — quick reference

| Rejection area | Likely fix |
|----------------|------------|
| Privacy label mismatch | Update App Privacy to match actual data use |
| Health / medical claims | Clarify Review Notes + UI disclaimers |
| UGC safety | Demo report/block flows; confirm moderation |
| Login / backend timeout | Warm backend; upgrade Render plan; update Review Notes |
| Screenshot mismatch | Update screenshots to match current UI |

---

Last updated: 2026-06-17
