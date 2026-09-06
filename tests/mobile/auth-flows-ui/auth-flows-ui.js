const STORAGE_KEY = "petcare.mobile-auth-flows-ui.passed";

const SECTIONS = [
  {
    id: "mobile-login",
    title: "A - Mobile sign in",
    desc: "Login mobile, eye toggle, validation, footer/legal va regression login khong duoc auto goi sign up.",
    badges: ["pet-health-frontend", "Priority: cao", "Login"],
    cases: [
      { id: "MOB-LOGIN-01", given: "User chua dang nhap", when: "Mo app o man login", then: "Hien app name, tagline, email field, password field, CTA Dang nhap va nut chuyen sang Dang ky" },
      { id: "MOB-LOGIN-02", given: "Account hop le", when: "Nhap email + password dung va submit", then: "Dang nhap thanh cong va vao app" },
      { id: "MOB-LOGIN-03", given: "Da nhap password", when: "Bam icon mat", then: "Password toggle an/hien dung; gia tri khong mat" },
      { id: "MOB-LOGIN-04", given: "Email trong", when: "Submit login", then: "Hien loi field email", tone: "warning" },
      { id: "MOB-LOGIN-05", given: "Password trong", when: "Submit login", then: "Hien loi field password", tone: "warning" },
      { id: "MOB-LOGIN-06", given: "Password sai", when: "Submit login", then: "Hien auth error banner; khong vao app", tone: "danger" },
      { id: "MOB-LOGIN-07", given: "Email dang pending signup OTP", when: "Login tra SIGNUP_OTP_PENDING", then: "Khong tu dong goi sign up; khong nhay sang man OTP signup; hien thong bao phu hop", tone: "danger" },
      { id: "MOB-LOGIN-08", given: "Khong mo keyboard", when: "Quan sat cuoi man hinh", then: "Hien backend health va legal footer" },
      { id: "MOB-LOGIN-09", given: "Keyboard dang mo", when: "Tap vao input", then: "Footer legal an hop ly; layout khong bi che" },
      { id: "MOB-LOGIN-10", given: "Dang loading", when: "Bam submit lien tuc", then: "Khong bi double-submit" }
    ]
  },
  {
    id: "mobile-signup",
    title: "B - Mobile sign up, OTP, Complete Profile",
    desc: "Dang ky mobile va flow 3 buoc: form dang ky, OTP verify, complete profile.",
    badges: ["pet-health-frontend", "Register", "OTP + Complete Profile"],
    cases: [
      { id: "MOB-SIGNUP-01", given: "Dang o mode login", when: "Chuyen sang Dang ky", then: "Hien Email, Password, Confirm password; nut Quen mat khau bien mat" },
      { id: "MOB-SIGNUP-02", given: "Email moi hop le", when: "Nhap email + password >= 6 + confirm khop va submit", then: "Gui signup OTP va chuyen sang man signup-otp-verification" },
      { id: "MOB-SIGNUP-03", given: "Dang o man OTP", when: "Nhap OTP dung va submit", then: "Tao session thanh cong va chuyen sang man Complete Profile" },
      { id: "MOB-SIGNUP-04", given: "Dang o Complete Profile", when: "Nhap display name hop le va submit", then: "Luu ten thanh cong va vao app/onboarding" },
      { id: "MOB-SIGNUP-05", given: "Email khong hop le", when: "Submit sign up", then: "Hien loi invalid email format; khong sang OTP", tone: "warning" },
      { id: "MOB-SIGNUP-06", given: "Password < 6 ky tu", when: "Submit sign up", then: "Hien loi password too short", tone: "warning" },
      { id: "MOB-SIGNUP-07", given: "Confirm password trong hoac khong khop", when: "Submit sign up", then: "Hien loi confirm password; khong sang OTP", tone: "warning" },
      { id: "MOB-SIGNUP-08", given: "Email da ton tai", when: "Submit sign up", then: "Hien loi backend tuong ung", tone: "danger" },
      { id: "MOB-SIGNUP-09", given: "OTP trong hoac sai do dai", when: "Submit OTP", then: "Hien loi OTP; van o man OTP", tone: "warning" },
      { id: "MOB-SIGNUP-10", given: "OTP sai/het han", when: "Verify OTP", then: "Hien loi verify OTP; khong sang Complete Profile", tone: "danger" },
      { id: "MOB-SIGNUP-11", given: "Countdown resend chua het", when: "Quan sat man OTP", then: "Chi hien countdown; khong bam resend duoc" },
      { id: "MOB-SIGNUP-12", given: "Countdown ve 0", when: "Bam resend", then: "Gui lai OTP, reset countdown va giu UI on dinh" },
      { id: "MOB-SIGNUP-13", given: "Dang o man OTP", when: "Bam back", then: "Quay lai sign up; UI khong crash" },
      { id: "MOB-SIGNUP-14", given: "Display name trong o Complete Profile", when: "Submit", then: "Hien loi bat buoc nhap display name; khong vao app", tone: "warning" }
    ]
  },
  {
    id: "mobile-consistency",
    title: "C - Mobile UI consistency va regressions",
    desc: "Nhung diem auth UI da tung loi tren mobile can retest moi lan thay doi.",
    badges: ["pet-health-frontend", "Regression", "UI consistency"],
    cases: [
      { id: "MOB-REG-01", given: "Co bug border auth fields truoc day", when: "Focus email, password, confirm password", then: "Border state dong nhat; khong co accent lech mau" },
      { id: "MOB-REG-02", given: "Password fields tung bi lech icon", when: "Kiem tra tren mobile va RN web", then: "Khong double border; eye icon can dung" },
      { id: "MOB-REG-03", given: "Tao loi o login hoac sign up", when: "Doi qua lai giua hai mode", then: "Error banner va field errors cu duoc reset dung ngu canh" },
      { id: "MOB-REG-04", given: "Success state sau gui OTP", when: "User quay lai va doi mode", then: "Khong giu success state sai man hinh" },
      { id: "MOB-REG-05", given: "Dung 5 test accounts moi", when: "Dang nhap tren mobile", then: "Login thanh cong; khong phat sinh flow OTP bat thuong" },
      { id: "MOB-REG-06", given: "Keyboard mo/dong lien tuc", when: "Chuyen focus giua cac inputs", then: "Layout on dinh; footer/legal hien an dung luc" }
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
    <div class="stat ok"><span class="value">${done}/${total}</span><span class="label">Da pass</span></div>
    <div class="stat ${remaining === 0 ? "ok" : "warn"}"><span class="value">${remaining}</span><span class="label">Con lai</span></div>
    <div class="stat info"><span class="value">${SECTIONS[0].cases.length}</span><span class="label">Case login</span></div>
    <div class="stat info"><span class="value">${SECTIONS[1].cases.length}</span><span class="label">Case sign up/OTP</span></div>
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
        <div class="section-meta">
          ${(section.badges || []).map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}
          <span class="badge">${done}/${total} pass</span>
        </div>
        <div class="table-wrap">
          <table class="case-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Given / When / Then</th>
                <th>Pass</th>
              </tr>
            </thead>
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
                  <td>
                    <input class="pass-toggle" type="checkbox" data-case-id="${escapeHtml(item.id)}" ${passed[item.id] ? "checked" : ""} />
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
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

function render(passed = loadPassed()) {
  renderStats(passed);
  renderSections(passed);
}

document.getElementById("mark-all").addEventListener("click", () => {
  const passed = {};
  allCases().forEach((item) => {
    passed[item.id] = true;
  });
  savePassed(passed);
  render(passed);
});

document.getElementById("clear-all").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  render({});
});

render();
