# Pet Feed deep links (Universal Links / App Links)

Share URL format:

`https://vinhnguyen080597.github.io/PETHEALTHCARE/app/pet-feed/posts/{postId}/`

## Runtime behavior

1. **App installed + Universal/App Link verified** → iOS/Android opens Pet Health Care on that listing.
2. **App installed but link opens browser** → landing page (`/app/pet-feed/post/`) tries `pethealthcare://…` then falls back to the store.
3. **App not installed** → landing page / Smart App Banner sends the user to App Store or Play Store.

## Before production

1. Set store env vars in the Expo app:
   - `EXPO_PUBLIC_IOS_APP_STORE_URL`
   - `EXPO_PUBLIC_IOS_APP_STORE_ID` (numeric id for Smart App Banner)
   - `EXPO_PUBLIC_ANDROID_PLAY_STORE_URL`
2. Replace `APPLE_TEAM_ID` in `apple-app-site-association`.
3. Replace `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` in `assetlinks.json` with Play App Signing cert fingerprint(s).
4. Deploy `docs/` to GitHub Pages.
5. For GitHub project pages, Apple/Google fetch `/.well-known/*` from the **domain root** (`vinhnguyen080597.github.io`), not only `/PETHEALTHCARE/`. Prefer a custom domain, or also host these files on the user/org Pages root.
6. Ship a new native build so `associatedDomains` / `intentFilters` from `app.config.js` are included.
