const $ = (id) => document.getElementById(id);
let mode = "auto";

function toast(msg, kind = "") {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast" + (kind ? " toast--" + kind : "");
  setTimeout(() => t.classList.add("hidden"), 3500);
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`);
  return data;
}

// ---- init ----
async function init() {
  try {
    const h = await api("/api/health");
    setStatus(h.model_loaded);
    if (!h.model_loaded) pollHealth();
  } catch {
    setStatus(false, true);
    pollHealth();
  }
  const opt = await api("/api/options");
  fillDesign(opt.design);
  fillLanguages(opt.languages);
  renderVoices(opt.voices);
  refreshHistory();
}

function setStatus(ok, err) {
  const s = $("status");
  if (err) { s.className = "status status--err"; s.textContent = "Không kết nối được server"; return; }
  if (ok) { s.className = "status status--ok"; s.textContent = "● Model sẵn sàng"; }
  else { s.className = "status status--loading"; s.textContent = "Đang nạp model…"; }
}

async function pollHealth() {
  const timer = setInterval(async () => {
    try {
      const h = await api("/api/health");
      if (h.model_loaded) { setStatus(true); clearInterval(timer); }
    } catch { /* keep trying */ }
  }, 3000);
}

function fillDesign(design) {
  const map = { gender: "d_gender", age: "d_age", pitch: "d_pitch", accent: "d_accent" };
  for (const [key, id] of Object.entries(map)) {
    const sel = $(id);
    sel.innerHTML = '<option value="">— không chọn —</option>';
    (design[key] || []).forEach((v) => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    });
    sel.addEventListener("change", updateInstruct);
  }
  $("d_whisper").addEventListener("change", updateInstruct);
}

function fillLanguages(langs) {
  const sel = $("language");
  sel.innerHTML = "";
  for (const [code, label] of Object.entries(langs)) {
    const o = document.createElement("option");
    o.value = code; o.textContent = label;
    if (code === "Vietnamese") o.selected = true;
    sel.appendChild(o);
  }
}

function currentInstruct() {
  const parts = [];
  ["d_gender", "d_age", "d_pitch", "d_accent"].forEach((id) => { if ($(id).value) parts.push($(id).value); });
  if ($("d_whisper").checked) parts.push("whisper");
  return parts.join(", ");
}
function updateInstruct() {
  $("instructPreview").textContent = currentInstruct() || "—";
}

// ---- tabs ----
$("modeTabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  mode = btn.dataset.mode;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === btn));
  $("designControls").classList.toggle("hidden", mode !== "design");
  $("cloneControls").classList.toggle("hidden", mode !== "clone");
});

// ---- sliders ----
$("speed").addEventListener("input", (e) => ($("speedVal").textContent = (+e.target.value).toFixed(2)));
$("numStep").addEventListener("input", (e) => ($("stepVal").textContent = e.target.value));

// ---- generate ----
$("genBtn").addEventListener("click", async () => {
  const text = $("text").value.trim();
  if (!text) return toast("Nhập văn bản đã nhé", "err");

  const body = {
    text,
    language: $("language").value,
    mode,
    speed: parseFloat($("speed").value),
    num_step: parseInt($("numStep").value, 10),
  };
  if (mode === "design") {
    body.instruct = currentInstruct();
    if (!body.instruct) return toast("Chọn ít nhất một thuộc tính giọng", "err");
  }
  if (mode === "clone") {
    body.voiceId = $("cloneVoiceSelect").value;
    if (!body.voiceId) return toast("Chọn một giọng đã clone", "err");
  }

  const btn = $("genBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Đang tạo (CPU nên hơi lâu)…';
  try {
    const r = await api("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const player = $("player");
    player.src = r.audioUrl + "?t=" + Date.now();
    $("downloadLink").href = r.audioUrl;
    $("resultMeta").textContent = `${r.voiceName} · ${r.duration}s · tạo trong ${r.genSeconds}s`;
    $("result").classList.remove("hidden");
    player.play().catch(() => {});
    refreshHistory();
  } catch (e) {
    toast(e.message, "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Tạo giọng nói";
  }
});

// ---- clone ----
$("cloneBtn").addEventListener("click", async () => {
  const name = $("cloneName").value.trim();
  const refText = $("cloneRefText").value.trim();
  const file = $("cloneFile").files[0];
  if (!name || !refText || !file) return toast("Cần tên, ref text và file audio mẫu", "err");

  const fd = new FormData();
  fd.append("name", name);
  fd.append("refText", refText);
  fd.append("audioFile", file);

  const btn = $("cloneBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Đang xử lý…';
  try {
    await api("/api/clone", { method: "POST", body: fd });
    toast("Đã tạo giọng clone!", "ok");
    $("cloneName").value = ""; $("cloneRefText").value = ""; $("cloneFile").value = "";
    const opt = await api("/api/options");
    renderVoices(opt.voices);
  } catch (e) {
    toast(e.message, "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Tạo giọng clone";
  }
});

// ---- voices ----
function renderVoices(voices) {
  const list = $("voiceList");
  const sel = $("cloneVoiceSelect");
  sel.innerHTML = "";
  if (!voices.length) {
    list.innerHTML = '<li class="empty">Chưa có giọng clone nào</li>';
    sel.innerHTML = '<option value="">— chưa có giọng nào —</option>';
    return;
  }
  list.innerHTML = "";
  voices.forEach((v) => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<div class="item-top">
        <div><span class="item-title">${esc(v.name)}</span> <span class="tag">clone</span>
          <div class="item-sub">${esc(v.refText || "")}</div></div>
        <button class="icon-btn" title="Xoá" data-id="${v.id}">✕</button>
      </div>`;
    li.querySelector(".icon-btn").addEventListener("click", async () => {
      await api("/api/voices/" + v.id, { method: "DELETE" });
      const opt = await api("/api/options");
      renderVoices(opt.voices);
    });
    list.appendChild(li);

    const o = document.createElement("option");
    o.value = v.id; o.textContent = v.name;
    sel.appendChild(o);
  });
}

// ---- history ----
async function refreshHistory() {
  const hist = await api("/api/history");
  const list = $("historyList");
  if (!hist.length) { list.innerHTML = '<li class="empty">Chưa có lịch sử</li>'; return; }
  list.innerHTML = "";
  hist.forEach((h) => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<div class="item-top">
        <div><span class="item-title">${esc(h.voiceName)}</span>
          <div class="item-sub">${esc(h.textPreview)} · ${h.duration}s · ${h.createdAt}</div></div>
        <button class="icon-btn" title="Xoá" data-id="${h.id}">✕</button>
      </div>
      <audio controls src="${h.audioUrl}"></audio>`;
    li.querySelector(".icon-btn").addEventListener("click", async () => {
      await api("/api/history/" + h.id, { method: "DELETE" });
      refreshHistory();
    });
    list.appendChild(li);
  });
}

$("clearHistory").addEventListener("click", async () => {
  await api("/api/history", { method: "DELETE" });
  refreshHistory();
});

function esc(s) { return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

init();
