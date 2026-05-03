# Local testing setup (DB, backend, frontend, devices)

Step-by-step guide to run **Catties Health Care** end-to-end on your machine and on a phone. Paths are relative to the repo root: `PetHealthCare/`.

---

## 0. Prerequisites

1. **Node.js** (LTS recommended, e.g. v20+ or v22) — [nodejs.org](https://nodejs.org/)
2. **Google AI Studio** (or Google Cloud) — create an API key for **Gemini** (`GEMINI_API_KEY`).
3. **Supabase** — free account at [supabase.com](https://supabase.com/)
4. **Phone (optional)** — iOS or Android with **Expo Go** installed ([expo.dev/go](https://expo.dev/go))
5. **Same Wi‑Fi** — computer and phone should be on the same network for **LAN** Expo and for the phone to call `http://<PC_LAN_IP>:3000`. If LAN is blocked (firewall/router), use a **backend tunnel** (§2.6, **ngrok**) and/or Expo **LAN + ngrok for API only** (§3.3).

---

## 1. Database (Supabase)

### 1.1 Create a project

1. Log in to Supabase → **New project**.
2. Choose region, set a database password, wait until the project is ready.

### 1.2 Run the SQL schema

The SQL file lives **on your computer** inside the **PetHealthCare** project folder. It does **not** appear inside the Supabase website—you open it in Cursor (or File Explorer), copy the text, then paste it into Supabase.

1. **Supabase (browser):** **SQL Editor** (left sidebar) → open a **New query** tab (you already have this screen).
2. **On your PC — open the file in Cursor:**
   - In the **Explorer** sidebar, expand: `PetHealthCare` → `pet-health-backend` → `context` → click **`supabase-schema.sql`**.  
   - Or press **Ctrl+P**, type `supabase-schema.sql`, press Enter to jump to the file.
3. **Windows path** (if you use the default location):  
   `C:\Users\Administrator\Documents\PetHealthCare\pet-health-backend\context\supabase-schema.sql`  
   (If your project lives elsewhere, open that same path under your `PetHealthCare` folder.)
4. In Cursor: **Select all** (Ctrl+A) → **Copy** (Ctrl+C).
5. In Supabase SQL Editor: **Paste** into the black editor → click **Run** (or **Ctrl+Enter**).

**If Supabase shows “Potential issue detected” (RLS):** choose **Run and enable RLS**. Your Node backend uses the **service role** key, which bypasses RLS, so the app still works; enabling RLS is safer if tables are ever exposed to the anon key later.

You should have tables **`pets`** and **`analyses`** (and indexes). In Supabase: **Table Editor** → you should see `pets` and `analyses` after a refresh.

### 1.3 Create the image storage bucket

Your backend saves each diagnosis photo to **Supabase Storage** and stores the returned URL in the `analyses.image_url` column. The code expects a **bucket** whose name matches `SUPABASE_IMAGE_BUCKET` (default: `pet-diagnosis-images`). See `pet-health-backend/src/services/imageStorageService.js`.

#### 1.3.1 Open Storage in the dashboard

1. Open your project in the Supabase dashboard (same project where you ran the SQL).
2. In the **left sidebar**, click **Storage** (folder / cloud icon).
3. You should see a **Buckets** tab (or “All buckets”). If the list is empty, you have not created a bucket yet.

#### 1.3.2 Create a new bucket

1. Click **New bucket** (or **Create bucket**).
2. **Name:** enter exactly  
   `pet-diagnosis-images`  
   - Use **lowercase** and **hyphens** as shown (no spaces).  
   - If you choose a different name, set the same value in `pet-health-backend/.env` as:  
     `SUPABASE_IMAGE_BUCKET=your-bucket-name`
3. **Public bucket** (recommended for **local / MVP testing**):  
   - Turn **Public bucket** **ON** if you want URLs from `getPublicUrl` to open in a normal browser tab without signed URLs.  
   - Your backend uses `getPublicUrl` after upload, so **public** is the simplest path until you implement signed URLs.  
   - For **production**, many teams switch to a **private** bucket and generate **signed URLs** in the backend (requires a small code change later).
4. Optional fields (you can leave defaults for now):  
   - **File size limit** — backend already limits uploads to **5 MB**; you can align Supabase (e.g. 5 MB) if the UI offers it.  
   - **Allowed MIME types** — if you restrict types, allow at least **`image/jpeg`**, **`image/png`**, **`image/webp`** to match the API.
5. Click **Create** (or **Save**).

#### 1.3.3 Confirm it worked

1. Under **Storage → Buckets**, you should see **`pet-diagnosis-images`** listed.
2. After you run a real diagnosis from the app, open the bucket again → you should see paths like `userId/petId/timestamp-uuid.jpg` and image files. If uploads fail, check the bucket name matches `.env` and that the backend uses the **service role** key (it can upload regardless of many RLS setups).

#### 1.3.4 Link to your backend `.env`

In `pet-health-backend/.env` (copy from `.env.example` if needed), ensure:

```env
SUPABASE_IMAGE_BUCKET=pet-diagnosis-images
```

If the bucket name in the dashboard differs, this line **must** match it exactly.

#### 1.3.5 If Supabase asks about policies / RLS (Storage)

Storage can show warnings about **policies**. For MVP with **service role** uploads and a **public** read bucket, your Node server can still upload. If uploads are denied, open **Storage → Policies** for that bucket and add policies per [Supabase Storage docs](https://supabase.com/docs/guides/storage), or temporarily use a **public** bucket for development as above.

### 1.4 Enable email auth

These steps are required for app login/signup to work (`/api/v1/auth/signup`, `/api/v1/auth/login` in your backend).

#### 1.4.1 Open Auth settings

1. In Supabase dashboard, open your project.
2. Left sidebar → **Authentication**.
3. Click **Providers**.

#### 1.4.2 Configure Email provider

1. Find **Email** in the providers list and make sure it is **Enabled**.
2. For MVP/dev, keep default settings unless your team requires strict rules.
3. Recommended dev options:
   - **Enable email signups** = ON
   - **Confirm email** = ON (safer) or OFF (faster local testing)

If **Confirm email = ON**:
- New users can sign up but may not get an access token immediately.
- They need to click the confirmation link in email first, then sign in.
- This behavior matches the frontend note: “Verify email then sign in.”

#### 1.4.3 URL configuration (optional but useful now)

1. In Authentication, open **URL Configuration**.
2. Set your project **Site URL** (for dev can be any placeholder, e.g. `http://localhost`).
3. If you use email redirect links, add allowed redirect URLs (later for production/mobile deep links).

You can keep this simple for now because your app currently uses direct email/password login flow through backend.

### 1.5 Copy API keys (for backend `.env`)

You need three values from Supabase for backend auth + DB/storage operations.

#### 1.5.1 Where to get `SUPABASE_URL` (Project URL)

The **Project URL** is **not** shown on **Settings → API Keys** (that page is only keys).

1. In Supabase, open **Project Settings** (gear icon at the bottom of the left sidebar).
2. Under **INTEGRATIONS**, click **Data API**.
3. Find **Project URL** — it looks like `https://xxxxxxxxxxxx.supabase.co` — **Copy** it.
4. Put it in `.env` as:

   `SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co`

**Alternative:** **Settings → General** — some projects also show the API / reference URL there; **Data API** is the usual place in the current dashboard.

#### 1.5.2 Where to get `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`

1. Still under **Project Settings**, open **API Keys** (under **CONFIGURATION**).
2. You may see **new** keys first (`sb_publishable_…`, `sb_secret_…`). This repo’s backend uses the **classic** `anon` / `service_role` keys with `createClient(url, key)`.
3. Open the tab **Legacy anon, service_role API keys** (wording may vary slightly).
4. Copy:
   - **anon** **`public`** → `SUPABASE_ANON_KEY`
   - **service_role** **`secret`** → `SUPABASE_SERVICE_ROLE_KEY` (never expose to frontend or Git)

Also set:
- `SUPABASE_IMAGE_BUCKET=pet-diagnosis-images` (or your custom bucket name)

#### 1.5.3 Example `.env` (backend)

In `pet-health-backend/.env`:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_IMAGE_BUCKET=pet-diagnosis-images
```

#### 1.5.4 Important security notes

- `SUPABASE_SERVICE_ROLE_KEY` is highly privileged:
  - Server-side only (backend), never frontend.
  - Never commit to GitHub.
  - Never paste in chat screenshots.
- Keep `.env.example` as template only; real `.env` stays local.
- If a key is leaked, rotate it from Supabase settings immediately.

---

## 2. Backend (BE)

This repo uses **Yarn** for backend and frontend (lockfiles: `yarn.lock`). You can use **Git Bash** or **PowerShell** for `yarn` / `npx` commands; use **PowerShell as Administrator** only for Windows firewall steps below.

### 2.1 Install dependencies

```powershell
cd pet-health-backend
yarn install
```

(`npm install` also works if you prefer npm, but avoid mixing lockfiles in the same folder.)

### 2.2 Create `.env`

1. Copy `pet-health-backend/.env.example` to `pet-health-backend/.env`.
2. Fill in:

| Variable | Where to get it |
|----------|------------------|
| `PORT` | Usually `3000` (optional). |
| `GEMINI_API_KEY` | Google AI / Cloud console. |
| `SUPABASE_URL` | Supabase → **Settings → Integrations → Data API** → Project URL. |
| `SUPABASE_ANON_KEY` | Supabase → **Settings → API Keys** → tab **Legacy anon, service_role** → **anon** `public`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Same tab → **service_role** `secret`. |
| `SUPABASE_IMAGE_BUCKET` | Bucket name from step 1.3 (default `pet-diagnosis-images`). |

### 2.3 Start the server

```powershell
cd pet-health-backend
yarn dev
```

(`npm run dev` is equivalent if your `package.json` script is `dev`.)

On start, the backend prints **localhost** and **LAN URLs** (e.g. `http://192.168.1.4:3000`). Use that IP in the frontend `LOCAL_IP` (see §3.2).

### 2.4 Confirm it is running

1. Open a browser: `http://localhost:3000/health`
2. You should see JSON like `{ "status": "ok", ... }`.
3. In the terminal, note any **LAN URLs** printed (e.g. `http://192.168.x.x:3000`) — you need this IP for the phone.

### 2.5 Windows firewall (if the phone cannot reach the API)

If the app on the phone cannot reach `http://<YOUR_LAN_IP>:3000/health` from **Safari/Chrome on the phone** (not only from the PC):

1. Set the active Wi‑Fi profile to **Private** (Settings → Network & Internet → Wi‑Fi → your network → **Private**).
2. **Windows Defender Firewall** → **Allow an app through firewall** → allow **Node.js** on **Private** networks.
3. Optional explicit rules (PowerShell **as Administrator**):

```powershell
New-NetFirewallRule -DisplayName "Backend 3000 Private" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private
```

If the phone still cannot open `http://<LAN_IP>:3000/health`, the router may use **AP / client isolation** (devices cannot talk to each other). In that case use a **tunnel for the backend** (see §2.6) and point `src/config.ts` at the tunnel URL instead of LAN.

### 2.6 Backend over a tunnel (when LAN is blocked)

If iPhone and PC are on “guest” Wi‑Fi or the router blocks device-to-device traffic, expose port **3000** with an HTTPS tunnel and point `pet-health-frontend/src/config.ts` at that host (`API_BASE_URL` = `https://<host>/api/v1`, `API_HEALTH_URL` = `https://<host>/health`). **URLs change each time you restart the tunnel** unless you use a paid reserved domain.

#### 2.6.1 ngrok (recommended)

1. **Install** (pick one that works on your PC):
   - **npm (works on most Windows setups):**  
     `npm install -g ngrok`
   - **winget** (`winget install Ngrok.Ngrok`) can fail on some machines with “file cannot be accessed” — use npm if so.

2. **Authtoken (once):** create a free account at [ngrok.com](https://ngrok.com), copy **Your Authtoken**, then:

   ```powershell
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

   This saves to `%LOCALAPPDATA%\ngrok\ngrok.yml` (not your repo).

3. **Run the tunnel** while the backend is listening on **3000** (`yarn dev` in `pet-health-backend`):

   - **PowerShell or CMD:**  
     `ngrok http 3000`
   - **Git Bash:** the global `ngrok` script can try to run the wrong file and show **`cannot execute binary file: Exec format error`**. Use either:
     - `ngrok.cmd http 3000`, or  
     - the Windows binary under your npm global folder, e.g.  
       `~/AppData/Roaming/npm/node_modules/ngrok/bin/ngrok.exe http 3000`  
       (from Git Bash, `~` is your user profile.)

4. In the ngrok UI (terminal or browser at `http://127.0.0.1:4040`), copy the **HTTPS** forwarding URL (e.g. `https://….ngrok-free.app` or `https://….ngrok-free.dev`).

5. Put that base into `pet-health-frontend/src/config.ts` (no trailing slash on the host):

   - `API_BASE_URL` → `https://<subdomain>.ngrok-free.app/api/v1` (or `.ngrok-free.dev` / domain ngrok shows)
   - `API_HEALTH_URL` → `https://<subdomain>.ngrok-free.app/health`

6. **Ngrok free “browser warning” / HTML interstitial:** ngrok may inject a warning page in front of **browser** traffic. For **JSON APIs** you must send header **`ngrok-skip-browser-warning: true`** (any value works). This repo’s **`src/api.ts`** adds it automatically when the base URL looks like ngrok. The backend **CORS** allows that header on preflight.

7. **Quick API test (PowerShell)** — use `curl.exe` and the skip header (Chrome “Copy as cURL” often omits it):

   ```powershell
   curl.exe -sS -X POST "https://YOUR-SUBDOMAIN.ngrok-free.dev/api/v1/auth/signup" `
     -H "Content-Type: application/json" `
     -H "ngrok-skip-browser-warning: true" `
     -d "{\"email\":\"you@example.com\",\"password\":\"your-password\"}"
   ```

8. **CORS:** the backend reflects `Origin` and allows `Content-Type`, `Authorization`, tunnel helper headers, and **`ngrok-skip-browser-warning`**. Expo Go uses the same HTTPS base as web.

#### 2.6.2 localtunnel (optional fallback)

```powershell
npx localtunnel --port 3000
```

Some networks block outbound access to **localtunnel.me** (control connection), which shows as **`connection refused: localtunnel.me:10021`**. The `*.loca.lt` interstitial can also break browsers unless extra headers are used. Prefer **ngrok (§2.6.1)** when localtunnel fails.

---


## 3. Frontend (FE)

### 3.1 Install dependencies

Use **Yarn** only in this folder (do not commit a `package-lock.json` here).

```powershell
cd pet-health-frontend
yarn install
```

**First-time dependency notes** (Expo SDK 54 + NativeWind v4):

- Web (`yarn web`): requires `react-dom` and `react-native-web` — install with `npx expo install react-dom react-native-web` if Expo warns they are missing.
- NativeWind / `react-native-css-interop` expects **`react-native-worklets`** and **`react-native-reanimated`** — install with:
  - `npx expo install react-native-worklets`
  - `npx expo install react-native-reanimated`
- `babel.config.js` must list **`nativewind/babel` in `presets`**, not in `plugins` (otherwise Babel errors like `.plugins is not a valid Plugin property`).

### 3.2 Point the app at your computer’s IP

The app does **not** use `localhost` on a physical device.

1. Open `pet-health-frontend/src/config.ts`.
2. Set `LOCAL_IP` to the **same IPv4 address** as in the backend startup log (your Wi‑Fi adapter), e.g. `192.168.1.42`.
3. Save the file.

`API_BASE_URL` becomes `http://<LOCAL_IP>:3000/api/v1`.

If you use a **backend tunnel** (§2.6), point config at that base URL instead of `LOCAL_IP`.

### 3.3 Start Expo

From `pet-health-frontend`:

```powershell
yarn start
```

That runs `expo start`. For **physical iPhone + Expo Go**, prefer an explicit mode:

**LAN (same Wi‑Fi, fastest when it works):**

```powershell
npx expo start --go --lan --port 8081
```

**Expo “dev server” tunnel (optional; separate from API ngrok):**

```powershell
npx expo start --go --tunnel --port 8081
```

This uses ngrok (or similar) only for **Metro / Expo**, not your REST API. If it says **ngrok tunnel took too long to connect**, your network may block that path — prefer **`--lan`** for Expo and keep the **backend** on **ngrok `http 3000`** (§2.6.1) so the phone loads JS over LAN/Wi‑Fi but calls **`https://….ngrok-free.app`** for `/api/v1`.

**Clear Metro cache** after adding native deps (e.g. Reanimated):

```powershell
npx expo start --go --lan --port 8081 -c
```

**If port 8081 is already in use** (PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { if ($_ -ne 0) { Stop-Process -Id $_ -Force } }
```

Then:

- **Physical phone (recommended on Windows for iOS):** open **Expo Go** → **Scan QR Code** inside the app (not the iOS Camera “code scanner” alone — that can mis-handle Expo URLs). Same Wi‑Fi as the PC for LAN mode.
- **Android emulator:** requires Android SDK / `adb` on the PC; you can skip Android until you install Android Studio. Do not press `a` in Expo until SDK is set up.
- **iOS Simulator:** Mac + Xcode only — not available on Windows.
- **Web:** `yarn web` — useful for quick UI checks; not a full substitute for camera/native behavior on device.

---

## 4. Devices

### 4.1 Physical phone (recommended for camera / gallery)

1. Install **Expo Go** from App Store / Play Store.
2. Connect phone and PC to the **same Wi‑Fi** (required for **LAN** Expo mode).
3. Set `LOCAL_IP` in `src/config.ts` to your PC’s LAN IP (see BE §2.4).
4. In `pet-health-frontend`, run `yarn start` or `npx expo start --go --lan --port 8081`; in **Expo Go**, use **Scan QR Code** (in-app), not only the system camera.
5. **Sanity check:** on the phone browser, open `http://<LOCAL_IP>:3000/health` — if this fails, the phone cannot reach the backend on LAN (firewall, wrong IP, or AP isolation); use §2.6 + tunnel URL in config, or fix network.
6. If the app says backend unreachable, fix **firewall** (BE §2.5), **LOCAL_IP**, or use a **backend tunnel** (BE §2.6).

### 4.2 Android emulator

- Often `10.0.2.2` maps to the host machine’s `localhost`, but this project uses a fixed **LAN IP**. Easiest path: use your machine’s **actual LAN IP** in `config.ts` (same as for a real phone), with backend listening on `0.0.0.0` (Node default for `app.listen(PORT)` is all interfaces — good).

### 4.3 iOS simulator (Mac only)

- Same as above: `LOCAL_IP` = Mac’s LAN IP, or use `localhost` only if you change `config.ts` for iOS simulator builds (optional tweak; not required if LAN IP works).

---

## 5. Smoke test (happy path)

Do these in order:

1. **Health** — With FE pointed at the right IP, open the app; login screen should show **Backend online** (or fix IP / BE if not).
2. **Sign up** — Create account in app → if Supabase requires email confirmation, confirm email then **Sign in**.
3. **Add pet** — Home → **Add Pet** → name + species (optional avatar URL) → **Save Pet**.
4. **Edit / delete pet** — On Home card, use **Edit** to update fields and **Delete** to remove with confirmation.
5. **Scan** — Select a pet (if needed) → **Scan Health** → **Upload from Gallery** → pick image → **Analyze Image**.
6. **Results** — See diagnosis, severity, disclaimer; optional **warnings** if image upload to storage failed.
7. **History detail** — Bottom tab **History** → tap a row to open full result detail for that entry.

### 5.1 API-only check (optional)

Use Postman / Thunder Client / curl:

1. `POST /api/v1/auth/login` with `{ "email", "password" }` → copy `access_token`.
2. `GET /api/v1/pets` with header `Authorization: Bearer <access_token>`.
3. See `pet-health-backend/context/phase1-api.md` for full contract.

---

## 6. Troubleshooting

| Symptom | What to check |
|---------|----------------|
| `Backend unreachable` on login screen | BE running? **`LOCAL_IP` in `pet-health-frontend/src/config.ts` must match the LAN line from the backend** (e.g. if backend prints `192.168.1.4`, the app cannot still use `192.168.1.5`). Then: same Wi‑Fi, Windows firewall (**§2.5**), retry after restart BE. Test in phone browser: `http://YOUR_LAN_IP:3000/health`. |
| Phone browser cannot open `http://<LAN_IP>:3000/health` or `http://<LAN_IP>:8081` | Network isolation or firewall: set Wi‑Fi to **Private**, allow **Node.js** / port rules (**§2.5**). If still failing, use **backend tunnel** (**§2.6**) and/or avoid relying on LAN to the PC. |
| Expo Go “request timed out” for `exp://<LAN_IP>:8081` | Same as above — PC may be reachable locally but not from phone; confirm Safari on phone can hit LAN URLs; try tunnel mode or fix router AP isolation. |
| `ngrok tunnel took too long to connect` (Expo `--tunnel`) | Network blocks Expo’s tunnel; use **`--lan`** for Metro and use **§2.6.1** ngrok only for **backend port 3000**. |
| Git Bash: `cannot execute binary file` when running `ngrok` | Use **`ngrok.cmd http 3000`** or the **`.exe`** path (§2.6.1); do not rely on the extensionless npm shim in Git Bash. |
| `connection refused: localtunnel.me:…` | Outbound blocked or localtunnel unstable; switch to **ngrok** (§2.6.1). |
| ngrok signup/login returns **HTML** or **parse error** / CORS after ngrok URL | On the **free** tier, send **`ngrok-skip-browser-warning: true`** on every request (see §2.6.1 step 6–7). Ensure the backend was restarted after CORS updates. |
| Postman: **`Cannot POST /auth/signup`** (404) | You called **`/auth/signup`** without the **`/api/v1`** prefix. Use `…/api/v1/auth/signup`, or set collection variable **`BASE`** to `https://<host>/api/v1` so `{{BASE}}/auth/signup` is correct. See `pet-health-backend/context/phase1-api.md` (Postman section). |
| Babel: `.plugins is not a valid Plugin property` (NativeWind) | Put **`nativewind/babel` in `presets`**, not `plugins`, in `babel.config.js`. |
| Babel: `Cannot find module 'react-native-worklets/plugin'` | Run `npx expo install react-native-worklets` in `pet-health-frontend`, restart Expo with `-c`. |
| Metro: `Unable to resolve "react-native-reanimated"` | Run `npx expo install react-native-reanimated`, restart Expo with `-c`. |
| `401` / `Invalid token` | Log in again; token expired; `SUPABASE_ANON_KEY` correct on BE. |
| `503` Supabase auth not configured | `SUPABASE_URL` + `SUPABASE_ANON_KEY` in backend `.env`. |
| `GEMINI_API_KEY is missing` | Set key in backend `.env`, restart BE. |
| Pet create / DB errors | Re-run `supabase-schema.sql`; check service role key. |
| Image upload warnings, no `image_url` | Bucket name matches env; bucket exists; Storage policies if using RLS on storage. |
| Expo Metro bundler issues | `npx expo start --go --lan --port 8081 -c` (or your port) to clear cache. |
| Port 8081 already in use | Kill process on 8081 (**§3.3** PowerShell snippet), then restart Expo. |

---

## 7. Quick command summary

```powershell
# Terminal 1 — Backend
cd pet-health-backend
yarn install
# create .env from .env.example, then:
yarn dev

# Terminal 2 — Backend HTTPS tunnel (when phone cannot use LAN to PC) — §2.6.1
# ngrok config add-authtoken <once>
# PowerShell/CMD: ngrok http 3000
# Git Bash:       ngrok.cmd http 3000
# Then set pet-health-frontend/src/config.ts to the https://….ngrok-free.app base.

# Terminal 3 — Frontend
cd pet-health-frontend
yarn install
# edit src/config.ts LOCAL_IP (or ngrok HTTPS base — §2.6.1), then:
yarn start
# iPhone + Expo Go + LAN (recommended explicit command):
# npx expo start --go --lan --port 8081
```

---

## 8. Related docs

- `PROJECT-CONTEXT.md` — architecture and repo map.
- `pet-health-backend/context/phase1-api.md` — API reference.
- `pet-health-backend/context/supabase-schema.sql` — database DDL.

---

*Add project-specific notes (e.g. your real LAN IP, Supabase project name) below this line for your team.*
