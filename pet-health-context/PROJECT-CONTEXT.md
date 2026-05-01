# Catties Health Care / AI Pet Health — Project Context

Use this file when you need a quick recap of the app, how **frontend**, **backend**, and **database** connect, and what is already implemented.

---

## 1. Repository layout

| Folder | Role |
|--------|------|
| `pet-health-context/` | Shared product context: `idea.md`, `plans.md`, API notes, and **this** reference doc. |
| `pet-health-backend/` | Node.js (Express) API: auth proxy, pets CRUD, Gemini diagnosis, Supabase persistence & storage. |
| `pet-health-frontend/` | Expo (React Native) mobile app: NativeWind UI, calls backend only (no Gemini keys on device). |
| `figma/` | Design export (web prototype in `figma/code/`); mobile UI was implemented to align with that flow. |

---

## 2. Product goal (Phase 1)

- **Name in UI:** Catties Health Care (aligned with Figma).
- **Idea:** Pet owners capture or upload a photo; the app shows AI-assisted triage (diagnosis, severity, symptoms, treatment, disclaimer, confidence) and keeps **scan history** per pet.
- **Important:** Output is **not** a veterinary diagnosis; disclaimers are required in copy and API.

See `pet-health-context/idea.md` and `pet-health-context/plans.md` for full roadmap (Phase 2+ = reminders, chatbot, maps, etc.).

---

## 3. High-level architecture

```
┌─────────────────────┐     HTTPS/HTTP      ┌─────────────────────┐
│  pet-health-frontend │ ──────────────────► │ pet-health-backend │
│  (Expo / RN)         │   REST + multipart   │  (Express)          │
└──────────┬──────────┘                      └──────────┬─────────┘
           │                                            │
           │  Bearer: Supabase access_token              │  Service role key
           │  (no Gemini key on phone)                  │  + anon key for auth verify
           │                                            ▼
           │                                 ┌─────────────────────┐
           │                                 │ Supabase            │
           │                                 │ - Auth (email)      │
           │                                 │ - Postgres (pets,   │
           │                                 │   analyses)         │
           │                                 │ - Storage (images)  │
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
- **Backend** holds secrets, calls Gemini, writes to Supabase with the **service role** client for DB/storage where configured.

---

## 4. Backend (`pet-health-backend`)

### Stack

- Express 5, ESM (`"type": "module"`).
- `@google/genai` for vision + JSON-style diagnosis.
- `@supabase/supabase-js` for Auth (anon client), DB + storage (service client).
- `multer` for multipart image upload on `/api/v1/analysis`.

### Entry & structure

- `index.js` — loads `dotenv`, creates app from `src/app.js`, listens on `PORT` (default 3000). Logs **localhost** and **LAN URLs** for Expo device testing.

Main modules under `src/`:

- `app.js` — mounts routes + global error handler.
- `routes/` — `healthRoutes`, `authRoutes`, `petRoutes`, `analysisRoutes`.
- `middleware/auth.js` — **Bearer token** required: `Authorization: Bearer <supabase_access_token>`. Validates with `supabase.auth.getUser(token)` (anon key). User id = `data.user.id` (must match `user_id` on pets/analyses).
- `services/aiDiagnosisService.js` — Gemini call, JSON MIME type, **safe JSON parse** (strips markdown fences if needed), **confidence clamped 0–1**, model fallback list.
- `services/imageStorageService.js` — uploads diagnosis image to Supabase Storage bucket (or in-memory placeholder URL if Supabase not configured).
- `repositories/` — `petRepository`, `analysisRepository` (Supabase or in-memory fallback).

### API surface (Phase 1)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness. |
| POST | `/api/v1/auth/signup` | Body: `{ email, password }`. |
| POST | `/api/v1/auth/login` | Body: `{ email, password }`. Returns session with `access_token`. |
| GET/POST | `/api/v1/pets` | Bearer required. Full CRUD also: `GET/PUT/DELETE /api/v1/pets/:petId`. |
| POST | `/api/v1/analysis` | Bearer + multipart: `petId`, `image`. Runs AI, best-effort image upload, saves row. Response may include `warnings` if storage failed but diagnosis saved. |
| GET | `/api/v1/analysis/:petId` | Bearer; history for that pet. |

### Detailed API contract

- `pet-health-backend/context/phase1-api.md` — request/response examples, headers, errors, implementation notes.

### Environment variables (backend)

Typical `.env` (see `pet-health-backend/.env.example`):

- `PORT`
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — server-side DB + storage writes.
- `SUPABASE_ANON_KEY` — token verification + auth signup/login routes.
- `SUPABASE_IMAGE_BUCKET` — optional; default `pet-diagnosis-images`.

---

## 5. Database & storage (Supabase)

### Schema file

- `pet-health-backend/context/supabase-schema.sql` — run in Supabase SQL editor.

### Tables

- **`pets`** — `id`, `user_id` (Supabase user UUID as text), `name`, `species`, `breed`, `age`, `avatar_url`, `created_at`.
- **`analyses`** — `id`, `user_id`, `pet_id` → `pets.id`, `diagnosis`, `severity`, `symptoms` (jsonb), `treatment`, `confidence`, `disclaimer`, `image_url`, `created_at`.

### Storage

- Bucket name from env (default `pet-diagnosis-images`). Public URL used for `image_url` when upload succeeds.

### Row-level security (RLS)

- Current backend uses **service role** for inserts/updates, so RLS is bypassed server-side. For production hardening, consider RLS policies + client using user JWT only, or keep BFF pattern and lock down service key.

---

## 6. Frontend (`pet-health-frontend`)

### Stack

- Expo SDK ~54, React 19, React Native 0.81.
- **NativeWind v4** + Tailwind CSS 3 (`babel.config.js`, `tailwind.config.js`, `nativewind-env.d.ts`).
- `expo-image-picker` + `expo-image-manipulator` — gallery + resize/compress before upload.
- `@react-native-async-storage/async-storage` — persists `access_token` after login.
- `@expo/vector-icons` — icons in UI.

### Config

- `src/config.ts` — **`LOCAL_IP`** must match your dev machine LAN IP (physical devices cannot use `localhost`). Base URL: `http://<LOCAL_IP>:3000/api/v1`; health: `http://<LOCAL_IP>:3000/health`.

### API client

- `src/api.ts` — `healthCheck`, `signUp`, `login`, `listPets`, `createPet`, `analyzePetImage` (FormData), `listHistoryByPet`. All protected calls send `Authorization: Bearer <token>`.

### Types

- `src/types.ts` — `Pet`, `Analysis`, auth payloads, etc.

### UI structure

- `App.tsx` — shell only: picks screen, wires `usePetHealthApp`, shows `LoadingOverlay`.
- `src/hooks/usePetHealthApp.ts` — auth, pets, image pick/compress, analyze, history, logout (API + AsyncStorage).
- `src/screens/` — `LoginScreen`, `HomeScreen`, `AddPetScreen`, `CameraScreen`, `ResultsScreen`, `HistoryScreen`; `types.ts` exports `AppScreen`.
- `src/components/` — `AppHeader`, `BottomTabBar` (shown on Home + History only), `LoadingOverlay`.
- `src/constants/auth.ts` — token storage key.
- `src/utils/severityStyles.ts` — severity badge classes for results.

Flow (Figma-aligned): Login → Home → Add pet / Scan Health → Camera → Results; History tab loads list for selected pet.

### Run

```bash
cd pet-health-frontend
npm start
```

Ensure backend is running and `LOCAL_IP` in `src/config.ts` is correct for Expo Go on a real phone.

---

## 7. Auth & data ownership flow

1. User signs up or logs in via **backend** `/api/v1/auth/*` (Supabase Auth under the hood).
2. App stores **`session.access_token`** in AsyncStorage.
3. Every **pet** and **analysis** request sends **Bearer** token.
4. Backend resolves `user.id` from token and uses it as **`user_id`** when reading/writing `pets` and `analyses`.
5. **Pet id** must exist and belong to that user before analysis is accepted.

---

## 8. Figma vs implementation

- **Figma export:** `figma/code/` (React web + shadcn). Used as visual/flow reference.
- **Mobile:** Implemented in RN + **className** (NativeWind), not the web components from Figma.

---

## 9. Related docs in repo

| File | Purpose |
|------|---------|
| `pet-health-context/idea.md` | Product vision, AI fields, roadmap. |
| `pet-health-context/plans.md` | Phase 1 task priorities. |
| `pet-health-backend/context/phase1-api.md` | API contract for mobile integration. |
| `pet-health-backend/context/supabase-schema.sql` | DB DDL. |
| `pet-health-backend/context/phase1-api-review.md` | Expo / optimization notes. |
| `pet-health-context/TESTING-SETUP.md` | Step-by-step: Supabase, BE, FE, devices, smoke test, troubleshooting. |

---

## 10. Quick checklist for a new session

1. Read **this file** + `phase1-api.md`.
2. Backend: `.env` filled; run `yarn dev` in `pet-health-backend`; note LAN URL in console.
3. Supabase: run `supabase-schema.sql`; create storage bucket; enable email auth if needed.
4. Frontend: set `LOCAL_IP` in `src/config.ts`; `npm start` in `pet-health-frontend`.
5. Test: signup/login → create pet → upload image → see result + history.

---

*Last updated for context handoff: single source of truth for FE ↔ BE ↔ DB relationships and Phase 1 scope.*
