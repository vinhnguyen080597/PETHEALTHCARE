# Catties Health Care / AI Pet Health — Project Context

Use this file when you need a quick recap of the app, how **frontend**, **backend**, and **database** connect, and what is already implemented.

---

## 1. Repository layout

| Folder | Role |
|--------|------|
| `pet-health-context/` | Shared product context: `idea.md`, `plans.md`, API notes, and **this** reference doc. |
| `pet-health-backend/` | Node.js (Express) API: auth proxy, pets CRUD, avatar + diagnosis uploads, Gemini diagnosis, Supabase persistence & storage. |
| `pet-health-frontend/` | Expo (React Native) mobile app: NativeWind UI, calls backend only (no Gemini keys on device). |
| `figma/` | Design exports (`figma/UI/*.png`, etc.); mobile UI aligns with those flows. |

---

## 2. Product goal (Phase 1)

- **Name in UI:** Catties Health Care (aligned with Figma).
- **Idea:** Pet owners manage pets, run **health checks** (photos + optional video + context), and see **AI-assisted triage** (diagnosis, severity, symptoms, treatment, disclaimer, confidence) with **scan history** per pet.
- **First-time email sign-up:** After a successful session, the app runs **initial onboarding**: create first pet → optional health check → results → **Finish** → Home (see §6).
- **Important:** Output is **not** a veterinary diagnosis; disclaimers are required in copy and API.

See `pet-health-context/idea.md` and `pet-health-context/plans.md` for full roadmap (Phase 2+).

---

## 3. High-level architecture

```
┌─────────────────────┐     HTTPS/HTTP      ┌─────────────────────┐
│  pet-health-frontend │ ──────────────────► │ pet-health-backend │
│  (Expo / RN)         │   REST + multipart   │  (Express)          │
└──────────┬──────────┘                      └──────────┬─────────┘
           │                                            │
           │  Bearer: Supabase access_token              │  Anon + user JWT
           │  (no Gemini key on phone)                  │  (pets CRUD); service_role
           │                                            │  OR user JWT (storage uploads)
           │                                            ▼
           │                                 ┌─────────────────────┐
           │                                 │ Supabase            │
           │                                 │ - Auth (email/OAuth)│
           │                                 │ - Postgres (pets,   │
           │                                 │   analyses + extras)│
           │                                 │ - Storage (images/  │
           │                                 │   videos)           │
           │                                 └─────────────────────┘
           │                                            │
           │                                            │ API key (server only)
           │                                            ▼
           │                                 ┌─────────────────────┐
           └────────────────────────────────►│ Google Gemini      │
                         (indirect: only BE) │ (@google/genai)    │
                                             └─────────────────────┘
```

- **Frontend** never calls Gemini or holds `GEMINI_API_KEY`.
- **Backend** holds secrets, calls Gemini, talks to Supabase with **anon + user Bearer** for **pets** (RLS), **service_role JWT** (or user JWT fallback) for **storage uploads**, and **service role** for **analyses** inserts unless configured otherwise.

---

## 3.1 System flow (end-to-end)

```mermaid
flowchart TD
  A[User opens Expo app] --> B{Has access token?}
  B -- No --> C[Login / Sign up]
  C --> D[Backend auth endpoint]
  D --> E[Supabase Auth]
  E --> F[Return access token]
  F --> G[Store token in AsyncStorage]
  B -- Yes --> H[Restore session]
  G --> I[Home / Onboarding]
  H --> I

  I --> J[Create or edit pet]
  J --> K[Backend pets API with Bearer token]
  K --> L[Supabase Postgres pets table via RLS]
  L --> I

  I --> M[Start health check]
  M --> N[Upload photos/video + owner context]
  N --> O[Backend analysis endpoint]
  O --> P[Upload media to Supabase Storage]
  O --> Q[Call Gemini from backend]
  Q --> R[Diagnosis JSON result]
  P --> S[Persist analysis in Supabase analyses table]
  R --> S
  S --> T[Return result to app]
  T --> U[Results screen]
  U --> V[History / Pet profile health list]

  V --> W[Fetch /api/v1/analysis/:petId]
  W --> X[Backend reads analyses by pet + user]
  X --> V
```

**How to read this flow**
- Mobile client talks only to the backend API (never directly to Gemini).
- Supabase Auth issues the user token; that token is sent as Bearer for pets and analysis APIs.
- Backend orchestrates storage upload, AI diagnosis, and DB persistence in one pipeline.
- Results are displayed immediately, then reused later in History and Pet Profile health sections.

---

## 4. Backend (`pet-health-backend`)

### Stack

- Express 5, ESM (`"type": "module"`).
- `@google/genai` for vision + JSON-style diagnosis (multi-image + owner context string).
- `@supabase/supabase-js` for Auth (anon), pets via **user JWT**, storage uploads via **service role when key is valid** else user JWT + storage RLS.
- `multer` for multipart on `/api/v1/analysis` and pet avatar upload.

### Entry & structure

- `index.js` — loads `dotenv`, creates app from `src/app.js`, listens on `PORT` (default 3000). Logs **localhost** and **LAN URLs** for Expo device testing.

Main modules under `src/`:

- `app.js` — mounts routes + global error handler.
- `routes/` — `healthRoutes`, `authRoutes`, `petRoutes` (includes `POST .../pets/upload-avatar`), `analysisRoutes`.
- `middleware/auth.js` — **Bearer token** required on protected routes: validates with `supabase.auth.getUser(token)` (anon key). Attaches `req.user.id`, `req.accessToken`.
- `config/supabase.js` — `getSupabaseServiceClient()` (only if `SUPABASE_SERVICE_ROLE_KEY` JWT `role` is `service_role`), `createSupabaseWithUserAccessToken()`, `parseSupabaseKeyRole()`.
- `services/aiDiagnosisService.js` — `analyzePetHealthImages()` (up to 6 images + prompt appendix), `validateVideoFile` (≤10 MB), `buildHealthContextAppendix()` from form fields.
- `services/imageStorageService.js` — diagnosis images, **diagnosis videos** (`.../videos/...`), pet avatars; retries with user JWT on storage RLS errors when service key is wrong/missing.
- `repositories/` — `petRepository` (anon + user JWT; RLS), `analysisRepository` (service role; optional columns stripped on insert if DB not migrated).

### API surface (Phase 1)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Liveness. |
| POST | `/api/v1/auth/signup` | Email/password; may return session or email-confirm flow. |
| POST | `/api/v1/auth/login` | Body: `{ email, password }`. |
| GET/POST | `/api/v1/pets` | Bearer. CRUD: `GET/PUT/DELETE /api/v1/pets/:petId`. |
| POST | `/api/v1/pets/upload-avatar` | Bearer + multipart field **`image`** (before `/:petId` routes). |
| POST | `/api/v1/analysis` | Bearer + multipart: **`image`** (required), **`photos`** (0–5 extras), optional **`video`** (≤10 MB); form fields: `petId`, `weightKg`, `vaccinated`, `vaccineType`, `neutered`, `medicalHistory`, `symptomDescription`. |
| GET | `/api/v1/analysis/:petId` | Bearer; history for that pet. |

### Detailed API contract

- `pet-health-backend/context/phase1-api.md` — request/response examples (keep in sync with routes).

### Environment variables (backend)

Typical `.env` (see `pet-health-backend/.env.example` if present):

- `PORT`
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — must be the **service_role** JWT (not anon), or storage uploads fall back to user JWT + SQL policies.
- `SUPABASE_ANON_KEY` — token verification + `createSupabaseWithUserAccessToken` for pets and storage fallback.
- `SUPABASE_IMAGE_BUCKET` — optional; default `pet-diagnosis-images`.

---

## 5. Database & storage (Supabase)

### Schema file

- `pet-health-backend/context/supabase-schema.sql` — run in Supabase SQL editor. **Existing projects:** apply only new `ALTER TABLE` blocks when noted in comments (e.g. `analyses` health columns), or run full file (mostly idempotent).

### Tables

- **`pets`** — `id`, `user_id` (text, matches `auth.uid()`), `name`, `species`, `breed`, `age`, `gender`, `avatar_url`, `created_at`.
- **`analyses`** — core diagnosis fields plus optional: `extra_image_urls` (jsonb), `video_url`, `weight_kg`, `vaccination_status`, `vaccine_type`, `neutering_status`, `medical_history`, `symptom_description`.

### Storage

- Bucket from env (default `pet-diagnosis-images`). Paths: `userId/petId/...` (images), `userId/avatars/...` (avatars), `userId/petId/videos/...` (short clips).

### Row-level security (RLS)

- **`pets`:** enabled with policies `auth.uid()::text = user_id` — API uses **anon key + user Bearer** for pet CRUD (`petRepository.getPetsSupabase`).
- **`storage.objects`:** policies in schema for `authenticated` insert into own prefix + public read on bucket (needed when uploads use user JWT).

---

## 6. Frontend (`pet-health-frontend`)

### Stack

- Expo SDK ~54, React 19, React Native 0.81.
- **NativeWind v4** + Tailwind CSS 3 (`babel.config.js`, `tailwind.config.js`, `nativewind-env.d.ts`).
- `expo-image-picker` + `expo-image-manipulator` — gallery, multi-photo health check, short video (picker max duration 10s).
- `@react-native-async-storage/async-storage` — `access_token` + **pending initial onboarding** flag (see `src/constants/auth.ts`).
- `@expo/vector-icons` — icons in UI.

### Config

- `src/config.ts` — **`LOCAL_IP`** (or tunnel URL) for physical devices; base URL `http://<host>:3000/api/v1`. Client adds `ngrok-skip-browser-warning` when needed (`src/api.ts`).

### API client

- `src/api.ts` — `healthCheck`, `signUp`, `login`, OAuth helpers, `listPets`, `getPet`, `createPet`, `updatePet`, `deletePet`, `uploadPetAvatar`, **`analyzePetHealthCheck`** (multipart: images + optional video + health fields), `analyzePetImage` (single-image wrapper), `listHistoryByPet`.
- Web: `FormData` uses **Blob** for files (not RN `{uri}` objects).

### Types

- `src/types.ts` — `Pet`, `Analysis` (includes optional analysis extras), auth payloads, create/update pet payloads.

### UI structure

- `App.tsx` — screen shell, `LoadingOverlay`, hides `AppHeader` on full-screen flows (add/edit pet, health check, onboarding).
- `src/hooks/usePetHealthApp.ts` — auth, onboarding after **email sign-up with session**, pets CRUD, health check + analyze, history, logout.
- `src/screens/` — `LoginScreen`, `HomeScreen` (Figma-style cards: Scan Health + View Profile), `AddPetScreen`, **`HealthCheckScreen`**, **`OnboardingHealthPromptScreen`**, `ResultsScreen` (default + **onboarding** variant with **Finish**), `HistoryScreen`; `screens/types.ts` — `AppScreen` union (includes `onboarding-*`, `health-check`, `results`; **no** standalone camera screen).
- `src/components/` — `AppHeader`, `BottomTabBar` (Home + History + Logout), `LoadingOverlay`.
- `src/constants/auth.ts` — `TOKEN_STORAGE_KEY`, `PENDING_INITIAL_ONBOARDING_KEY`.
- `src/utils/severityStyles.ts` — severity styling for results.

### User flows

- **Login / Google / Apple** → Home (or **resume** pending initial onboarding if flag set and token restored).
- **Email sign-up** (immediate session) → **Onboarding:** create pet profile → “Check health now?” → optional `HealthCheckScreen` → results → **Finish** → Home; **Maybe later** skips health; cancel on first screen can sign out.
- **Home** → Scan Health → `HealthCheckScreen` → `ResultsScreen` → back refreshes pets.
- **History** tab → row opens result detail.

### Run

```bash
cd pet-health-frontend
yarn start
# or: npm start
```

Ensure backend is running and `src/config.ts` points to a reachable host for Expo Go on a real phone.

---

## 7. Auth & data ownership flow

1. User signs up or logs in via **backend** `/api/v1/auth/*` (Supabase Auth under the hood; OAuth via Google/Apple token exchange where implemented).
2. App stores **`session.access_token`** in AsyncStorage.
3. Every **pet** and **analysis** request sends **Bearer** token.
4. Backend resolves `user.id` from token and uses it as **`user_id`** when reading/writing `pets` and `analyses`.
5. **Pet id** must exist and belong to that user before analysis is accepted.

---

## 8. Figma vs implementation

- **Figma:** `figma/UI/` PNGs (Home, Health Check, Add Pet, etc.).
- **Mobile:** React Native + **className** (NativeWind), not the web export under `figma/code/`.

---

## 9. Related docs in repo

| File | Purpose |
|------|---------|
| `pet-health-context/idea.md` | Product vision, AI fields, roadmap. |
| `pet-health-context/plans.md` | Phase 1 task priorities. |
| `pet-health-context/AI-ANALYSIS-RULEBOOK.md` | Rule chuẩn cho AI health-check: input policy, output schema, system prompt, UI mapping tiếng Việt. |
| `pet-health-backend/context/phase1-api.md` | API contract for mobile integration. |
| `pet-health-backend/context/supabase-schema.sql` | DB DDL + pets RLS + storage policies. |
| `pet-health-backend/context/phase1-api-review.md` | Expo / optimization notes. |
| `pet-health-context/TESTING-SETUP.md` | Step-by-step: Supabase, BE, FE, devices, smoke test, troubleshooting. |
| `pet-health-context/AUTH-OAUTH-NOTES.md` | Google/Apple + Supabase notes (if present). |

---

## 10. Integration changelog (high level)

- Pets: full CRUD + optional `gender` / `avatar_url`; Supabase **RLS** for pets when using user JWT; avatar multipart upload + web-safe `FormData`.
- Analysis: **multi-image** + optional **video** (size limits) + **owner context** fields persisted on `analyses`; Gemini prompt includes context; storage service role vs user JWT fallback.
- Home UI: Figma-aligned header, pet cards with **Scan Health** + **View Profile**; delete pet from edit screen.
- Health check screen replaces old camera-only upload for scans.
- **Initial onboarding** after email sign-up (session): create pet → health prompt → optional check → results **Finish** → Home; AsyncStorage flag for resume.
- Frontend: tunnel headers (ngrok), `analyzePetHealthCheck`, types extended for analysis extras.

---

## 11. Quick checklist for a new session

1. Read **this file** + `phase1-api.md`.
2. Backend: `.env` filled; run `yarn dev` in `pet-health-backend`; note LAN URL in console.
3. Supabase: run `supabase-schema.sql` (or incremental alters); create storage bucket; pets RLS + storage policies if using user-JWT uploads; enable auth providers as needed.
4. Frontend: set `LOCAL_IP` / API base in `src/config.ts`; `yarn start` in `pet-health-frontend`.
5. Test: signup/login → onboarding or home → create/edit pet → health check (photos) → result → history; sign-up flow with Finish after first scan.

---

## 12. Cost-control tuning profiles (AI guardrails)

Use these backend `.env` variables to tune short-term AI cost controls without changing code:

- `ANALYSIS_IN_FLIGHT_TTL_SECONDS`
- `ANALYSIS_COOLDOWN_SECONDS`
- `ANALYSIS_RATE_LIMIT_HOURLY`
- `ANALYSIS_RATE_LIMIT_DAILY`

### Recommended profiles

#### A) Soft launch (small user group, prioritize stability)

```env
ANALYSIS_IN_FLIGHT_TTL_SECONDS=300
ANALYSIS_COOLDOWN_SECONDS=120
ANALYSIS_RATE_LIMIT_HOURLY=8
ANALYSIS_RATE_LIMIT_DAILY=25
```

- Tight limits to protect budget while validating quality and UX.
- Good when you are still calibrating prompts/model behavior.

#### B) Public beta (balanced growth vs cost)

```env
ANALYSIS_IN_FLIGHT_TTL_SECONDS=300
ANALYSIS_COOLDOWN_SECONDS=90
ANALYSIS_RATE_LIMIT_HOURLY=12
ANALYSIS_RATE_LIMIT_DAILY=40
```

- Balanced defaults for wider testing.
- Keeps abuse under control while allowing normal usage.

#### C) Growth phase (higher engagement, still controlled)

```env
ANALYSIS_IN_FLIGHT_TTL_SECONDS=300
ANALYSIS_COOLDOWN_SECONDS=60
ANALYSIS_RATE_LIMIT_HOURLY=20
ANALYSIS_RATE_LIMIT_DAILY=70
```

- Better user throughput for active cohorts.
- Requires budget monitoring and alerting in Google Cloud.

### Operational notes

- **Always keep in-flight lock enabled** (`ANALYSIS_IN_FLIGHT_TTL_SECONDS > 0`) to prevent duplicate concurrent scans per pet.
- **Cooldown** reduces repeated accidental taps; start strict, relax later.
- **Rate limits** are last-line defense against abuse and runaway costs.
- Restart backend after `.env` changes for new thresholds to apply.
- Pair with 24h analysis caching (same pet + same media + same health context) to maximize token savings.

---

## 13. Pending items from cost/onboarding proposal

This section tracks what is **still pending** from the discussed proposal, so it can be executed later in phases.

### 13.1 Done already (baseline)

- [x] 24h analysis caching for same pet + same media + same health context.
- [x] In-flight lock (prevent duplicate concurrent analysis per pet).
- [x] Cooldown + hourly/daily rate limits.
- [x] Guardrail thresholds moved to `.env` for tuning by launch phase.

### 13.2 Pending — short to mid term (recommended next)

- [ ] **Persist cache/guard state in Redis** (instead of in-memory maps) for production reliability across restarts/multi-instance backend.
- [ ] **Structured progress states** from backend to frontend (`uploading -> analyzing -> saving`) so users do not re-tap while waiting.
- [ ] **Frontend UX for guardrail errors**:
  - map backend codes (`ANALYSIS_IN_PROGRESS`, `ANALYSIS_COOLDOWN`, `ANALYSIS_RATE_LIMIT_*`) to localized user-friendly messages.
- [ ] **Model policy refinement**:
  - default to low-cost Gemini model for routine scans;
  - optional fallback policy only when confidence/quality requires it.
- [ ] **Budget observability**:
  - Google Cloud budget alert thresholds + internal dashboard/KPI tracking (cost/day, cache hit rate, blocked request rates).

### 13.3 Pending — onboarding/product flow

- [ ] **Integrated onboarding step**:
  - create pet profile + first health check in one guided flow for new users.
- [ ] **Dedicated progress screen** during first health check with animated stage updates.
- [ ] **Onboarding completion flag in profile** (`has_completed_onboarding: true`) written/read from backend user profile metadata.

### 13.4 Pending — business model phase

- [ ] **Scan quota / pay-per-scan logic** (free scans, consume per analysis).
- [ ] **Rewarded ads integration** (watch ad -> add scan credits).
- [ ] **Premium subscription** (unlimited scans / no ads).
- [ ] **Affiliate product recommendation layer** (diagnosis -> product mapping + tracking links), with compliance review for medical safety messaging.

### 13.5 Suggested execution order

1. Redis persistence for cache + locks + rate-limit counters.
2. Progress-state API + frontend progress UI/error mapping.
3. Model policy + observability (budget alerts, KPIs).
4. Onboarding integration refinements.
5. Monetization modules (quota/ads/premium/affiliate).

---

*Last updated: documents onboarding after email sign-up, health check + multipart analysis API, Supabase RLS/storage patterns, and frontend screen set without legacy camera screen.*

## 14. Error handling & admin alerting

- Added backend-safe error contract with machine-readable `code`.
- User-facing messages are sanitized for system/provider failures.
- Added admin email alert flow for severe backend errors (SMTP-based).
- Error code definitions documented in `ERROR-HANDLING-RULEBOOK.md`.
