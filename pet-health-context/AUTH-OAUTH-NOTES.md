# Auth & OAuth notes (Pet Health / Catties)

This document captures what we learned wiring **email/password**, **Google**, and **Apple** through the **Express backend** + **Supabase Auth**, with **Expo** on the client.

---

## Architecture (current)

| Flow | Client | Backend | Supabase |
|------|--------|---------|----------|
| Email sign up / sign in | `POST /api/v1/auth/signup`, `POST /api/v1/auth/login` | `authRoutes.js` | `signUp` / `signInWithPassword` |
| Google | `expo-auth-session` → ID token | `POST /api/v1/auth/oauth/google` | `signInWithIdToken({ provider: 'google', token })` |
| Apple | `expo-apple-authentication` → identity token + raw nonce | `POST /api/v1/auth/oauth/apple` | `signInWithIdToken({ provider: 'apple', token, nonce })` |

Session: frontend stores `session.access_token` (JWT) and sends `Authorization: Bearer …` to protected routes.

---

## Environment variables

### Backend (`pet-health-backend/.env`)

- `SUPABASE_URL` must be the **project root** only: `https://<project-ref>.supabase.co` — **not** `…/rest/v1/`.
- After changing `SUPABASE_URL`, **restart the server** so cached Supabase clients reload.

### Frontend (`pet-health-frontend/.env`)

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — required for **web** and often for Expo Go / token config.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — **iOS** device / simulator (native OAuth client in Google Cloud).
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` — **Android** device (native OAuth client + SHA-1 in Google Cloud).

Restart Expo with cache clear after env changes: `npx expo start -c`.

---

## Google: web vs real phone

### Web (`expo start --web`)

- Uses **Web** OAuth client ID.
- In **Google Cloud** → Web client → add **Authorized JavaScript origins** and **Authorized redirect URIs** that match the URL Metro prints (e.g. `http://localhost:8081`). The app logs `[Google OAuth] redirectUri: …` in dev — that string must appear **exactly** under redirect URIs.
- Also add Supabase’s callback if you use hosted OAuth elsewhere:  
  `https://<project-ref>.supabase.co/auth/v1/callback`

### iPhone / Android (not the browser)

- **Expo Go** is unreliable for Google OAuth (`exp://…` redirect vs Google **Web** client = `redirect_uri_mismatch`). Use a **development build** (`expo-dev-client` + EAS or local dev client).
- Set real **`ios.bundleIdentifier`** and **`android.package`** in app config before creating **iOS** and **Android** OAuth clients in Google Cloud.
- Put **all** Google client IDs you use (web + iOS + Android) into Supabase → Authentication → Providers → Google → **Client IDs** (comma-separated).

---

## Google + Supabase: “Skip nonce checks”

### What happened

- `expo-auth-session` sends a **nonce** in the Google authorization request, so the **ID token contains a `nonce` claim**.
- Supabase can validate that claim against a nonce passed into `signInWithIdToken`. With Expo’s flow, passing the library’s raw `nonce` led to **“Nonces mismatch”** (Google’s encoding vs Supabase’s expectation do not line up the way Supabase documents for the ideal “hash to Google, raw to Supabase” pattern).

### What we do today

- Backend calls `signInWithIdToken` with **`token` only** (no `nonce` for Google).
- In Supabase Dashboard → Authentication → Providers → **Google** → **Skip nonce checks** = **ON** for this stack.

### When you release: do you turn nonce checks back on?

**Short answer:** Not automatically. Turning **Skip nonce checks** **OFF** without changing the client flow will likely bring back nonce-related errors for **Google** unless you implement Supabase’s documented pairing (raw nonce to Supabase, **SHA-256 (hex)** nonce to Google) using a stack that supports it (e.g. **Credential Manager / `@react-native-google-signin/google-signin`** with explicit nonce generation per [Supabase Google + ID token](https://supabase.com/docs/guides/auth/social-login/auth-google#with-id-token)).

**Practical guidance:**

| Stage | Google “Skip nonce checks” |
|-------|----------------------------|
| Dev / internal testing with **expo-auth-session** + current backend | **ON** — expected. |
| First production release **without** changing the Google client implementation | **Leave ON** unless you have tested a new flow end-to-end. |
| Hardening later | **OFF** only after you migrate to a Google SDK / flow that supplies nonces the way Supabase documents, and you regression-test sign-in on web + iOS + Android. |

**Risk note:** Skip nonce relaxes one layer of replay-oriented checking around the nonce claim. The **ID token is still verified** using Google’s keys and audience (`aud`) against your allowed client IDs. Many apps accept this tradeoff until they adopt a stricter native integration.

**Apple:** Uses explicit **raw nonce** in the app and the same value on the backend → keep **Skip nonce checks** for **Google** only; Apple does not use that Google toggle.

---

## Apple (real iPhone)

- **Sign in with Apple** only shows on iOS when `AppleAuthentication.isAvailableAsync()` is true.
- `app.json`: `ios.usesAppleSignIn`, `scheme`, plugin `expo-apple-authentication`.
- Supabase → Apple: **Client IDs** (bundle IDs / service IDs), **secret** for web OAuth if used, Apple Developer **Return URL** includes `https://<project-ref>.supabase.co/auth/v1/callback` when using web OAuth.
- Native flow: backend expects `idToken` + `nonce` from the app (already implemented).

---

## Supabase provider checklist (Google)

1. Provider **enabled**.
2. **Client IDs** — comma-separated list of every client ID used on any platform (web, iOS, Android).
3. **Client secret** — from the **Web** OAuth client (used for web-style OAuth; keep out of client bundles except where required by SDK).
4. **Skip nonce checks** — **ON** while using **expo-auth-session** + `signInWithIdToken` as above.

---

## iOS / Android dev build (real device) — order of work

1. Add **`expo-dev-client`**, configure **`ios.bundleIdentifier`** / **`android.package`** (unique to your org).
2. **Google Cloud**: create **iOS** and **Android** OAuth clients; register SHA-1 for Android; copy client IDs into `.env` and Supabase **Client IDs**.
3. **EAS Build** (or local) **development** profile; install on device; run `npx expo start` and open the project in the **dev client** (not Expo Go).
4. Confirm **redirect** behavior: if `redirect_uri_mismatch` returns, add the **exact** `redirect_uri` from Google’s error or from dev logs to the correct OAuth client in Google Cloud.
5. **Apple** (iOS only): Apple Developer identifiers + Supabase Apple provider aligned with the same bundle ID.

---

## Related project files

| Area | Path |
|------|------|
| Backend auth routes | `pet-health-backend/src/routes/authRoutes.js` |
| Frontend API | `pet-health-frontend/src/api.ts` |
| Google hook + login handlers | `pet-health-frontend/src/hooks/useGoogleIdTokenAuth.ts`, `usePetHealthApp.ts` |
| Google client IDs | `pet-health-frontend/src/config.ts` + `.env` |
| Auth session completion | `pet-health-frontend/index.ts` (`WebBrowser.maybeCompleteAuthSession`) |

For broader test commands and ngrok, see `TESTING-SETUP.md`.
