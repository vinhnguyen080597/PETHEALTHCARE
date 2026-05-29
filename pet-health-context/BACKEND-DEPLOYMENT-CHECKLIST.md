# Backend Deployment Checklist

Use this checklist for the first free backend deployment before preparing App Store builds.

## Target

- Hosting: Render Free web service.
- Backend root directory: `pet-health-backend`.
- Health URL: `https://<render-service>.onrender.com/health`.
- Readiness URL: `https://<render-service>.onrender.com/health/ready`.
- API base URL: `https://<render-service>.onrender.com/api/v1`.

## 1. Supabase Setup

1. Create or choose the Supabase project used for staging/release testing.
2. Run `pet-health-backend/context/supabase-schema.sql` in Supabase SQL Editor.
3. Create the storage bucket:
   - Bucket id: `pet-diagnosis-images`
   - Current app behavior expects public URLs for images/videos.
4. Verify Auth providers:
   - Email/password enabled.
   - Google/Apple only if the frontend login UI enables them.
5. Verify RLS policies exist for:
   - `pets`
   - `pet_care_records`
   - `ai_credit_accounts`
   - `ai_usage_events`
   - `ai_credit_ledger`
   - `app_events`
6. Create a clean test account after deploying and run the full app flow.

## 2. Render Setup

Recommended quick path:

1. Connect GitHub repo to Render.
2. Create a new Web Service or use the root `render.yaml` blueprint.
3. If creating manually:
   - Root directory: `pet-health-backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/health`
   - Plan: Free
4. Add required environment variables.

Required secrets:

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `ADMIN_INTERNAL_API_KEY`

Required non-secret config:

- `SUPABASE_IMAGE_BUCKET=pet-diagnosis-images`
- `GEMINI_MODEL_CANDIDATES=gemini-2.5-flash,gemini-2.0-flash`
- `AI_DEBUG_LOG_ENABLED=false`
- `AI_DEBUG_LOG_INCLUDE_MEDIA_BASE64=false`
- `LOG_ALL_REQUESTS=false`
- `LOG_REQUEST_BODY=false`
- `LOG_RESPONSE_BODY=false`
- `CORS_ORIGINS=https://<allowed-web-origin>` if testing from web. Leave empty temporarily for native-only beta testing if needed.

Recommended beta credit settings:

- `AI_INITIAL_TRIAL_CREDITS=2`
- `AI_FREE_MONTHLY_CREDITS=0`
- `AI_CREDITS_HEALTH_ANALYSIS=1`
- `AI_CREDITS_BREED_RECOGNITION=1`
- `AI_GLOBAL_DAILY_BUDGET_USD=10`
- `AI_GLOBAL_MONTHLY_BUDGET_USD=200`
- `AI_FEATURE_DAILY_BUDGET_USD_HEALTH_ANALYSIS=6`
- `AI_FEATURE_DAILY_BUDGET_USD_BREED_RECOGNITION=3`

## 3. Frontend API Configuration

For local Expo testing against deployed backend, create `pet-health-frontend/.env`:

```env
EXPO_PUBLIC_API_ORIGIN=https://<render-service>.onrender.com
```

Then restart Expo with cache clear.

The app derives:

- `API_BASE_URL = EXPO_PUBLIC_API_ORIGIN + /api/v1`
- `API_HEALTH_URL = EXPO_PUBLIC_API_ORIGIN + /health`

Use `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_API_HEALTH_URL` only if the backend route layout changes.

## 4. Smoke Test After Deploy

1. Open `/health`.
2. Open `/health/ready`.
3. Open `/health/ready?deep=1` after Supabase schema is applied.
4. Sign up with a clean account.
5. Create a dog profile and a cat profile.
6. Upload avatar.
7. Add a core care diary/reminder record.
8. Check AI credit summary.
9. Run breed recognition with the sample photos.
10. Apply breed result to profile.
11. Run health check with at least one photo.
12. Open pet profile history and the history tab.
13. Log out and log back in.

## 5. Free Hosting Notes

- Render Free can sleep. The first request after sleep may be slow.
- Before demo/TestFlight/App Review testing, open `/health` once to wake the service.
- If AI calls timeout or reviewers see backend offline, upgrade the backend plan before public release.

## 6. Do Not Do For Production Builds

- Do not use ngrok/localtunnel URLs.
- Do not set `EXPO_PUBLIC_ADMIN_INTERNAL_API_KEY` in frontend production builds.
- Do not enable request/response body logs.
- Do not commit real `.env` files or service role keys.
