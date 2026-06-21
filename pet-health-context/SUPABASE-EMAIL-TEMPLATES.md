# Supabase email templates (OTP)

Pet Health Care uses **numeric OTP in the app**, not magic links in the browser.

## Signup OTP

**Dashboard → Authentication → Email Templates → Confirm signup**

Body must include:

```text
{{ .Token }}
```

Do **not** rely on `{{ .ConfirmationURL }}` alone for signup.

---

## Change email OTP

The backend sends OTP to the **new email** via `signInWithOtp()` — the same mechanism as signup.

So the email the user receives uses the **Confirm signup** template (subject/body you already configured for registration), **not** the “Change Email Address” template.

### What you need in Supabase

1. **Confirm signup** template must show `{{ .Token }}` (8 digits in this project).
2. You do **not** need to customize “Change Email Address” for in-app OTP anymore (that template’s `{{ .Token }}` is often empty when using `updateUser()`, which is why emails looked blank).

### Flow

1. User enters new email + current password → backend verifies password.
2. Backend calls `signInWithOtp({ email: newEmail })` → Supabase sends **Confirm signup** email with OTP to the new address.
3. User enters OTP in the app → backend verifies OTP, updates the real account email, removes the temporary auth row created only for OTP verification.

### If email still looks empty

- Open the message fully in Gmail (not only the inbox preview line).
- Check **Confirm signup** template (not Change Email Address).
- Check Spam/Junk.
- Ensure the template body includes `{{ .Token }}` and some plain text (not only HTML that clients strip).

---

## Password reset (“Lấy lại mật khẩu”)

This flow uses **`resetPasswordForEmail`** → email template **Reset password**, with **OTP in the app** (not a magic link).

### Supabase Dashboard

1. **Authentication → Email Templates → Reset password**
2. Body must include **`{{ .Token }}`** (8 digits in this project)
3. Do **not** rely on `{{ .ConfirmationURL }}` alone — the user enters OTP + new password inside the app

### Template example (Vietnamese)

**Subject:**

```text
Đặt lại mật khẩu Pet Health Care
```

**Body (Source):**

```html
<h2>Đặt lại mật khẩu</h2>

<p>Pet Health Care nhận được yêu cầu đặt lại mật khẩu cho tài khoản của Sen.</p>
<p>Mã OTP của Sen là:</p>
<p><strong>{{ .Token }}</strong></p>
<p>Nhập mã này cùng mật khẩu mới trong app Pet Health Care.</p>
<p>Nếu Sen không yêu cầu, có thể bỏ qua email này.</p>
```

### Template variables for reset password

| Variable | Use |
|----------|-----|
| `{{ .Token }}` | **Required** — 8-digit OTP entered in the app |
| `{{ .ConfirmationURL }}` | Not used in this app’s recover flow |
| `{{ .SiteURL }}` | Site base URL from Auth settings |
| `{{ .Email }}` | User email |

### Flow

1. User opens **Cập nhật tài khoản → Lấy lại mật khẩu** → taps **Gửi mã OTP**.
2. Backend calls `resetPasswordForEmail` → Supabase sends **Reset password** email with OTP.
3. User enters OTP + new password in the modal → backend verifies OTP (`type: 'recovery'`), updates password, refreshes session.
