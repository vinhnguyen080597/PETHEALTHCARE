# PetCare: Pet Marketplace — Context Chính sách & Nội quy

> Tài liệu tổng hợp để đối chiếu nội bộ / thảo luận với cơ quan nhà nước.  
> **Nguồn sự thật (source of truth) trong code:** `pet-health-web/src/lib/legalContent.ts`  
> **Cập nhật lần cuối (trong sản phẩm):** tháng 9/2026  
> **Mô hình vận hành hiện tại:** nền tảng **rao vặt / kết nối** (kiểu Chợ Tốt) — đăng tin, quảng cáo, chat; **không giữ cọc / escrow / trung gian thanh toán mua thú**.

---

## 1. Tóm tắt vận hành pháp lý

| Hạng mục | Giá trị hiện tại |
|---|---|
| Tên sản phẩm | PetCare: Pet Marketplace (app: Pethub) |
| Mô hình | Hạ tầng công nghệ + đăng tin + quảng cáo/hiển thị; kết nối Sen ↔ Breeder |
| **Không làm** | Không bán thú; không giữ cọc; không trung gian thanh toán mua thú; không vận chuyển thú; không thẩm định giấy phép ĐKKD/thú y/chăn nuôi của từng trại |
| Đơn vị vận hành (VI) | CÔNG TY TNHH PETHUB VIỆT NAM |
| Đơn vị vận hành (EN) | PETHUB VIET NAM COMPANY LIMITED |
| Tên viết tắt | PETHUB VN CO., LTD |
| Trạng thái ĐKKD | Đã có GCN ĐKKD (CT TNHH MTV) — đăng ký lần đầu 15/09/2026 |
| Mã số doanh nghiệp (MST) | 2100720164 |
| Địa chỉ trụ sở | Thửa đất số 516, Tờ bản đồ số 4, Ấp 1, Xã Tam Ngãi, Tỉnh Vĩnh Long, Việt Nam |
| Điện thoại (GCN) | 0354311254 |
| Đại diện pháp luật | VŨ THỊ HỒNG HẠNH — Giám đốc |
| Email pháp lý / báo cáo (sản phẩm) | `pethubvietnam@gmail.com` (tạm) |
| Email hỗ trợ khách hàng | `pethubvietnam@gmail.com` (tạm) |
| Giờ hỗ trợ | 08:30 – 17:30 (Thứ 2 – Thứ 6) |

> **Không công bố trên trang pháp lý công khai:** CCCD, ngày sinh, địa chỉ liên lạc cá nhân chủ sở hữu, email Gmail cá nhân trên GCN (`hanh.vth3112@...`). Email sản phẩm tạm thời: `pethubvietnam@gmail.com` (support + pháp lý).

### Ba tài liệu pháp lý công bố trên sàn

1. **Chính sách bảo mật** — NĐ 13/2023/NĐ-CP; nêu rõ không xử lý tiền mua thú giữa Sen–Breeder  
2. **Điều khoản dịch vụ** — sàn trung gian đăng tin/quảng cáo; miễn trừ giữ tiền + miễn trừ thẩm định giấy phép Breeder  
3. **Nội quy Marketplace** — quy trình kết nối 3 bước; Breeder chịu toàn bộ trách nhiệm giấy phép/nguồn gốc; sàn không hoàn tiền tranh chấp cọc  

### URL công khai

| Tài liệu | URL |
|---|---|
| Chính sách bảo mật | https://pet-marketplace.org/privacy-policy |
| Điều khoản dịch vụ | https://pet-marketplace.org/terms-of-service |
| Nội quy Marketplace | https://pet-marketplace.org/marketplace-guidelines |
| Hỗ trợ | https://pet-marketplace.org/support |

---

## 2. Điểm then chốt (sau khi bỏ escrow)

### Vai trò sàn
- Cung cấp **đăng tin, quảng cáo/hiển thị, chat/kết nối**.
- Có thể **thu phí dịch vụ kỹ thuật** từ người đăng tin (đẩy tin, ads…) — **không** phải tiền cọc mua thú.
- **KHÔNG** tiếp nhận / giữ / giải ngân tiền giữa Sen và Breeder.

### Trách nhiệm Breeder (bắt buộc trong ToS + Nội quy + checkbox đăng tin)
- ĐKKD / thuế (nếu thuộc diện).
- Điều kiện vệ sinh thú y / giấy phép chăn nuôi (nếu thuộc diện).
- Nguồn gốc hợp pháp, sổ tiêm, sức khỏe thú.
- Mọi rủi ro nhận cọc/thanh toán **trực tiếp ngoài app**.

### Miễn trừ của sàn
- Không thẩm định / chứng nhận giấy phép từng trại.
- Nhãn Verified = **phân loại kỹ thuật**, không phải chứng nhận pháp lý.
- Không hoàn tiền / bồi thường tranh chấp cọc giữa người dùng; hỗ trợ khóa tài khoản + cung cấp log cho Công an khi có yêu cầu hợp lệ.

### Quy trình giao dịch (thay “4 bước giữ cọc”)
1. Tìm kiếm & liên hệ (chat / SĐT).  
2. Tự thỏa thuận ngoài (giá, cọc nếu có, bảo hành, vận chuyển).  
3. Kiểm tra trực tiếp trước khi chuyển tiền / bàn giao.

---

## 3–6. Toàn văn VI

Nội dung đầy đủ EN/VI nằm trong `legalContent.ts`. Tóm tắt mục lục VI:

### Chính sách bảo mật
- Thu thập: tài khoản, hồ sơ tin/Breeder, chat/báo cáo, kỹ thuật, **dịch vụ trả phí nền tảng** (nếu có).
- Không bán dữ liệu; **không giữ tiền mua thú**.
- Quyền chủ thể: sửa / xóa tài khoản; xử lý trong 72 giờ làm việc (trừ lưu trữ bắt buộc).

### Điều khoản dịch vụ
- Vai trò trung gian đăng tin/quảng cáo; **miễn trừ giữ tiền**; **miễn trừ thẩm định giấy phép**.
- Dịch vụ kỹ thuật có thu phí.
- Trách nhiệm Seller/Buyer; gỡ tin 24h; miễn trừ nội dung & tổn thất giao dịch ngoài; license media; kiểm duyệt tài khoản.

### Nội quy Marketplace
- Tin đăng trung thực; mục **Trách nhiệm pháp lý & giấy phép Breeder**.
- Cấm ĐVHD / Sách Đỏ / CITES — người đăng chịu trách nhiệm.
- Không vận chuyển; không giữ tiền.
- **Quy trình kết nối & giao dịch ngoài ứng dụng** (3 bước).
- Tranh chấp tài chính: sàn **không hoàn/bồi thường**; khóa TK + hỗ trợ Công an.
- Media truyền thông; xử lý vi phạm.

### Hỗ trợ
- Email, giờ làm việc; hướng dẫn gửi kèm bằng chứng báo cáo; nhắc không giữ cọc.

---

## 7. Checklist trước khi làm việc với cơ quan

- [x] Điền tên công ty + MST + địa chỉ trụ sở + đại diện pháp luật trong `legalContent.ts` (từ GCN ĐKKD 15/09/2026).
- [ ] Deploy web để trang Privacy/ToS/Support hiển thị thông tin mới trên `pet-marketplace.org`.
- [ ] Đăng ký thông báo website TMĐT / Bộ Công Thương (khi đủ hồ sơ).
- [ ] Nhấn mạnh mô hình **rao vặt/kết nối**, **không escrow**.
- [ ] Nhấn mạnh Breeder tự chịu trách nhiệm giấy phép & nguồn gốc thú.
- [ ] URL 3 trang pháp lý hiển thị đúng bản VI.
- [ ] **Product follow-up:** ẩn/gỡ UI “đặt cọc qua sàn” còn sót (deal panel) để khớp chính sách — hiện mới cập nhật pháp lý + disclaimer công khai.

---

## 8. Đồng bộ khi chỉnh sửa

1. Sửa `pet-health-web/src/lib/legalContent.ts` (EN + VI).  
2. Chạy test web (`test/legalContent.test.ts`).  
3. Deploy web.  
4. Cập nhật lại file này.

---

*Aligned to classified / Chợ Tốt model — September 2026. Operator fields filled from GCN ĐKKD; deploy web next.*


