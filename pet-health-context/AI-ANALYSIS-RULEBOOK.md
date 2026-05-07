# AI Health Check Rulebook (Dog/Cat)

Tài liệu này chuẩn hóa cách AI phân tích ảnh health check để đạt 3 mục tiêu:

1. Ổn định chất lượng kết quả.
2. Giảm false confidence khi dữ liệu kém.
3. Trả thông điệp rõ ràng để frontend hướng dẫn người dùng bổ sung dữ liệu đúng cách.

---

## 1) Input policy (trước khi gọi AI)

### 1.1 Loài hỗ trợ

- Chỉ hỗ trợ: `dog`, `cat`.
- Nếu dữ liệu không cho thấy rõ là chó/mèo -> không chẩn đoán bệnh, trả trạng thái cần chụp lại.

### 1.2 Ảnh

- Tối thiểu kỹ thuật: 1 ảnh.
- Khuyến nghị UX: 3 ảnh.
- Tối đa gửi model: 4 ảnh tốt nhất (dù client có thể upload nhiều hơn).
- Góc chụp khuyến nghị:
  - 1 ảnh toàn thân.
  - 1–2 ảnh cận vùng nghi ngờ.
  - 1 ảnh góc phụ để đối chiếu.

### 1.3 Video

- Không bắt buộc.
- Chỉ khuyến nghị khi triệu chứng liên quan vận động/hô hấp/hành vi bất thường.
- Clip ngắn 5–10 giây, đủ sáng, tập trung 1 triệu chứng chính.

### 1.4 Metadata

Nên có tối thiểu:

- `species`, `age`, `weightKg`, `symptomDescription`.
- Nếu thiếu nhiều metadata: vẫn phân tích nhưng giảm confidence và yêu cầu bổ sung.

---

## 2) Output contract chuẩn (AI -> backend)

> Backend nên yêu cầu model trả JSON theo schema dưới đây.  
> Các trường legacy (`diagnosis`, `severity`, `symptoms`, `treatment`, `confidence`, `disclaimer`) vẫn giữ để tương thích client hiện tại.

```json
{
  "status": "ok",
  "diagnosis": "possible condition name",
  "severity": "low",
  "symptoms": ["symptom 1"],
  "treatment": "safe first-aid guidance",
  "confidence": 0.82,
  "disclaimer": "This is not a final veterinary diagnosis.",
  "red_flags": [],
  "diagnosis_candidates": [
    { "name": "Dermatitis", "confidence": 0.82 },
    { "name": "Fungal infection", "confidence": 0.54 }
  ],
  "evidence": [
    "localized redness on ear edge",
    "patchy hair loss around lesion"
  ],
  "missing_data": [],
  "next_action": {
    "summary": "Monitor 24-48h and keep area clean.",
    "ask_user_to_add": []
  }
}
```

### 2.1 `status` enum

- `ok`: dữ liệu đủ để đưa triage sơ bộ.
- `need_more_data`: dữ liệu chưa đủ/chất lượng thấp, cần user bổ sung.
- `not_pet_or_unclear`: ảnh không phải chó/mèo hoặc không nhận diện chắc chắn.
- `emergency_flag`: có dấu hiệu nguy hiểm, cần đi khám ngay.

### 2.2 Rule confidence

- `>= 0.75`: có thể hiển thị nhận định chính.
- `0.45 - 0.74`: nhận định tạm, luôn kèm yêu cầu bổ sung.
- `< 0.45`: chuyển `need_more_data`, không hiển thị kết luận mạnh.

### 2.3 Rule red-flag

Nếu có dấu hiệu nghiêm trọng (khó thở rõ rệt, co giật, chảy máu nhiều, bất tỉnh, liệt, nôn/tiêu chảy nặng kéo dài), bắt buộc:

- `status = emergency_flag`
- `severity = high`
- `next_action.summary` ưu tiên đưa đi cơ sở thú y sớm.

---

## 3) System prompt production-ready (English)

> Khuyến nghị dùng prompt tiếng Anh cho model ổn định hơn; UI vẫn hiển thị tiếng Việt ở frontend.

```text
You are a veterinary triage assistant for PET HEALTH CHECK.

Scope:
- You only support dogs and cats.
- You must analyze uploaded media plus owner-provided context.
- You provide triage guidance, not a definitive diagnosis.

Safety rules:
1) Do NOT invent findings not visible in the media or context.
2) If image quality/species certainty is insufficient, set status to "need_more_data" or "not_pet_or_unclear".
3) If severe emergency signs are present, set status to "emergency_flag", severity "high", and advise urgent in-person veterinary care.
4) Keep treatment advice conservative and safe (home-care + when to escalate).
5) Confidence must reflect uncertainty honestly.

Output format:
- Return STRICT JSON only.
- Follow exactly this schema:
{
  "status": "ok|need_more_data|not_pet_or_unclear|emergency_flag",
  "diagnosis": "string",
  "severity": "low|medium|high",
  "symptoms": ["string"],
  "treatment": "string",
  "confidence": 0.0,
  "disclaimer": "string",
  "red_flags": ["string"],
  "diagnosis_candidates": [{"name":"string","confidence":0.0}],
  "evidence": ["string"],
  "missing_data": ["string"],
  "next_action": {
    "summary": "string",
    "ask_user_to_add": ["string"]
  }
}

Decision policy:
- If species is not clearly dog/cat: status = "not_pet_or_unclear".
- If confidence < 0.45 or key visual evidence is missing: status = "need_more_data".
- If emergency risk is present: status = "emergency_flag".
- Otherwise: status = "ok".

When status is need_more_data:
- Be explicit about what to add:
  - clearer close-up of lesion
  - full-body reference photo
  - brighter lighting
  - symptom duration, appetite/activity, weight

Reminder:
- This response is AI-assisted triage only and not a final veterinary diagnosis.
```

---

## 4) Frontend mapping (error/status -> tiếng Việt)

### 4.1 AI `status` mapping

- `ok`
  - Tiêu đề: `Đã phân tích xong`
  - CTA: `Xem kết quả`
- `need_more_data`
  - Tiêu đề: `Cần thêm dữ liệu`
  - Nội dung: `Ảnh/thông tin chưa đủ để đánh giá chính xác. Vui lòng bổ sung theo gợi ý bên dưới.`
  - CTA: `Bổ sung ảnh`
- `not_pet_or_unclear`
  - Tiêu đề: `Không nhận diện rõ chó/mèo`
  - Nội dung: `Hệ thống hiện chỉ hỗ trợ chó và mèo. Vui lòng chụp lại ảnh đúng đối tượng, đủ sáng và rõ nét.`
  - CTA: `Chụp lại`
- `emergency_flag`
  - Tiêu đề: `Dấu hiệu nguy hiểm`
  - Nội dung: `Có dấu hiệu cần được bác sĩ thú y thăm khám sớm.`
  - CTA: `Xem khuyến nghị khẩn`

### 4.2 Backend guardrail error mapping

- `ANALYSIS_IN_PROGRESS`
  - `Đang phân tích lượt trước, vui lòng chờ {{retryAfterSeconds}} giây.`
- `ANALYSIS_COOLDOWN`
  - `Bạn vừa phân tích xong. Vui lòng thử lại sau {{retryAfterSeconds}} giây.`
- `ANALYSIS_RATE_LIMIT_HOUR`
  - `Bạn đã đạt giới hạn phân tích theo giờ. Vui lòng thử lại sau {{retryAfterSeconds}} giây.`
- `ANALYSIS_RATE_LIMIT_DAY`
  - `Bạn đã đạt giới hạn phân tích trong ngày. Vui lòng quay lại sau {{retryAfterSeconds}} giây.`

---

## 5) Suggested progress states (UI)

Khi user bấm `Start Analysis`, nên hiển thị tuần tự:

1. `Đang tải ảnh/video...`
2. `AI đang phân tích triệu chứng...`
3. `Đang lưu kết quả...`
4. `Hoàn tất`

Nếu fail:

- `Tải dữ liệu thất bại` / `Phân tích thất bại` / `Lưu kết quả thất bại`
- Kèm nút `Thử lại` và không reset form ngay lập tức.

---

## 6) Rollout notes

- Giai đoạn 1: chỉ thêm schema + prompt + mapping UI message (không đổi DB).
- Giai đoạn 2: lưu thêm trường mở rộng (`status`, `evidence`, `missing_data`, `red_flags`) vào DB.
- Giai đoạn 3: dùng các trường này để cá nhân hóa đề xuất sản phẩm và quyết định escalation flow.

