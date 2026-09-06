const STORAGE_KEY = "petcare.web-score-systems-ui.passed";

const SECTIONS = [
  {
    id: "transparency",
    title: "A - Diem minh bach",
    desc: "Thang tich luy 0-100 tu ho so da duoc admin duyet: xac minh 30, moi kenh MXH 5 (toi da 4), video co so 10, giay phep 30, bao hanh dau tien 10. Bac thap nhat la Trai moi.",
    cases: [
      { id: "TRA-01", given: "Ho so moi, verification_status = pending_review", when: "Mo ho so trai - tab Tong quan", then: "Banner vang cho admin xac minh; gauge 0; thanh 0%; chip Trai moi; khong hien nhan Sap bi khoa" },
      { id: "TRA-02", given: "Admin vua duyet ho so, chua gan kenh nao", when: "Tai lai tab Tong quan", then: "Gauge 30, vach cam #F97316; chip Trai moi; thanh 30%" },
      { id: "TRA-03", given: "Da duyet + giay phep kinh doanh duoc duyet", when: "Tai lai tab Tong quan", then: "Gauge 60, vach xanh duong #0284C7; chip Trai tiem nang; thanh 60%" },
      { id: "TRA-04", given: "Du 4 kenh MXH + video co so + giay phep + bao hanh", when: "Tai lai tab Tong quan", then: "Gauge 100, vach xanh la #10B981; chip Trai uy tin hang dau; thanh 100%" },
      { id: "TRA-05", given: "Seed metadata.trust_score = 39, sau do = 40", when: "So sanh hai lan tai trang", then: "39 la cam; 40 la xanh duong; khong co vach do o bat ky muc diem nao" },
      { id: "TRA-06", given: "Seed metadata.trust_score = 79, sau do = 80", when: "So sanh hai lan tai trang", then: "79 la xanh duong; 80 la xanh la; chip danh hieu doi theo moc" },
      { id: "TRA-07", given: "Dang nhap bang dung chu trai", when: "Bam Xem chi tiet diem minh bach", then: "Vao /trust; co breakdown va Cach tang diem; khong con bang tru diem tuan thu" },
      { id: "TRA-08", given: "Khach vang lai xem ho so trai nguoi khac", when: "Mo tab Tong quan", then: "Khong thay CTA owner-only; van thay gauge, chip va thanh chi so" },
      { id: "TRA-09", given: "Chua dang nhap", when: "Mo thang URL /app/breeders/[id]/trust", then: "Chuyen huong sang /login?next=... va quay lai dung trang sau login", tone: "danger" },
      { id: "TRA-10", given: "Dang nhap bang tai khoan khong phai chu trai", when: "Mo /app/breeders/[id]/trust", then: "Chuyen huong ve /app/breeders/[id]; khong lo breakdown ho so cua trai khac", tone: "danger" },
      { id: "TRA-11", given: "Dang o trang /trust", when: "Xem khoi cac danh hieu minh bach", then: "Bat dau tu 30-49: Trai moi; khong con hai bac duoi 30; khong hien ma Lx", tone: "info" }
    ]
  },
  {
    id: "rating",
    title: "B - Diem danh gia",
    desc: "Trung binh sao tu giao dich da hoan tat. Khong cong vao minh bach va khong lien quan tuan thu.",
    cases: [
      { id: "RAT-01", given: "Trai chua co danh gia", when: "Mo ho so trai", then: "Hien Chua co danh gia; khong render sao va khong hien so 0" },
      { id: "RAT-02", given: "Hai danh gia 4.0 va 4.6", when: "Xem ho so o ngon ngu VI", then: "Hien 4.3 (2 danh gia), lam tron 1 chu so thap phan" },
      { id: "RAT-03", given: "Trai co dung 1 danh gia", when: "Chuyen sang ngon ngu EN", then: "Hien 1 review, khong phai 1 reviews" },
      { id: "RAT-04", given: "Trai co danh gia va co diem minh bach", when: "Xem card chi so uy tin va tuan thu", then: "Cot minh bach khong chua dong rating; danh gia nam o khu review rieng", tone: "info" },
      { id: "RAT-05", given: "Form gui danh gia", when: "Gui rating = 0, = 6, hoac bo trong", then: "Bi chan kem thong bao loi; khong tao review va khong doi diem trung binh", tone: "danger" }
    ]
  },
  {
    id: "compliance",
    title: "C - Diem tuan thu",
    desc: "Bat dau 100 va chi giam khi Admin xac nhan bao cao. Bon muc -5 / -10 / -25 / -50 kem che tai.",
    cases: [
      { id: "CMP-01", given: "Trai chua tung bi Admin xac nhan vi pham", when: "Mo tab Tong quan", then: "Gauge 100, toan bo vach xanh la #10B981; chip Binh thuong 100/100; thanh 100%" },
      { id: "CMP-02", given: "Admin xac nhan bao cao Muc 1", when: "Tai lai ho so trai", then: "Diem con 95 (-5), gauge van xanh la; tin dang vi pham bi an khoi san" },
      { id: "CMP-03", given: "Admin xac nhan Muc 2", when: "Tru dan toi khi diem con 79", then: "Tai 79 chip Canh bao, gauge vang #F59E0B, mat Verified, toi da 1 tin/ngay", tone: "warning" },
      { id: "CMP-04", given: "Admin xac nhan Muc 3", when: "Tai lai ho so trai", then: "-25 diem; cam dang bai 14 ngay; nhan Verified bi go 30 ngay" },
      { id: "CMP-05", given: "Diem tuan thu roi vao khoang 1-49", when: "Mo ho so cong khai bang tai khoan khac", then: "Chip Han che nghiem trong, gauge do #EF4444; an SDT/Zalo/ban do; cam dang 30 ngay", tone: "warning" },
      { id: "CMP-06", given: "Admin xac nhan Muc 4", when: "Tai lai ho so trai", then: "-50 diem; tai khoan khoa vinh vien; toan bo tin dang bi go khoi san", tone: "danger" },
      { id: "CMP-07", given: "Diem tuan thu ve 0", when: "Mo ho so trai", then: "Chip Khoa tai khoan; gauge khong co vach nao sang; thanh 0%" },
      { id: "CMP-08", given: "Mot bao cao da duoc xac nhan truoc do", when: "Admin bam xac nhan lai cung reportId", then: "Diem khong doi va khong sinh them su kien tru diem", tone: "danger" },
      { id: "CMP-09", given: "Trai chi con 10 diem tuan thu", when: "Admin xac nhan vi pham Muc 4 (-50)", then: "Diem dung o 0, khong hien thi so am o gauge/chip/thanh", tone: "danger" },
      { id: "CMP-10", given: "Chu trai da dang nhap", when: "Bam Xem chi tiet diem tuan thu", then: "Vao /compliance voi ma tran -5/-10/-25/-50, danh sach vi pham va muc band" },
      { id: "CMP-11", given: "Dang o trang chi tiet tuan thu", when: "Xem breadcrumb dau trang", then: "Trang chu / Trai giong / Ho so trai / Diem tuan thu - moi cap cha deu mo duoc" }
    ]
  },
  {
    id: "separation",
    title: "D - Kiem tra tach biet ba thang",
    desc: "Thay doi o mot thang khong duoc keo theo thang con lai.",
    cases: [
      { id: "SEP-01", given: "Trai dat 100 diem minh bach", when: "Admin xac nhan vi pham Muc 3 (-25 tuan thu)", then: "Tuan thu con 75; minh bach van 100 va chip danh hieu khong doi", tone: "info" },
      { id: "SEP-02", given: "Trai 30 diem minh bach", when: "Nhan them 3 danh gia 5 sao", then: "Minh bach van 30; danh gia khong cong diem ho so", tone: "info" },
      { id: "SEP-03", given: "Trai dang co 60 diem tuan thu do vi pham cu", when: "Bo sung giay phep kinh doanh va duoc duyet", then: "Minh bach tang theo muc moi; tuan thu van 60", tone: "info" }
    ]
  },
  {
    id: "animation",
    title: "E - Hieu ung gauge",
    desc: "Hieu ung quet cua gauge va hanh vi khi reduce motion / quay lai tab.",
    cases: [
      { id: "ANM-01", given: "Trai 30 diem minh bach va 100 diem tuan thu", when: "Mo tab Tong quan", then: "Vach sang dan tu vach 1 theo chieu kim dong ho; hai gauge ket thuc cung luc khoang 900ms" },
      { id: "ANM-02", given: "Cung trai tren", when: "Quan sat phan vuot qua so diem", then: "Cac vach chua dat giu mau xam #E5E7EB, khong nhap nhay" },
      { id: "ANM-03", given: "Bat Giam chuyen dong o he dieu hanh", when: "Tai lai ho so trai", then: "Mau hien thi ngay lap tuc, khong chay hieu ung quet" },
      { id: "ANM-04", given: "Dang dung o tab Tong quan", when: "Chuyen sang tab khac roi quay lai", then: "Hieu ung chay lai tu dau o ca hai gauge" },
      { id: "ANM-05", given: "Trai 0 diem o ca hai thang", when: "Mo ho so trai", then: "Khong vach nao sang, khong loi chia cho 0 va console sach" }
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
    <div class="stat"><span class="value">${SECTIONS[0].cases.length}</span><span class="label">Minh bach</span></div>
    <div class="stat"><span class="value">${SECTIONS[2].cases.length}</span><span class="label">Tuan thu</span></div>
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
        <div class="section-meta"><span class="badge">${done}/${total} pass</span><span class="badge">web</span></div>
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
