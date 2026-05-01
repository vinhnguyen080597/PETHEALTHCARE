# Local testing setup (DB, backend, frontend, devices)

Step-by-step guide to run **Catties Health Care** end-to-end on your machine and on a phone. Paths are relative to the repo root: `PetHealthCare/`.

---

## 0. Prerequisites

1. **Node.js** (LTS recommended, e.g. v20+ or v22) — [nodejs.org](https://nodejs.org/)
2. **Google AI Studio** (or Google Cloud) — create an API key for **Gemini** (`GEMINI_API_KEY`).
3. **Supabase** — free account at [supabase.com](https://supabase.com/)
4. **Phone (optional)** — iOS or Android with **Expo Go** installed ([expo.dev/go](https://expo.dev/go))
5. **Same Wi‑Fi** — computer and phone must be on the same network for LAN testing.

---

## 1. Database (Supabase)

### 1.1 Create a project

1. Log in to Supabase → **New project**.
2. Choose region, set a database password, wait until the project is ready.

### 1.2 Run the SQL schema

1. In Supabase: **SQL Editor** → **New query**.
2. Open `pet-health-backend/context/supabase-schema.sql` from this repo.
3. Copy the full file contents → paste into the editor → **Run**.

You should have tables **`pets`** and **`analyses`** (and indexes).

### 1.3 Create the image storage bucket

1. **Storage** → **New bucket**.
2. Name: `pet-diagnosis-images` (or another name — if different, set `SUPABASE_IMAGE_BUCKET` in backend `.env` to match).
3. For local testing only, you can mark the bucket **public** so `image_url` links open in the browser. For production, prefer private bucket + signed URLs.

### 1.4 Enable email auth

1. **Authentication** → **Providers** → enable **Email**.
2. Under **Authentication** → **URL configuration**, note your project URL (you mainly need keys for the backend).

### 1.5 Copy API keys (for backend `.env`)

1. **Project Settings** (gear) → **API**:
   - **Project URL** → `SUPABASE_URL`
   - **`anon` `public`** key → `SUPABASE_ANON_KEY`
   - **`service_role` `secret`** key → `SUPABASE_SERVICE_ROLE_KEY` (never commit this; server only)

---

## 2. Backend (BE)

### 2.1 Install dependencies

```powershell
cd pet-health-backend
npm install
```

(Or `yarn` if you use Yarn.)

### 2.2 Create `.env`

1. Copy `pet-health-backend/.env.example` to `pet-health-backend/.env`.
2. Fill in:

| Variable | Where to get it |
|----------|------------------|
| `PORT` | Usually `3000` (optional). |
| `GEMINI_API_KEY` | Google AI / Cloud console. |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL. |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` `secret`. |
| `SUPABASE_IMAGE_BUCKET` | Bucket name from step 1.3 (default `pet-diagnosis-images`). |

### 2.3 Start the server

```powershell
cd pet-health-backend
npm run dev
```

(or `yarn dev`)

### 2.4 Confirm it is running

1. Open a browser: `http://localhost:3000/health`
2. You should see JSON like `{ "status": "ok", ... }`.
3. In the terminal, note any **LAN URLs** printed (e.g. `http://192.168.x.x:3000`) — you need this IP for the phone.

### 2.5 Windows firewall (if the phone cannot reach the API)

If Expo on the phone times out when calling the API:

1. **Windows Defender Firewall** → **Allow an app through firewall**.
2. Allow **Node.js** for **Private** networks, or temporarily allow inbound **TCP** on port **3000** for private profiles.

---

## 3. Frontend (FE)

### 3.1 Install dependencies

```powershell
cd pet-health-frontend
npm install
```

### 3.2 Point the app at your computer’s IP

The app does **not** use `localhost` on a physical device.

1. Open `pet-health-frontend/src/config.ts`.
2. Set `LOCAL_IP` to the **same IPv4 address** as in the backend startup log (your Wi‑Fi adapter), e.g. `192.168.1.42`.
3. Save the file.

`API_BASE_URL` becomes `http://<LOCAL_IP>:3000/api/v1`.

### 3.3 Start Expo

```powershell
cd pet-health-frontend
npm start
```

Then:

- **Emulator**: press `a` (Android) or `i` (iOS simulator on Mac).
- **Physical phone**: scan the QR code with **Expo Go** (same Wi‑Fi as the PC).

---

## 4. Devices

### 4.1 Physical phone (recommended for camera / gallery)

1. Install **Expo Go** from App Store / Play Store.
2. Connect phone and PC to the **same Wi‑Fi**.
3. Set `LOCAL_IP` in `src/config.ts` to your PC’s LAN IP (see BE step 2.4).
4. Run `npm start` in `pet-health-frontend`, scan QR with Expo Go.
5. If the app says backend unreachable, fix **firewall** (BE 2.5) or wrong **LOCAL_IP**.

### 4.2 Android emulator

- Often `10.0.2.2` maps to the host machine’s `localhost`, but this project uses a fixed **LAN IP**. Easiest path: use your machine’s **actual LAN IP** in `config.ts` (same as for a real phone), with backend listening on `0.0.0.0` (Node default for `app.listen(PORT)` is all interfaces — good).

### 4.3 iOS simulator (Mac only)

- Same as above: `LOCAL_IP` = Mac’s LAN IP, or use `localhost` only if you change `config.ts` for iOS simulator builds (optional tweak; not required if LAN IP works).

---

## 5. Smoke test (happy path)

Do these in order:

1. **Health** — With FE pointed at the right IP, open the app; login screen should show **Backend online** (or fix IP / BE if not).
2. **Sign up** — Create account in app → if Supabase requires email confirmation, confirm email then **Sign in**.
3. **Add pet** — Home → **Add Pet** → name + species → **Save Pet**.
4. **Scan** — **Scan Health** → **Upload from Gallery** → pick image → **Analyze Image**.
5. **Results** — See diagnosis, severity, disclaimer; optional **warnings** if image upload to storage failed.
6. **History** — Bottom tab **History** → list for the **selected** pet (select pet on Home first if empty).

### 5.1 API-only check (optional)

Use Postman / Thunder Client / curl:

1. `POST /api/v1/auth/login` with `{ "email", "password" }` → copy `access_token`.
2. `GET /api/v1/pets` with header `Authorization: Bearer <access_token>`.
3. See `pet-health-backend/context/phase1-api.md` for full contract.

---

## 6. Troubleshooting

| Symptom | What to check |
|---------|----------------|
| `Backend unreachable` on login screen | BE running? Correct `LOCAL_IP`? Firewall? Same Wi‑Fi? |
| `401` / `Invalid token` | Log in again; token expired; `SUPABASE_ANON_KEY` correct on BE. |
| `503` Supabase auth not configured | `SUPABASE_URL` + `SUPABASE_ANON_KEY` in backend `.env`. |
| `GEMINI_API_KEY is missing` | Set key in backend `.env`, restart BE. |
| Pet create / DB errors | Re-run `supabase-schema.sql`; check service role key. |
| Image upload warnings, no `image_url` | Bucket name matches env; bucket exists; Storage policies if using RLS on storage. |
| Expo Metro bundler issues | `npx expo start -c` to clear cache. |

---

## 7. Quick command summary

```powershell
# Terminal 1 — Backend
cd pet-health-backend
npm install
# create .env from .env.example, then:
npm run dev

# Terminal 2 — Frontend
cd pet-health-frontend
npm install
# edit src/config.ts LOCAL_IP, then:
npm start
```

---

## 8. Related docs

- `PROJECT-CONTEXT.md` — architecture and repo map.
- `pet-health-backend/context/phase1-api.md` — API reference.
- `pet-health-backend/context/supabase-schema.sql` — database DDL.

---

*Add project-specific notes (e.g. your real LAN IP, Supabase project name) below this line for your team.*
