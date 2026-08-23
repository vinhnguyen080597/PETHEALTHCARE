# Chiến lược nâng cấp Escrow (tương lai)

> Mô hình hiện tại: **rao vặt / kết nối** — không giữ tiền.  
> Mục tiêu: bật Escrow sau này **không đập đi làm lại**.

## 1. Kỹ thuật (Codebase & DB)

### Feature flag `marketplace_escrow` (đã triển khai)

| Trạng thái | Hành vi |
|---|---|
| OFF (mặc định) | Chỉ Nhắn tin / Gọi; ẩn đặt cọc |
| ON (pilot) | Deal panel + request deposit |

**Code:** `featureFlagRepository.js`, `featureFlags.ts`, `marketplaceEscrow.ts`, Admin Features (Web + App).

**Legacy:** Deal panel vẫn hiện nếu tin có soft-deal đang dở (`shouldShowMarketplaceDealUi`).

### Giữ schema & API

- Không xóa metadata deal, API deposit/complete, migrations wallet/payout.
- Khi escrow thật: tích hợp PayOS/9Pay + bảng wallet/transactions.

## 2. Pháp lý & Điều khoản

ToS (`legalContent.ts`) có mục **Dịch vụ thanh toán / giữ cọc trong tương lai**:
- Thông báo công khai 15–30 ngày trước khi áp dụng.
- Có thể yêu cầu chấp nhận lại ToS khi mở App.

**Chưa làm:** modal re-accept ToS khi bật flag.

## 3. Vận hành (GTM Hybrid)

- **Kết nối tự do:** mặc định (mô hình Chợ Tốt).
- **Giao dịch đảm bảo:** opt-in / Verified Breeder.
- **Pilot:** 10–20 trại uy tín trước khi mở rộng.

**Phase 2:** whitelist per-breeder escrow; đối soát & khiếu nại pilot.

## Checklist khi bật Escrow thật

1. Tích hợp payment partner (PayOS/9Pay).
2. Cập nhật ToS chi tiết + re-accept flow.
3. Thông báo 15–30 ngày (web, app, email).
4. Bật `marketplace_escrow` cho pilot breeders.
5. Theo dõi dispute/refund SLA trước rollout toàn sàn.

Liên kết: `LEGAL-POLICIES-CONTEXT.md`, `legalContent.ts`.
