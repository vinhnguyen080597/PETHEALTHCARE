# Pre-Release Checklist (PetHealthCare)

Tài liệu này tổng hợp các lưu ý quan trọng cần xử lý trước khi release production.

## 1) Security & Secrets (Must-do)

- [ ] **Không commit secret thật** vào git (`.env`, API keys, SMTP app password, Supabase service role key).
- [ ] Kiểm tra lại `pet-health-backend/.env.example` và `pet-health-frontend/.env.example` chỉ chứa placeholder.
- [ ] **Rotate key ngay** nếu từng lộ key trong logs/chat/screenshot.
- [ ] Đảm bảo `.gitignore` đã bỏ qua toàn bộ file env local.
- [ ] Tắt các endpoint/debug flow nội bộ trước release public.

## 2) Tạm thời chỉ dành cho build/dev (Bắt buộc gỡ trước release)

- [ ] Gỡ cơ chế gửi `x-admin-secret` từ frontend cho mọi request.
  - Hiện tại frontend đang đọc `EXPO_PUBLIC_ADMIN_INTERNAL_API_KEY` và tự động add header.
  - Với app public, secret này có thể bị lộ trong bundle.
- [ ] Gỡ hoặc khóa chặt endpoint `POST /api/v1/admin/test-alert-email`.
  - Nếu vẫn giữ, bắt buộc giới hạn bằng allowlist IP/VPN và secret mạnh.
- [ ] Xóa `EXPO_PUBLIC_ADMIN_INTERNAL_API_KEY` khỏi môi trường build production.

## 3) Error Handling & User Experience

- [ ] Duy trì policy: user chỉ thấy lỗi thân thiện, không thấy raw error từ provider.
- [ ] Chuẩn hóa mọi response lỗi theo contract:
  - `{ error, code, retryAfterSeconds? }`
- [ ] Frontend map theo `code` (không regex theo message kỹ thuật).
- [ ] Kiểm tra đầy đủ i18n cho EN/VI cho các mã lỗi chính:
  - `ANALYSIS_IN_PROGRESS`, `ANALYSIS_COOLDOWN`, `ANALYSIS_RATE_LIMIT_HOUR`, `ANALYSIS_RATE_LIMIT_DAY`
  - `AI_QUOTA_EXCEEDED`, `AI_MODEL_UNAVAILABLE`, `INTERNAL_ERROR`
- [ ] Nếu bật debug logs để xử lý sự cố:
  - `AI_DEBUG_LOG_ENABLED=true`
  - `LOG_ALL_REQUESTS=true`
  - Chỉ bật tạm thời; tắt lại trước release production.

## 4) Alerting & Ops

- [ ] Xác thực SMTP production (không dùng account cá nhân nếu scale).
- [ ] Bật chống spam alert mail (`ALERT_MIN_INTERVAL_SECONDS`) phù hợp.
- [ ] Thiết lập mailbox vận hành riêng (vd: `alerts@...`) thay vì mail cá nhân.
- [ ] Định nghĩa ai trực on-call khi nhận mail lỗi.
- [ ] Viết runbook xử lý khi gặp `AI_QUOTA_EXCEEDED`, `AI_MODEL_UNAVAILABLE`, `INTERNAL_ERROR`.

## 5) AI Cost Control (Production hardening)

- [ ] Chuyển cache/lock/rate-limit từ memory sang Redis (multi-instance safe).
- [ ] Giữ in-flight lock + cooldown + rate limits ở mức an toàn theo phase launch.
- [ ] Thiết lập budget alert trên Google Cloud (ngưỡng ngày/tuần/tháng).
- [ ] Theo dõi KPI: cache hit rate, blocked rate, cost/scan, lỗi theo mã.
- [ ] Chốt model policy:
  - default low-cost model,
  - fallback có kiểm soát theo quality/confidence.

## 6) Functional Readiness

- [ ] Test end-to-end các luồng chính:
  - Đăng ký/đăng nhập,
  - Tạo/sửa/xóa pet,
  - Health check (ảnh/video),
  - Progress screen,
  - Kết quả + history.
- [ ] Test dữ liệu biên:
  - Ảnh mờ/không rõ,
  - Ảnh không phải chó/mèo,
  - Thiếu dữ liệu mô tả,
  - Upload lỗi / timeout mạng.
- [ ] Đảm bảo nút analyze bị disable đúng khi cooldown/in-progress.

## 7) Product Scope Pending (đã thống nhất, làm sau)

- [ ] Onboarding tích hợp: tạo pet + health check đầu tiên trong 1 flow.
- [ ] Cờ `has_completed_onboarding` ở backend profile.
- [ ] Quota scan/pay-per-scan.
- [ ] Rewarded ads.
- [ ] Premium subscription.
- [ ] Affiliate recommendation layer (kèm compliance review).

## 8) Pre-Release Gate (Go / No-go)

Chỉ release khi tất cả điều kiện sau đạt:

- [ ] Không còn debug secret trong frontend build.
- [ ] Không lộ secret trong repo/artifact.
- [ ] Error mapping + i18n đầy đủ và đã test.
- [ ] SMTP alert hoạt động + không spam.
- [ ] Cost guardrails hoạt động đúng, có monitoring cơ bản.
- [ ] QA pass cho luồng chính trên thiết bị thật.

