# Pet Feed deep links (Universal Links)

Share URL format:

`https://pet-marketplace.org/app/pet-feed/posts/{postId}/`

## Current release scope

**iOS / App Store only.** Google Play steps are deferred.

## Custom domain setup (`pet-marketplace.org`)

1. GitHub → repo **Settings → Pages → Custom domain** → `pet-marketplace.org` → Save (also add `www.pet-marketplace.org` if you use www).
2. At your DNS provider, add GitHub Pages records:

   **Apex (`pet-marketplace.org`)** — A records to:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

   **Optional www** — CNAME `www` → `vinhnguyen080597.github.io`

3. Wait for DNS + GitHub **Enforce HTTPS** (can take minutes to hours).
4. Verify:
   - `https://pet-marketplace.org/`
   - `https://pet-marketplace.org/.well-known/apple-app-site-association`
   - `https://pet-marketplace.org/app/pet-feed/post/?id=test`

5. Ship a new **iOS** native build so `associatedDomains` includes `applinks:pet-marketplace.org`.

## Runtime behavior

1. App installed + Universal Link verified → open listing in app.
2. Else landing tries `pethealthcare://` → App Store fallback.
3. Android visitors → iOS-only message (no Play redirect).

## Already configured in repo

- Team ID: `474UAP77X3`
- App Store ID: `6778684107`
- `docs/CNAME` → `pet-marketplace.org`
- AASA paths: `/app/pet-feed/*`
