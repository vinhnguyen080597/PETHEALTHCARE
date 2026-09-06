const STORAGE_KEY = "petcare.web-auth-flows-ui.passed";

const SECTIONS = [
  {
    id: "web-login",
    title: "A - Web sign in",
    desc: "Login bang email/login name, validation, auth errors va regression pending OTP.",
    badges: ["pet-health-web", "Priority: cao", "Login"],
    cases: [
      { id: "WEB-LOGIN-01", given: "User chua dang nhap", when: "Mo /login", then: "Tab Dang nhap active; co OAuth Google/Facebook; co input email/login va password; co link Quen mat khau" },
      { id: "WEB-LOGIN-02", given: "Account hop le", when: "Nhap email dung + password dung va submit", then: "Dang nhap thanh cong va redirect vao next hoac trang account mac dinh" },
      { id: "WEB-LOGIN-03", given: "Account co login_identifier", when: "Nhap login name thay vi email va submit", then: "Dang nhap thanh cong; login khong bat buoc dung dinh dang email" },
      { id: "WEB-LOGIN-04", given: "De trong email/login", when: "Submit login form", then: "Hien field error email/login required; khong vao app", tone: "warning" },
      { id: "WEB-LOGIN-05", given: "De trong password", when: "Submit login form", then: "Hien field error password required", tone: "warning" },
      { id: "WEB-LOGIN-06", given: "Password sai", when: "Submit login", then: "Hien auth error banner; van o man login", tone: "danger" },
      { id: "WEB-LOGIN-07", given: "Email dang pending OTP", when: "Login tra ve SIGNUP_OTP_PENDING", then: "Web auto resend OTP va chuyen sang buoc OTP sign up" },
      { id: "WEB-LOGIN-08", given: "Email pending OTP nhung resend that bai", when: "Login web", then: "Khong vao app; hien loi ro rang; khong soft-lock UI", tone: "danger" },
      { id: "WEB-LOGIN-09", given: "Da nhap password", when: "Bam icon mat 2 lan", then: "Password toggle an/hien dung; gia tri input khong bi mat" },
      { id: "WEB-LOGIN-10", given: "Dang loading", when: "Nguoi dung bam submit lien tiep", then: "Khong bi double-submit ngoai y muon" }
    ]
  },
  {
    id: "web-signup",
    title: "B - Web sign up va OTP",
    desc: "Dang ky web, OTP verify, display name va dieu huong giua form/OTP.",
    badges: ["pet-health-web", "Register", "OTP"],
    cases: [
      { id: "WEB-SIGNUP-01", given: "Mo /login?tab=register hoac /signup", when: "Quan sat form", then: "Tab Dang ky active; co Email, Password, Confirm password; chua co Display name" },
      { id: "WEB-SIGNUP-02", given: "Email moi hop le", when: "Nhap email + password >= 6 + confirm khop va submit", then: "Chuyen sang buoc OTP verify" },
      { id: "WEB-SIGNUP-03", given: "Dang o buoc OTP", when: "Nhap Display name hop le + OTP dung va submit", then: "Tao session thanh cong va redirect vao app" },
      { id: "WEB-SIGNUP-04", given: "Email khong hop le", when: "Submit sign up", then: "Hien field error email invalid; khong sang OTP", tone: "warning" },
      { id: "WEB-SIGNUP-05", given: "Password < 6 ky tu", when: "Submit sign up", then: "Hien loi password too short", tone: "warning" },
      { id: "WEB-SIGNUP-06", given: "Confirm password trong", when: "Submit sign up", then: "Hien loi confirm password required", tone: "warning" },
      { id: "WEB-SIGNUP-07", given: "Confirm password khong khop", when: "Submit sign up", then: "Hien loi mismatch; khong sang OTP", tone: "warning" },
      { id: "WEB-SIGNUP-08", given: "Email da ton tai", when: "Submit sign up", then: "Hien loi backend tuong ung; van o sign up", tone: "danger" },
      { id: "WEB-SIGNUP-09", given: "OTP trong hoac sai do dai", when: "Submit OTP form", then: "Hien field error OTP; khong complete sign up", tone: "warning" },
      { id: "WEB-SIGNUP-10", given: "Display name trong", when: "Submit OTP form", then: "Hien field error display name required", tone: "warning" },
      { id: "WEB-SIGNUP-11", given: "OTP sai/het han", when: "Verify OTP", then: "Hien loi verify OTP; van o buoc OTP", tone: "danger" },
      { id: "WEB-SIGNUP-12", given: "Dang o buoc OTP", when: "Bam Back to sign up", then: "Quay lai tab Dang ky; UI khong crash" }
    ]
  },
  {
    id: "web-oauth-and-content",
    title: "C - Web OAuth va content",
    desc: "Social auth, next redirect, terms/privacy va reset state khi doi tab.",
    badges: ["pet-health-web", "OAuth", "Content"],
    cases: [
      { id: "WEB-CONT-01", given: "OAuth duoc cau hinh", when: "Bam Tiep tuc voi Google", then: "Di vao dung flow OAuth Google va co loading popup" },
      { id: "WEB-CONT-02", given: "OAuth duoc cau hinh", when: "Bam Tiep tuc voi Facebook", then: "Di vao dung flow OAuth Facebook va co loading popup" },
      { id: "WEB-CONT-03", given: "OAuth chua duoc cau hinh", when: "Bam social login", then: "Hien loi not configured", tone: "danger" },
      { id: "WEB-CONT-04", given: "User huy OAuth o provider", when: "Quay lai trang login", then: "Hien thong bao cancelled than thien" },
      { id: "WEB-CONT-05", given: "Trang login co next query", when: "Dang nhap hoac verify OTP thanh cong", then: "Redirect dung gia tri next" },
      { id: "WEB-CONT-06", given: "Tao loi o tab login", when: "Chuyen sang register", then: "Error cu duoc reset; khong lem sang tab moi" },
      { id: "WEB-CONT-07", given: "Dang o auth screen", when: "Kiem tra Terms va Privacy", then: "Link hien dung va mo dung trang" }
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
