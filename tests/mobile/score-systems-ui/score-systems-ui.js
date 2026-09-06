const STORAGE_KEY = "petcare.mobile-score-systems-ui.passed";

const SECTIONS = [
  {
    id: "mobile-overview-card",
    title: "A - The score card trong ho so trai",
    desc: "Kiem tra FarmScoreCard trong BreederDetailScreen / overview tab.",
    cases: [
      { id: "MSC-01", given: "Mo ho so trai tren mobile", when: "Xem score card o overview", then: "Hien 2 cot ro rang: Minh bach va Tuan thu; moi cot co gauge, chip va progress bar" },
      { id: "MSC-02", given: "Nguoi xem la chu trai", when: "Xem score card", then: "Co CTA mo Huong dan minh bach va Huong dan tuan thu" },
      { id: "MSC-03", given: "Nguoi xem khong phai chu trai", when: "Xem score card", then: "Khong hien CTA owner-only nhung van thay gauge/chip/metric" },
      { id: "MSC-04", given: "Trai pending review", when: "Mo overview", then: "Diem minh bach o muc khoi dau; wording/chip khop voi state hien tai" },
      { id: "MSC-05", given: "Diem compliance co trong metadata", when: "Mo overview", then: "Cot Tuan thu lay dung score/band va khong bi nham voi Minh bach" },
      { id: "MSC-06", given: "Diem thay doi sau admin action", when: "Tai lai ho so", then: "Card cap nhat dung chip, mau, progress va gauge" }
    ]
  },
  {
    id: "mobile-transparency-guide",
    title: "B - Huong dan diem minh bach",
    desc: "Kiem tra FarmHealthScreen va breakdown diem minh bach tren mobile.",
    cases: [
      { id: "MTR-01", given: "Chu trai dang nhap", when: "Bam CTA Huong dan minh bach", then: "Mo dung FarmHealthScreen" },
      { id: "MTR-02", given: "Vao FarmHealthScreen", when: "Xem phan dau trang", then: "Co tieu de, intro, gauge va chip muc danh hieu" },
      { id: "MTR-03", given: "Tai khoan vua duoc duyet", when: "Mo screen Huong dan minh bach", then: "Diem phan bo dung theo quy tac xac minh va cac moc diem" },
      { id: "MTR-04", given: "Da du 4 kenh MXH + video + giay phep + bao hanh", when: "Tai lai screen", then: "Tong diem len dung muc va tier label doi theo score" },
      { id: "MTR-05", given: "User co cac submission dang cho duyet", when: "Mo screen", then: "Danh sach/CTA cach tang diem phan anh dung trang thai pending/approved" },
      { id: "MTR-06", given: "Khong co token hoac loi load submissions", when: "Mo screen", then: "Guide van doc duoc, khong crash; chi bo qua thong tin phu" },
      { id: "MTR-07", given: "Nguoi dung bam back", when: "Roi khoi FarmHealthScreen", then: "Quay lai ho so trai dung ngu canh" }
    ]
  },
  {
    id: "mobile-compliance-guide",
    title: "C - Huong dan diem tuan thu",
    desc: "Kiem tra FarmComplianceGuideScreen va bang muc che tai tren mobile.",
    cases: [
      { id: "MCP-01", given: "Chu trai dang nhap", when: "Bam CTA Huong dan tuan thu", then: "Mo dung FarmComplianceGuideScreen" },
      { id: "MCP-02", given: "Compliance score = 100", when: "Mo screen", then: "Gauge xanh la, chip Binh thuong, hint dung 100/100" },
      { id: "MCP-03", given: "Compliance score trong khoang canh bao", when: "Mo screen", then: "Band/chip/mau doi dung theo score" },
      { id: "MCP-04", given: "Co active violations", when: "Mo screen", then: "Hien danh sach violation voi ly do, ngay va so diem tru" },
      { id: "MCP-05", given: "Admin xac nhan cung mot report hai lan", when: "Tai lai score", then: "Diem khong bi tru lap; UI khong hien double-penalty", tone: "danger" },
      { id: "MCP-06", given: "Diem roi ve 0", when: "Mo screen", then: "Chip khoa tai khoan/giai thich tuong ung; khong hien diem am", tone: "danger" },
      { id: "MCP-07", given: "Nguoi dung bam back", when: "Roi khoi FarmComplianceGuideScreen", then: "Quay lai ho so trai dung ngu canh" }
    ]
  },
  {
    id: "mobile-rating-and-separation",
    title: "D - Rating va tach biet he thong diem",
    desc: "Kiem tra phan review va dam bao 3 he thong diem khong nham lan tren mobile.",
    cases: [
      { id: "MRS-01", given: "Trai chua co review", when: "Mo ho so trai", then: "Hien empty state rating dung, khong render sao/so 0 sai ngu canh" },
      { id: "MRS-02", given: "Trai co review", when: "Xem overview va khu reviews", then: "Rating chi nam o review summary, khong bi tron vao cot Minh bach" },
      { id: "MRS-03", given: "Tang so sao giao dich", when: "Tai lai ho so", then: "Rating thay doi nhung diem minh bach khong bi cong them" },
      { id: "MRS-04", given: "Bi tru diem tuan thu", when: "Xem lai score card", then: "Chi cot Tuan thu thay doi; Minh bach van giu nguyen neu profile khong doi" },
      { id: "MRS-05", given: "Bo sung giay phep/hoan thien profile", when: "Tai lai ho so", then: "Minh bach tang; Tuan thu khong doi neu khong co penalty moi" }
    ]
  },
  {
    id: "mobile-visual-regression",
    title: "E - Regression UI mobile",
    desc: "Kiem tra hien thi gauge, chip, text va layout tren mobile app.",
    cases: [
      { id: "MVR-01", given: "Man hinh nho", when: "Mo score card", then: "Hai cot score khong vo layout, text khong bi overlap" },
      { id: "MVR-02", given: "Diem o moc 39/40/79/80", when: "So sanh mau gauge", then: "Mau doi dung theo moc score" },
      { id: "MVR-03", given: "Back/forward giua ho so va guide screens", when: "Lap lai nhieu lan", then: "Khong crash, khong mat state quan trong" },
      { id: "MVR-04", given: "Ngon ngu VI va EN", when: "Chuyen ngon ngu", then: "Chip, mo ta va review label doi dung ngon ngu" },
      { id: "MVR-05", given: "Trai 0 diem o mot hoac hai thang", when: "Mo card va guide screens", then: "Khong vach nao sang sai, khong co loi chia cho 0" }
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

function savePassed(passed) { localStorage.setItem(STORAGE_KEY, JSON.stringify(passed)); }
function allCases() { return SECTIONS.flatMap((section) => section.cases); }
function countPassed(cases, passed) { return cases.filter((c) => passed[c.id]).length; }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }

function renderStats(passed) {
  const total = allCases().length;
  const done = countPassed(allCases(), passed);
  const remaining = total - done;
  document.getElementById("stats").innerHTML = `
    <div class="stat ok"><span class="value">${done}/${total}</span><span class="label">Da pass</span></div>
    <div class="stat ${remaining === 0 ? "ok" : "warn"}"><span class="value">${remaining}</span><span class="label">Con lai</span></div>
    <div class="stat"><span class="value">${SECTIONS[0].cases.length}</span><span class="label">Score card</span></div>
    <div class="stat"><span class="value">${SECTIONS[2].cases.length}</span><span class="label">Compliance guide</span></div>
  `;
}

function renderSections(passed) {
  document.getElementById("sections").innerHTML = SECTIONS.map((section) => {
    const done = countPassed(section.cases, passed);
    const total = section.cases.length;
    return `
      <section class="section-card">
        <h2>${escapeHtml(section.title)}</h2>
        <p class="section-desc">${escapeHtml(section.desc || "")}</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Case ID</th><th>Given / When / Then</th><th>Pass</th></tr></thead>
            <tbody>
              ${section.cases.map((item) => `
                <tr class="tone-${item.tone || "info"}">
                  <td><strong>${escapeHtml(item.id)}</strong></td>
                  <td>
                    <div class="gwt">
                      <div class="gwt-line"><strong>Given:</strong> ${escapeHtml(item.given)}</div>
                      <div class="gwt-line"><strong>When:</strong> ${escapeHtml(item.when)}</div>
                      <div class="gwt-line"><strong>Then:</strong> ${escapeHtml(item.then)}</div>
                    </div>
                  </td>
                  <td><input class="pass-toggle" type="checkbox" data-case-id="${escapeHtml(item.id)}" ${passed[item.id] ? "checked" : ""} /></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
        <div class="section-meta"><span class="badge">${done}/${total} pass</span><span class="badge">mobile</span></div>
      </section>`;
  }).join("");

  document.querySelectorAll(".pass-toggle").forEach((input) => {
    input.addEventListener("change", (event) => {
      const checkbox = event.currentTarget;
      const id = checkbox.getAttribute("data-case-id");
      const next = loadPassed();
      next[id] = checkbox.checked;
      savePassed(next);
      render(next);
    });
  });
}

function render(passed = loadPassed()) { renderStats(passed); renderSections(passed); }

document.getElementById("mark-all").addEventListener("click", () => {
  const passed = {};
  allCases().forEach((item) => { passed[item.id] = true; });
  savePassed(passed);
  render(passed);
});

document.getElementById("clear-all").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  render({});
});

render();
