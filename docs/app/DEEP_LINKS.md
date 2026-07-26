# Pet Feed deep links (Universal Links)

Share URL format:

`https://vinhnguyen080597.github.io/PETHEALTHCARE/app/pet-feed/posts/{postId}/`

## Current release scope

**iOS / App Store only.** Google Play Store URL, `assetlinks.json` SHA256, and Play Console steps are deferred until an Android store release.

## Runtime behavior

1. **App installed + Universal Link verified** → iOS opens Pet Health Care on that listing.
2. **App installed but link opens browser** → landing page tries `pethealthcare://` then falls back to the App Store (when configured).
3. **App not installed (iPhone)** → landing / Smart App Banner → App Store.
4. **Android visitor** → landing explains iOS-only for now (no Play Store redirect).

## Before App Store production

1. Set iOS env vars in the Expo app / EAS:
   - `EXPO_PUBLIC_IOS_APP_STORE_URL`
   - `EXPO_PUBLIC_IOS_APP_STORE_ID` (numeric id for Smart App Banner)
2. Fill the same values in `docs/app/pet-feed/post/index.html` (`__PHC_IOS_APP_ID__`, `__PHC_IOS_STORE__`).
3. Replace `APPLE_TEAM_ID` in `apple-app-site-association`.
4. Deploy `docs/` to GitHub Pages.
5. Prefer a **custom domain** so Apple can fetch `/.well-known/apple-app-site-association` at the domain root (GitHub project pages often fail verification on `github.io/PETHEALTHCARE/...`).
6. Ship a new **iOS** native build so `associatedDomains` from `app.config.js` is included.

## Later (Play Store — ignore for now)

- `EXPO_PUBLIC_ANDROID_PLAY_STORE_URL`
- `docs/.well-known/assetlinks.json` Play signing SHA256
- Android App Links verification / Play Console
