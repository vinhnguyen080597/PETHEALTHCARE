const STORAGE_KEY = "petcare.score-systems-ui.passed";

const SECTIONS = [
  {
    id: "transparency",
    title: "A · Điểm minh bạch",
    desc: "Thang tích luỹ 0 → 100 từ hồ sơ đã được admin duyệt: xác minh 30, mỗi kênh MXH 5 (tối đa 4), video cơ sở 10, giấy phép 30, bảo hành đầu tiên 10. Danh hiệu thấp nhất là “Trại mới”.",
    cases: [
      { id: "TRA-01", given: "Hồ sơ mới, verification_status = pending_review", when: "Mở Hồ sơ trại → tab Tổng quan", then: "Banner vàng “chờ admin xác minh”; gauge 0; thanh 0%; chip “Trại mới” — không hiện nhãn đỏ “Sắp bị khóa”", tone: "info" },
      { id: "TRA-02", given: "Admin vừa duyệt hồ sơ, chưa gắn kênh nào", when: "Tải lại tab Tổng quan", then: "Gauge 30, vạch cam #F97316; chip “Trại mới”; thanh 30%" },
      { id: "TRA-03", given: "Đã duyệt + giấy phép kinh doanh được duyệt (30 + 30)", when: "Tải lại tab Tổng quan", then: "Gauge 60, vạch xanh dương #0284C7; chip “Trại tiềm năng”; thanh 60%" },
      { id: "TRA-04", given: "Đủ 4 kênh MXH (20) + video cơ sở (10) + giấy phép (30) + bảo hành (10)", when: "Tải lại tab Tổng quan", then: "Gauge 100, vạch xanh lá #10B981; chip “Trại uy tín hàng đầu”; thanh 100%" },
      { id: "TRA-05", given: "Seed metadata.trust_score = 39, sau đó = 40", when: "So sánh hai lần tải trang", then: "39 → cam; 40 → xanh dương. Không có vạch đỏ ở bất kỳ mức điểm nào" },
      { id: "TRA-06", given: "Seed metadata.trust_score = 79, sau đó = 80", when: "So sánh hai lần tải trang", then: "79 → xanh dương; 80 → xanh lá. Chip danh hiệu đổi theo đúng mốc" },
      { id: "TRA-07", given: "Đăng nhập bằng đúng chủ trại", when: "Bấm “Xem chi tiết điểm minh bạch”", then: "Vào /trust; có breakdown ✓/○ và Cách tăng điểm; KHÔNG còn bảng trừ điểm tuân thủ" },
      { id: "TRA-08", given: "Khách vãng lai xem hồ sơ trại người khác", when: "Mở tab Tổng quan", then: "Không thấy nút CTA ở cả hai cột; vẫn thấy đủ gauge, chip và thanh chỉ số" },
      { id: "TRA-09", given: "Chưa đăng nhập", when: "Mở thẳng URL /app/breeders/[id]/trust", then: "Chuyển hướng /login?next=… và quay lại đúng trang sau khi đăng nhập", tone: "danger" },
      { id: "TRA-10", given: "Đăng nhập bằng tài khoản KHÔNG phải chủ trại", when: "Mở /app/breeders/[id]/trust", then: "Chuyển hướng về /app/breeders/[id]; không lộ breakdown hồ sơ của trại khác", tone: "danger" },
      { id: "TRA-11", given: "Đang ở trang /trust", when: "Xem khối “Các danh hiệu minh bạch”", then: "Đúng 4 dòng bắt đầu từ “30–49: Trại mới”; không còn bậc 0–15 và 16–29; không hiện mã Lx", tone: "info" }
    ]
  },
  {
    id: "rating",
    title: "B · Điểm đánh giá",
    desc: "Trung bình sao từ giao dịch đã hoàn tất. Không cộng vào minh bạch và không liên quan tuân thủ.",
    cases: [
      { id: "RAT-01", given: "Trại chưa có đánh giá nào", when: "Mở Hồ sơ trại", then: "Hiện “Chưa có đánh giá”; không render ★ và không hiện số 0" },
      { id: "RAT-02", given: "Hai đánh giá 4.0 và 4.6 (trung bình 4.3)", when: "Xem hồ sơ ở ngôn ngữ VI", then: "Hiện “★ 4.3 (2 đánh giá)” — làm tròn đúng 1 chữ số thập phân" },
      { id: "RAT-03", given: "Trại có đúng 1 đánh giá", when: "Chuyển sang ngôn ngữ EN", then: "Hiện “1 review” (số ít), không phải “1 reviews”" },
      { id: "RAT-04", given: "Trại có đánh giá và có điểm minh bạch", when: "Xem card “Chỉ số uy tín & tuân thủ”", then: "Cột minh bạch KHÔNG chứa dòng ★ — đánh giá chỉ nằm ở khu vực review", tone: "info" },
      { id: "RAT-05", given: "Form gửi đánh giá", when: "Gửi rating = 0, = 6, hoặc bỏ trống", then: "Bị chặn kèm thông báo lỗi; không tạo review và không đổi điểm trung bình", tone: "danger" }
    ]
  },
  {
    id: "compliance",
    title: "C · Điểm tuân thủ",
    desc: "Bắt đầu 100 và chỉ giảm khi Admin xác nhận báo cáo. Bốn mức −5 / −10 / −25 / −50 kèm chế tài.",
    cases: [
      { id: "CMP-01", given: "Trại chưa từng bị Admin xác nhận vi phạm", when: "Mở tab Tổng quan", then: "Gauge 100, toàn bộ vạch xanh lá #10B981; chip “Bình thường · 100/100”; thanh 100%" },
      { id: "CMP-02", given: "Admin xác nhận báo cáo Mức 1 (ảnh mạng / spam trùng lặp)", when: "Tải lại hồ sơ trại", then: "Điểm còn 95 (−5), gauge vẫn xanh lá; tin đăng vi phạm bị ẩn khỏi sàn" },
      { id: "CMP-03", given: "Admin xác nhận Mức 2 (sai thông tin / quấy rối trong chat)", when: "Trừ dồn tới khi điểm ≤ 79", then: "−10 mỗi lần; tại 79 chip “Cảnh báo”, gauge vàng #F59E0B, mất Verified, tối đa 1 tin/ngày", tone: "warning" },
      { id: "CMP-04", given: "Admin xác nhận Mức 3 (giấu bệnh / giả giấy tờ)", when: "Tải lại hồ sơ trại", then: "−25 điểm; cấm đăng bài 14 ngày; nhãn Verified bị gỡ 30 ngày" },
      { id: "CMP-05", given: "Điểm tuân thủ rơi xuống khoảng 1–49", when: "Mở hồ sơ công khai bằng tài khoản khác", then: "Chip “Hạn chế nghiêm trọng”, gauge đỏ #EF4444; ẩn SĐT/Zalo/bản đồ; cấm đăng 30 ngày", tone: "warning" },
      { id: "CMP-06", given: "Admin xác nhận Mức 4 (lừa đảo cọc / động vật hoang dã bị cấm)", when: "Tải lại hồ sơ trại", then: "−50 điểm; tài khoản khóa vĩnh viễn; toàn bộ tin đăng bị gỡ khỏi sàn", tone: "danger" },
      { id: "CMP-07", given: "Điểm tuân thủ về 0", when: "Mở hồ sơ trại", then: "Chip “Khóa tài khoản”; gauge không có vạch nào sáng; thanh trạng thái 0%" },
      { id: "CMP-08", given: "Một báo cáo đã được xác nhận trước đó", when: "Admin bấm xác nhận lại CÙNG reportId", then: "Điểm không đổi và không sinh thêm sự kiện trừ điểm (idempotent)", tone: "danger" },
      { id: "CMP-09", given: "Trại chỉ còn 10 điểm tuân thủ", when: "Admin xác nhận vi phạm Mức 4 (−50)", then: "Điểm dừng ở 0, không hiển thị số âm ở gauge/chip/thanh", tone: "danger" },
      { id: "CMP-10", given: "Chủ trại đã đăng nhập", when: "Bấm “Xem chi tiết điểm tuân thủ”", then: "Vào /compliance với ma trận −5/−10/−25/−50, danh sách vi phạm và mốc band" },
      { id: "CMP-11", given: "Đang ở trang chi tiết tuân thủ", when: "Xem breadcrumb đầu trang", then: "Trang chủ / Trại giống / Hồ sơ trại / Điểm tuân thủ — mọi cấp cha đều mở được" }
    ]
  },
  {
    id: "separation",
    title: "D · Kiểm tra tách biệt ba thang",
    desc: "Thay đổi ở một thang không được kéo theo thang còn lại.",
    cases: [
      { id: "SEP-01", given: "Trại đạt 100 điểm minh bạch", when: "Admin xác nhận vi phạm Mức 3 (−25 tuân thủ)", then: "Tuân thủ còn 75; minh bạch VẪN 100 và chip danh hiệu không đổi", tone: "info" },
      { id: "SEP-02", given: "Trại 30 điểm minh bạch", when: "Nhận thêm 3 đánh giá 5★", then: "Minh bạch vẫn 30 — đánh giá không còn cộng điểm hồ sơ", tone: "info" },
      { id: "SEP-03", given: "Trại đang có 60 điểm tuân thủ do vi phạm cũ", when: "Bổ sung giấy phép kinh doanh và được duyệt", then: "Minh bạch tăng theo mốc mới; tuân thủ VẪN 60", tone: "info" }
    ]
  },
  {
    id: "animation",
    title: "E · Hiệu ứng quét của gauge",
    desc: "",
    cases: [
      { id: "ANM-01", given: "Trại 30 điểm minh bạch và 100 điểm tuân thủ", when: "Mở tab Tổng quan", then: "Vạch sáng dần từ vạch 1 theo chiều kim đồng hồ; cả hai gauge kết thúc cùng lúc (~900ms)" },
      { id: "ANM-02", given: "Cùng trại trên", when: "Quan sát phần vòng vượt quá số điểm", then: "Các vạch chưa đạt giữ nguyên xám #E5E7EB suốt hiệu ứng, không nhấp nháy" },
      { id: "ANM-03", given: "Bật “Giảm chuyển động” ở hệ điều hành", when: "Tải lại hồ sơ trại", then: "Màu hiển thị ngay lập tức, không chạy hiệu ứng quét" },
      { id: "ANM-04", given: "Đang đứng ở tab Tổng quan", when: "Chuyển sang tab khác rồi quay lại", then: "Hiệu ứng chạy lại từ đầu ở cả hai gauge" },
      { id: "ANM-05", given: "Trại 0 điểm ở cả hai thang", when: "Mở hồ sơ trại", then: "Không vạch nào sáng, không lỗi chia cho 0 và console sạch" }
    ]
  }
];

function loadPassed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePassed(passed) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passed));
}

function allCases() {
  return SECTIONS.flatMap((section) => section.cases);
}

function countPassed(cases, passed) {
  return cases.filter((c) => passed[c.id]).length;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderStats(passed) {
  const total = allCases().length;
  const done = countPassed(allCases(), passed);
  const remaining = total - done;
  document.getElementById("stats").innerHTML = `
    <div class="stat ok"><span class="value">${done}/${total}</span><span class="label">Đã pass</span></div>
    <div class="stat ${remaining === 0 ? "ok" : "warn"}"><span class="value">${remaining}</span><span class="label">Còn lại</span></div>
    <div class="stat"><span class="value">6</span><span class="label">Ưu tiên cao</span></div>
    <div class="stat"><span class="value">5</span><span class="label">Hiệu ứng gauge</span></div>
  `;
}

function renderSections(passed) {
  document.getElementById("sections").innerHTML = SECTIONS.map((section) => {
    const done = countPassed(section.cases, passed);
    const rows = section.cases.map((c) => {
      const checked = Boolean(passed[c.id]);
      const toneClass = checked ? "passed" : c.tone ? `tone-${c.tone}` : "";
      return `
        <tr class="${toneClass}" data-case-id="${escapeHtml(c.id)}">
          <td class="pass-cell">
            <input type="checkbox" data-case="${escapeHtml(c.id)}" ${checked ? "checked" : ""} aria-label="Pass ${escapeHtml(c.id)}" />
          </td>
          <td class="code-id">${escapeHtml(c.id)}</td>
          <td>${escapeHtml(c.given)}</td>
          <td>${escapeHtml(c.when)}</td>
          <td>${escapeHtml(c.then)}</td>
        </tr>
      `;
    }).join("");

    return `
      <section>
        <h2>${escapeHtml(section.title)} (${done}/${section.cases.length})</h2>
        ${section.desc ? `<p class="section-desc">${escapeHtml(section.desc)}</p>` : ""}
        <table>
          <thead>
            <tr>
              <th>Pass</th>
              <th>Mã</th>
              <th>Tiền điều kiện</th>
              <th>Thao tác</th>
              <th>Kỳ vọng trên UI</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;
  }).join("");
}

function render(passed) {
  renderStats(passed);
  renderSections(passed);
}

function main() {
  let passed = loadPassed();
  render(passed);

  document.getElementById("sections").addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
    const id = target.dataset.case;
    if (!id) return;
    passed = { ...passed, [id]: target.checked };
    savePassed(passed);
    render(passed);
  });

  document.getElementById("mark-all").addEventListener("click", () => {
    passed = {};
    for (const c of allCases()) passed[c.id] = true;
    savePassed(passed);
    render(passed);
  });

  document.getElementById("clear-all").addEventListener("click", () => {
    passed = {};
    savePassed(passed);
    render(passed);
  });
}

main();
