# Error Handling Rulebook

## 1) Goal

- End users should only see friendly, actionable messages.
- Technical details (stack trace, provider payload, raw SQL/Supabase errors) must be hidden from users.
- Admin receives error details by email for investigation.

## 2) Public error contract

Backend response format:

```json
{
  "error": "Human-friendly message",
  "code": "MACHINE_READABLE_CODE",
  "retryAfterSeconds": 120
}
```

- `error`: safe text for user UI.
- `code`: stable key for frontend mapping/i18n.
- `retryAfterSeconds`: optional (cooldown/rate-limit style errors).

## 3) Error code set (v1)

### Validation / input
- `INVALID_INPUT`: request payload invalid.
- `MEDIA_TOO_LARGE`: uploaded file exceeds limit.

### Analysis traffic guardrails
- `ANALYSIS_IN_PROGRESS`: same pet already has an in-flight request.
- `ANALYSIS_COOLDOWN`: cooldown window not finished.
- `ANALYSIS_RATE_LIMIT_HOUR`: hourly cap exceeded.
- `ANALYSIS_RATE_LIMIT_DAY`: daily cap exceeded.

### AI provider layer
- `AI_QUOTA_EXCEEDED`: provider quota/rate limits exceeded.
- `AI_MODEL_UNAVAILABLE`: selected model unavailable/not found.

### System
- `INTERNAL_ERROR`: fallback for unexpected system errors.

## 4) Backend policy

- 4xx business errors: return safe message + code directly.
- Upstream/provider/internal errors: return generic user-safe message and `INTERNAL_ERROR` or mapped AI code.
- Always log full technical detail on server.
- Send alert email for severe/internal failures (5xx, model unavailable, infra/security-like errors).

## 5) Frontend policy

- Map by `code` first; do not rely on raw message text.
- Use i18n keys per error code.
- Keep inline UX calm: suggest retry timing, avoid technical jargon.

## 6) Operations checklist

- Configure SMTP env vars in backend `.env`.
- Set `ALERT_ERROR_TO_EMAIL` to owner/ops mailbox.
- Verify by forcing a controlled error on staging.
- Add monitoring later (budget + error rate dashboards) for proactive alerts.

## 7) Admin test endpoint

- Endpoint: `POST /api/v1/admin/test-alert-email`
- Header required: `x-admin-secret: <ADMIN_INTERNAL_API_KEY>`
- Success response:

```json
{
  "data": {
    "ok": true,
    "messageId": "<smtp-message-id>"
  }
}
```

- Purpose: quickly validate SMTP + alert pipeline without waiting for real failures.

