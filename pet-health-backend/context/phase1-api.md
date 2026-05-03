# Phase 1 API Contract (Expo Integration)

Base URL (local): `http://localhost:3000`

Version prefix: `/api/v1`

### Postman / Insomnia / `{{BASE}}` variables

Use **one** of these patterns so paths match this document:

1. **Recommended:** set **`BASE` = full API root including `/api/v1`**  
   - Example (ngrok): `https://contest-patronage-sank.ngrok-free.dev/api/v1`  
   - Example (LAN): `http://192.168.1.4:3000/api/v1`  
   - Then request URL is: `{{BASE}}/auth/signup` → `…/api/v1/auth/signup` ✓  

2. **Alternative:** set **`BASE` = origin only** (no `/api/v1`)  
   - Example: `https://contest-patronage-sank.ngrok-free.dev`  
   - Then every path must include the prefix: `{{BASE}}/api/v1/auth/signup` ✓  
   - **`{{BASE}}/auth/signup` is wrong** → Express returns `Cannot POST /auth/signup` (404).

**Ngrok free (browser / Postman):** add header `ngrok-skip-browser-warning: true` on every request (or use the mobile app, which sends it when configured as in `pet-health-frontend/src/api.ts`).

---

## 1) Health Check

### GET `/health`

Use this endpoint to verify backend status.

Response `200`:

```json
{
  "status": "ok",
  "service": "pet-health-backend",
  "timestamp": "2026-04-30T08:00:00.000Z"
}
```

---

## 2) Auth (Supabase Email)

### POST `/api/v1/auth/signup`

Body:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response `201`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "session": null
  }
}
```

### POST `/api/v1/auth/login`

Body:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response `200`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "session": {
      "access_token": "..."
    }
  }
}
```

Notes:
- Protected endpoints require Supabase access token in Bearer format.
- After login, store `data.session.access_token`.

---

## 3) Pet Management (CRUD)

Required header for all pet endpoints:

`Authorization: Bearer <access_token>`

### GET `/api/v1/pets`

Response `200`:

```json
{
  "data": [
    {
      "id": "pet-uuid",
      "user_id": "user-uuid",
      "name": "Milo",
      "species": "cat",
      "breed": "Persian",
      "age": 2,
      "avatar_url": "https://...",
      "created_at": "2026-04-30T08:05:00.000Z"
    }
  ]
}
```

### POST `/api/v1/pets`

Body:

```json
{
  "name": "Milo",
  "species": "cat",
  "breed": "Persian",
  "age": 2,
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

Response `201`:

```json
{
  "data": {
    "id": "pet-uuid",
    "user_id": "user-uuid",
    "name": "Milo",
    "species": "cat",
    "breed": "Persian",
    "age": 2,
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2026-04-30T08:05:00.000Z"
  }
}
```

### GET `/api/v1/pets/:petId`

Response `200`:

```json
{
  "data": {
    "id": "pet-uuid",
    "user_id": "user-uuid",
    "name": "Milo",
    "species": "cat",
    "breed": "Persian",
    "age": 2,
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2026-04-30T08:05:00.000Z"
  }
}
```

### PUT `/api/v1/pets/:petId`

Body (partial update supported):

```json
{
  "name": "Milo Updated",
  "age": 3
}
```

Response `200`:

```json
{
  "data": {
    "id": "pet-uuid",
    "user_id": "user-uuid",
    "name": "Milo Updated",
    "species": "cat",
    "breed": "Persian",
    "age": 3,
    "avatar_url": "https://example.com/avatar.jpg",
    "created_at": "2026-04-30T08:05:00.000Z"
  }
}
```

### DELETE `/api/v1/pets/:petId`

Response `204` with empty body.

---

## 4) AI Diagnosis

Required header:

`Authorization: Bearer <access_token>`

### POST `/api/v1/analysis`

Content-Type: `multipart/form-data`

Form fields:
- `petId` (string, required)
- `image` (file, required, `jpeg/png/webp`, max 5MB)

Response `200`:

```json
{
  "data": {
    "id": "analysis-uuid",
    "user_id": "user-uuid",
    "pet_id": "pet-uuid",
    "diagnosis": "Possible fungal skin infection",
    "severity": "medium",
    "symptoms": ["hair loss", "red patches"],
    "treatment": "Keep area clean and dry; consult vet for antifungal confirmation.",
    "confidence": 0.74,
    "disclaimer": "This AI response is not a final medical diagnosis.",
    "image_url": "https://.../pet-diagnosis-images/...",
    "created_at": "2026-04-30T08:15:00.000Z"
  },
  "metadata": {
    "fileType": "image/jpeg",
    "fileSize": 182934
  },
  "warnings": []
}
```

If image storage is temporarily unavailable, response still returns `200` with saved diagnosis and:

```json
{
  "warnings": ["Image upload failed. Diagnosis was saved without image."]
}
```

---

## 5) Diagnosis History

Required header:

`Authorization: Bearer <access_token>`

### GET `/api/v1/analysis/:petId`

Response `200`:

```json
{
  "data": [
    {
      "id": "analysis-uuid",
      "user_id": "user-uuid",
      "pet_id": "pet-uuid",
      "diagnosis": "Possible fungal skin infection",
      "severity": "medium",
      "symptoms": ["hair loss", "red patches"],
      "treatment": "Keep area clean and dry; consult vet for antifungal confirmation.",
      "confidence": 0.74,
      "disclaimer": "This AI response is not a final medical diagnosis.",
      "image_url": "https://.../pet-diagnosis-images/...",
      "created_at": "2026-04-30T08:15:00.000Z"
    }
  ]
}
```

---

## 6) Common Errors

Standard error format:

```json
{
  "error": "error message here"
}
```

Typical status codes:
- `400`: Missing/invalid input (e.g. no image, no `petId`)
- `401`: Missing/invalid bearer token for protected routes
- `404`: Resource not found (pet not found)
- `500`: Server/internal error
- `503`: Supabase auth not configured for auth endpoints

---

## 7) Expo Integration Notes

- Save `access_token` after login and pass it in `Authorization` header.
- Compress images before upload to reduce token/bandwidth cost.
- Keep camera upload to max 5MB.
- Show AI output with clear severity badges: `low`, `medium`, `high`.

---

## 8) Implementation Notes (Current Backend Behavior)

- **AI JSON robustness:** Backend sanitizes model output before parse. If Gemini returns markdown fenced JSON (e.g. ```json ... ```), fences are stripped and JSON is parsed safely.
- **Confidence normalization:** `confidence` is clamped to `0..1` before saving/returning.
- **Expo physical device testing:** On server startup, backend logs LAN URLs in addition to localhost. Use the LAN URL (e.g. `http://192.168.x.x:3000`) for Expo Go on real devices.
