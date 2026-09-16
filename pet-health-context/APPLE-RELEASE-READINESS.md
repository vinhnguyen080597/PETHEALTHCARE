# Apple Release Readiness Notes

Date: 2026-09-13

This file tracks frontend and product requirements before submitting **PetCare: Pet Marketplace** `1.1.3` to Apple App Review.

Previous public submission: Pet Health Care `1.0.0` (build 18), Waiting for Review as of 2026-06-17. See [APP-STORE-CONNECT-SUBMISSION-RECORD.md](./APP-STORE-CONNECT-SUBMISSION-RECORD.md).

## Current Conclusion

Do **not** tap Submit for Review yet. Code/config gates are mostly ready. Remaining blockers are operational and App Store Connect metadata:

1. Deploy the legal/support web fixes to `https://pet-marketplace.org` (public `/support` page + EN Accept-Language).
2. Operator fields filled from GCN ĐKKD (name, MST, address, legal representative). Deploy web so live Privacy/ToS show them.
3. Fill Apple Team ID in AASA before relying on Universal Links.
4. Update App Store Connect: name, screenshots, description, privacy labels, age rating (Messaging = Yes).
5. Create/verify reviewer accounts and run TestFlight QA on a real iPhone.
6. Then `yarn build:ios:production` and submit.

Working packet: [APP-STORE-RELEASE-1.1.3.md](./APP-STORE-RELEASE-1.1.3.md).

## What is already done in code

- Account deletion in Account.
- Legal links on Login + Account (Privacy, Terms, Marketplace Guidelines, Support).
- UGC report listing, report breeder, hide/block breeder, admin moderation.
- `ios.bundleIdentifier` = `com.pethealthcare.app`
- `ios.supportsTablet` = `false`
- `ITSAppUsesNonExemptEncryption` = `false`
- Photo library purpose string
- Production API fallback is HTTPS (no LAN fallback in release)
- Ads / IAP hidden (`RELEASE_MONETIZATION_ENABLED = false`)
- Health UI avoids diagnosis/treatment labels; disclaimer + urgent warning present
- Brand icon/splash = `PetMarketAvatar.png`
- EAS production profile + `ascAppId` `6778684107`
- `yarn lint`, `yarn typecheck`, `yarn test`, `npx expo-doctor` pass on 2026-09-13
- Production backend `/health` and `/health/ready?deep=1` ready

## Still open

- [ ] Deploy `pet-health-web` so `/support` is a public contact page (not only a hub redirect)
- [ ] `yarn release:verify:public-links` pass against production
- [ ] Operator copy complete from GCN ĐKKD — deploy web
- [ ] Apple Team ID in `apple-app-site-association` (replace `TEAMID`)
- [ ] EAS production env: `EXPO_PUBLIC_API_ORIGIN`, legal URLs, `EXPO_PUBLIC_SITE_ORIGIN`, Supabase anon
- [ ] App Store Connect name/subtitle/screenshots/privacy/age rating for marketplace + chat
- [ ] Reviewer Sen (+ admin) accounts
- [ ] TestFlight install + [APP-STORE-QA-RUNSHEET.md](./APP-STORE-QA-RUNSHEET.md)
- [ ] Keep backend warm during review


