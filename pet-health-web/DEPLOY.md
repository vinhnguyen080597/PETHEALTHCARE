# Deploy Pet Marketplace Web (`pet-health-web`)

Domain đích: **https://pet-marketplace.org**  
Repo GitHub (duy nhất): **`PETHEALTHCARE`** — monorepo (web nằm ở `pet-health-web/`)  
API: Render backend `https://pet-health-backend-serb.onrender.com`

> Hiện domain đang trỏ **GitHub Pages** (`docs/`). Deploy Next app = **cutover DNS** sang Vercel (hoặc host Node tương đương).

---

## 1. Chuẩn bị đã xong trong repo

- [x] `yarn build` thành công (App Router + API routes)
- [x] Legal routes: `/privacy-policy`, `/terms-of-service`, `/marketplace-guidelines`, `/support`
- [x] Marketplace routes: `/`, `/login`, `/app/pet-feed`, `/app/breeders`, …
- [x] `.env.example` + `vercel.json` (root directory)
- [x] AASA stub: `public/.well-known/apple-app-site-association` (**điền Apple Team ID** trước khi go-live Universal Links)

---

## 2. Biến môi trường Vercel (Production)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_ORIGIN` | `https://pet-health-backend-serb.onrender.com` |
| `NEXT_PUBLIC_SITE_ORIGIN` | `https://pet-marketplace.org` |
| `NEXT_PUBLIC_SUPABASE_URL` | Same `SUPABASE_URL` as Render backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same `SUPABASE_ANON_KEY` as Render backend (public) |
| `NEXT_PUBLIC_IOS_APP_STORE_URL` | `https://apps.apple.com/app/id6778684107` |
| `NEXT_PUBLIC_IOS_APP_STORE_ID` | `6778684107` |

**Preview** (optional): đặt `NEXT_PUBLIC_SITE_ORIGIN` = URL `*.vercel.app`, và thêm origin đó vào `CORS_ORIGINS` trên Render. Thêm luôn `https://*.vercel.app/api/auth/oauth/callback` (hoặc URL preview cụ thể) vào Supabase Redirect URLs.

### Social login (Google / Facebook)

1. Supabase Dashboard → **Authentication → Providers** → bật **Google** và **Facebook**, dán Client ID/Secret từ Google Cloud / Meta.
2. Google Cloud → OAuth client → **Authorized redirect URIs** = `https://<project-ref>.supabase.co/auth/v1/callback` (không phải domain marketplace).
3. Meta App → Facebook Login → Valid OAuth Redirect URIs = cùng URL Supabase callback ở trên.
4. Supabase → **URL Configuration** → Redirect URLs:
   - `http://localhost:3001/api/auth/oauth/callback`
   - `https://pet-marketplace.org/api/auth/oauth/callback`
5. Web gọi `/api/auth/oauth/callback` (PKCE) → set cookie session → gọi `/auth/me` để tạo account profile (`sen`) nếu chưa có.

---

## 3. Tạo project Vercel (1 repo monorepo)

Chỉ có **một** GitHub repo: `PETHEALTHCARE` (chung backend / mobile / web).  
Không tạo repo riêng cho web — import đúng repo đó, rồi trỏ Root Directory vào thư mục web.

1. [vercel.com/new](https://vercel.com/new) → **Import** repo **`PETHEALTHCARE`** (duy nhất)
2. Trước khi Deploy, mở **Root Directory** → Edit → chọn **`pet-health-web`**  
   (để Vercel không build cả monorepo, chỉ Next app)
3. Framework Preset: **Next.js** (auto)
4. Install / Build: để mặc định hoặc `yarn` / `yarn build` (chạy trong `pet-health-web`)
5. Dán 4 env Production ở mục 2 → **Deploy**

> Nếu quên Root Directory: Project → Settings → General → Root Directory → `pet-health-web` → Redeploy.

Hoặc CLI (từ máy local, vẫn dùng cùng repo):

```bash
cd pet-health-web
npx vercel          # link project, chọn repo PETHEALTHCARE + root pet-health-web
npx vercel --prod
```

---

## 4. Domains trên Vercel + đổi DNS từ GitHub Pages

Mục tiêu: `pet-marketplace.org` và `www.pet-marketplace.org` phục vụ **deployment Vercel** (Next app), không còn GitHub Pages.

### 4.1. Thêm domain trong Vercel (làm trước khi sửa DNS)

1. Mở project Vercel (repo `PETHEALTHCARE`, Root = `pet-health-web`).
2. Vào **Settings → Domains**.
3. Ô **Domain** → nhập `pet-marketplace.org` → **Add**.
4. Vercel thường hỏi thêm `www` — chọn **Add `www.pet-marketplace.org`**.
5. Chọn hướng redirect (khuyến nghị khớp env):
   - **Primary:** `pet-marketplace.org`  
   - **Redirect:** `www.pet-marketplace.org` → `pet-marketplace.org`  
   (vì `NEXT_PUBLIC_SITE_ORIGIN=https://pet-marketplace.org`)
6. Trên từng domain card, Vercel hiện trạng thái **Invalid Configuration** và **đúng record DNS cần dùng** — **copy giá trị từ đây** (ưu tiên hơn bảng mẫu bên dưới).

Giá trị thường gặp (kiểm tra lại trên UI):

| Host | Type | Value (mẫu) |
|------|------|-------------|
| `@` / `pet-marketplace.org` | **A** | `76.76.21.21` |
| `www` | **CNAME** | `cname.vercel-dns.com` **hoặc** target dạng `xxxx.vercel-dns-017.com` (theo Domains card) |

> Không dùng CNAME cho apex (`@`). Chỉ dùng A (hoặc Nameservers Vercel).

---

### 4.2. Xem DNS GitHub Pages đang dùng (để biết cái cần xóa)

Domain đang trỏ Pages thường có:

| Type | Name | Value cũ (GitHub Pages) |
|------|------|-------------------------|
| A | `@` | `185.199.108.153` / `.109.153` / `.110.153` / `.111.153` |
| CNAME | `www` | `vinhnguyen080597.github.io` (hoặc tương tự) |

Nơi sửa DNS = **nhà đăng ký domain** (Namecheap, GoDaddy, Cloudflare DNS, …) — **không** phải GitHub.

Nếu domain đang **proxy Cloudflare (cam)**: vẫn sửa record tại Cloudflare; sau cutover có thể giữ Proxy ON hoặc DNS-only (xám). Worker share (`/app/pet-feed/*`) nếu còn, kiểm tra lại sau khi origin đổi sang Vercel.

---

### 4.3. Đổi DNS sang Vercel (cutover)

Làm lần lượt tại DNS provider:

1. **Xóa** toàn bộ A record apex cũ trỏ GitHub (`185.199.*`).
2. **Thêm** 1 A record:
   - Name/Host: `@` (hoặc để trống / `pet-marketplace.org` tùy UI)
   - Value: `76.76.21.21` (hoặc IP Vercel hiện trên Domains card)
   - TTL: Auto / 300
3. **Xóa** CNAME `www` cũ (`*.github.io`).
4. **Thêm** CNAME `www`:
   - Name: `www`
   - Value: đúng target Vercel copy từ Domains card (ví dụ `cname.vercel-dns.com`)
5. **Save** / Apply.
6. Quay lại Vercel → Domains → đợi chuyển **Valid Configuration** + SSL **Valid** (vài phút–vài giờ).

Kiểm tra máy local (PowerShell):

```powershell
nslookup pet-marketplace.org
nslookup www.pet-marketplace.org
# hoặc
Resolve-DnsName pet-marketplace.org -Type A
Resolve-DnsName www.pet-marketplace.org -Type CNAME
```

Apex phải ra IP Vercel; `www` phải CNAME về `*.vercel-dns*`.

---

### 4.4. Tắt GitHub Pages custom domain (tránh xung đột)

1. GitHub → repo `PETHEALTHCARE` → **Settings → Pages**.
2. **Custom domain:** xóa `pet-marketplace.org` → Save.
3. Bỏ tick “Enforce HTTPS” trên Pages nếu còn (không còn cần).
4. (Tuỳ chọn) tắt Pages site nếu không còn dùng `docs/` làm production.

Giữ branch `docs/` trong repo cũng được — chỉ là không còn gắn domain.

---

### 4.5. Checklist sau khi SSL xanh

- [ ] `https://pet-marketplace.org` mở site Next (không còn landing Pages cũ)
- [ ] `https://www.pet-marketplace.org` redirect đúng về apex
- [ ] Vercel Domains: cả 2 domain **Valid**
- [ ] Render: `CORS_ORIGINS` có `https://pet-marketplace.org` (+ www)
- [ ] Login HTTPS hoạt động (cookie `Secure`)

---

### 4.6. Rollback nhanh về GitHub Pages

Nếu cần quay lại ngay:

1. Domains DNS: khôi phục 4× A `185.199.108–111.153` + CNAME `www` → `….github.io`
2. GitHub Pages → gắn lại Custom domain `pet-marketplace.org` + Enforce HTTPS
3. Đợi DNS/SSL Pages

---

## 5. Backend Render (bắt buộc)

Trên service `pet-health-backend`:

```
CORS_ORIGINS=https://pet-marketplace.org,https://www.pet-marketplace.org,https://YOUR-PROJECT.vercel.app
PUBLIC_SITE_ORIGIN=https://pet-marketplace.org
ALLOW_OPEN_CORS=false
```

Redeploy backend sau khi đổi env.

---

## 6. Universal Links (iOS)

1. Mở `pet-health-web/public/.well-known/apple-app-site-association`
2. Thay `TEAMID` bằng Apple Team ID thật → `TEAMID.com.pethealthcare.app`
3. File **không** có extension; Content-Type nên là `application/json` (Vercel phục vụ OK từ `public/`)
4. Verify: `https://pet-marketplace.org/.well-known/apple-app-site-association`

Android: `assetlinks.json` có thể bổ sung sau (package `com.pethealthcare.app`).

---

## 7. Smoke test sau go-live

- [ ] `https://pet-marketplace.org` — homepage
- [ ] `/login` — đăng nhập / đăng ký, cookie HTTPS
- [ ] `/app/pet-feed` + chi tiết tin
- [ ] `/app/breeders` + profile
- [ ] Legal pages mở được
- [ ] CORS: login không bị block console
- [ ] Share OG (Zalo/FB) nếu đang dùng Cloudflare Worker — cập nhật hoặc dựa metadata Next

---

## 8. Rollback nhanh

Trỏ lại DNS A/CNAME về GitHub Pages nếu cần downtime ngắn trong lúc fix Vercel.
