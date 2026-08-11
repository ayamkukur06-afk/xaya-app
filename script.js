/* =========================================================
   XAYA — index.js
   Vanilla JS. No frameworks.
   ========================================================= */

/* ---------------------------------------------------------
   KONFIGURASI MODEL
   Nama "XAYA BLACKHOLE" dan "QHY XAYA" adalah nama tampilan
   milik produk ini, BUKAN nama resmi model Groq. Setiap nama
   dipetakan ke id model Groq asli di bawah ini. Ganti nilai
   id sesuai model yang tersedia di akun Groq Anda.
   --------------------------------------------------------- */
const XAYA_MODELS = {
  "XAYA BLACKHOLE": {
    id: "openai/gpt-oss-120b",
    description: "Model umum, jawaban lebih lengkap dan teliti.",
    vision: false,
    maxContext: 32768,
    apiKey: "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"
  },
  "QHY XAYA": {
    id: "qwen/qwen3.6-27b",
    description: "Mendukung analisis gambar (vision) dan respons cepat.",
    vision: true,
    maxContext: 16384,
    apiKey: "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"
  }
};

/* ---------------------------------------------------------
   KONFIGURASI API GROQ
   PENTING: JANGAN taruh API key rahasia di sini untuk kode
   produksi. Nilai di bawah adalah placeholder. Idealnya
   endpoint mengarah ke backend/proxy milik Anda sendiri yang
   menyimpan API key secara aman di server side.
   Jika Anda mengisi apiKey di sini untuk pengujian lokal,
   ingat bahwa key tersebut akan terlihat oleh siapa pun yang
   membuka DevTools browser. Jangan lakukan ini di production.
   --------------------------------------------------------- */
const API_CONFIG = {
  endpoint: "https://api.groq.com/openai/v1/chat/completions", // atau URL backend/proxy Anda
  apiKey: "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" // Peringatan: hardcoded atas permintaan pengguna — key ini akan terlihat oleh siapa pun yang membuka DevTools/source di browser
};

/* runtime override, hanya hidup selama sesi (tidak disimpan localStorage) */
let sessionApiKey = "";
let sessionEndpoint = "";

function getActiveEndpoint(){ return sessionEndpoint || API_CONFIG.endpoint; }
/* setiap model XAYA punya API key Groq sendiri-sendiri; key yang diisi manual
   di Pengaturan (sessionApiKey) tetap menang untuk kebutuhan tes lokal. */
function getActiveApiKey(){
  if (sessionApiKey) return sessionApiKey;
  const modelInfo = XAYA_MODELS[state.selectedModel];
  return (modelInfo && modelInfo.apiKey) || API_CONFIG.apiKey;
}
function isDemoMode(){ return !getActiveApiKey(); }

/* ---------------------------------------------------------
   FETCH KE GROQ DENGAN RETRY OTOMATIS SAAT RATE LIMIT (429)
   Supaya API key tidak langsung dianggap "limit" hanya karena
   sesaat kelebihan permintaan — dicoba lagi beberapa kali
   dengan jeda sebelum menyerah.
   --------------------------------------------------------- */
async function fetchGroq(body, signal, onWaiting){
  const maxRetries = 3;
  let attempt = 0;
  while (true){
    const res = await fetch(getActiveEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getActiveApiKey()}`
      },
      body: JSON.stringify(body),
      signal
    });

    if (res.status !== 429 || attempt >= maxRetries) return res;

    const retryAfterHeader = parseFloat(res.headers.get("retry-after"));
    const waitSeconds = Number.isFinite(retryAfterHeader) ? retryAfterHeader : (attempt + 1) * 2.5;
    attempt++;
    if (onWaiting) onWaiting(`Rate limit API tercapai, mencoba lagi dalam ${Math.ceil(waitSeconds)} detik... (${attempt}/${maxRetries})`);
    await new Promise(r => setTimeout(r, waitSeconds * 1000));
  }
}

/* ---------------------------------------------------------
   STATE GLOBAL
   --------------------------------------------------------- */
const state = {
  theme: "biruhitam",
  selectedModel: "XAYA BLACKHOLE",
  thinkingMode: false,
  ultraMode: false,
  settings: {
    assistantName: "XAYA",
    language: "id",
    enterToSend: true,
    textSize: "medium",
    timestamp: true,
    streaming: true,
    autoContinue: false,
    soundEffects: true
  },
  chatHistory: [],       // array of conversation objects
  currentConversationId: null,
  pendingAttachments: [], // {type:'image'|'file', name, mime, size, dataUrl/text}
  abortController: null,
  isGenerating: false
};

const THEME_LIST = [
  { key: "cerah", label: "Cerah", dots: ["#ffffff", "#3d4de0", "#e4e4e7"] },
  { key: "gelap", label: "Gelap", dots: ["#18181b", "#7d8bff", "#2c2c31"] },
  { key: "biruhitam", label: "Biru Hitam", dots: ["#0a0e17", "#3d8bff", "#202b41"] },
  { key: "unguhitam", label: "Ungu Hitam", dots: ["#100a17", "#a56dff", "#2a1f3d"] },
  { key: "kuning", label: "Kuning", dots: ["#fffdf5", "#c99400", "#ece0ad"] },
  { key: "hijau", label: "Hijau", dots: ["#f6fbf6", "#1f8b4d", "#cde6cf"] }
];

/* ---------------------------------------------------------
   UTIL
   --------------------------------------------------------- */
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function formatTime(ts){
  const d = new Date(ts);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
function formatBytes(bytes){
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
function safeParse(json, fallback){
  try { const v = JSON.parse(json); return v === null || v === undefined ? fallback : v; }
  catch(e){ return fallback; }
}
function showToast(msg, ms = 2600){
  const stack = qs("#toastStack");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .2s ease"; setTimeout(() => el.remove(), 200); }, ms);
}

/* ---------------------------------------------------------
   EFEK SUARA UI (Web Audio API, tanpa file audio eksternal)
   --------------------------------------------------------- */
let uiAudioCtx = null;
function playUiSound(){
  if (state.settings.soundEffects === false) return;
  try{
    if (!uiAudioCtx) uiAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (uiAudioCtx.state === "suspended") uiAudioCtx.resume();
    const t0 = uiAudioCtx.currentTime;
    const osc = uiAudioCtx.createOscillator();
    const gain = uiAudioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(680, t0);
    osc.frequency.exponentialRampToValueAtTime(1120, t0 + 0.08);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    osc.connect(gain).connect(uiAudioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.16);
  } catch(e){ /* Web Audio tidak didukung, abaikan diam-diam */ }
}
function initUiSounds(){
  document.addEventListener("click", e => {
    const trigger = e.target.closest(".icon-btn, .mini-toggle, .sidebar-link, .modal-tab, .plus-menu button, .theme-swatch, .suggestion-chip");
    if (trigger) playUiSound();
  }, true);
}

let confirmResolver = null;
function askConfirm(text){
  qs("#confirmText").textContent = text;
  qs("#confirmOverlay").classList.add("open");
  return new Promise(resolve => { confirmResolver = resolve; });
}
function closeConfirm(result){
  qs("#confirmOverlay").classList.remove("open");
  if (confirmResolver) { confirmResolver(result); confirmResolver = null; }
}

/* ---------------------------------------------------------
   INIT APP
   --------------------------------------------------------- */
function initApp(){
  loadPersistedState();
  initTheme();
  initSidebar();
  initModelSelector();
  initSettings();
  initChat();
  initPlusMenu();
  initAttachmentInputs();
  initConfirmModal();
  initUiSounds();
  renderHistory();
  updateMiniToggles();
  showActiveConversationOrWelcome();
}

function loadPersistedState(){
  state.theme = localStorage.getItem("theme") || "cerah";
  state.selectedModel = localStorage.getItem("selectedModel") || "XAYA BLACKHOLE";
  if (!XAYA_MODELS[state.selectedModel]) state.selectedModel = Object.keys(XAYA_MODELS)[0];
  state.thinkingMode = safeParse(localStorage.getItem("thinkingMode"), false);
  state.ultraMode = safeParse(localStorage.getItem("ultraMode"), false);
  state.settings = Object.assign(state.settings, safeParse(localStorage.getItem("settings"), {}));
  state.chatHistory = safeParse(localStorage.getItem("chatHistory"), []);
  state.currentConversationId = localStorage.getItem("currentConversation") || null;
}

/* ---------------------------------------------------------
   THEME
   --------------------------------------------------------- */
function initTheme(){
  applyTheme(state.theme);
  applyTextSize(state.settings.textSize);
  const grid = qs("#themeGrid");
  grid.innerHTML = "";
  THEME_LIST.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "theme-swatch" + (t.key === state.theme ? " active" : "");
    btn.dataset.theme = t.key;
    btn.innerHTML = `
      <div class="dot-row">${t.dots.map(c => `<span class="dot" style="background:${c}"></span>`).join("")}</div>
      <span>${t.label}</span>
    `;
    btn.addEventListener("click", () => setTheme(t.key));
    grid.appendChild(btn);
  });
}
function applyTheme(themeKey){
  document.body.setAttribute("data-theme", themeKey);
}
function setTheme(themeKey){
  state.theme = themeKey;
  applyTheme(themeKey);
  localStorage.setItem("theme", themeKey);
  qsa(".theme-swatch").forEach(el => el.classList.toggle("active", el.dataset.theme === themeKey));
  showToast("Tema diperbarui");
}
function applyTextSize(size){
  document.body.setAttribute("data-textsize", size || "medium");
}

/* ---------------------------------------------------------
   SIDEBAR
   --------------------------------------------------------- */
function initSidebar(){
  qs("#sidebarOpen").addEventListener("click", () => qs("#app").classList.add("sidebar-open"));
  qs("#sidebarClose").addEventListener("click", () => qs("#app").classList.remove("sidebar-open"));
  qs("#overlay").addEventListener("click", () => qs("#app").classList.remove("sidebar-open"));

  qs("#newChatBtn").addEventListener("click", () => {
    createNewChat();
    qs("#app").classList.remove("sidebar-open");
  });

  qs("#historySearch").addEventListener("input", e => renderHistory(e.target.value));

  qs("#thinkingToggle").addEventListener("click", toggleThinking);
  qs("#ultraToggle").addEventListener("click", toggleUltra);

  qs("#openSettingsBtn").addEventListener("click", openSettings);
  qs("#headerSettingsBtn").addEventListener("click", openSettings);
}

function updateMiniToggles(){
  const th = qs("#thinkingToggle");
  th.dataset.active = state.thinkingMode ? "true" : "false";
  th.querySelector(".state").textContent = state.thinkingMode ? "ON" : "OFF";

  const ul = qs("#ultraToggle");
  ul.dataset.active = state.ultraMode ? "true" : "false";
  ul.querySelector(".state").textContent = state.ultraMode ? "ON" : "OFF";

  const setThinking = qs("#settingThinking"); if (setThinking) setThinking.checked = state.thinkingMode;
  const setUltra = qs("#settingUltra"); if (setUltra) setUltra.checked = state.ultraMode;
}

function toggleThinking(){
  state.thinkingMode = !state.thinkingMode;
  localStorage.setItem("thinkingMode", JSON.stringify(state.thinkingMode));
  updateMiniToggles();
}
function toggleUltra(){
  state.ultraMode = !state.ultraMode;
  localStorage.setItem("ultraMode", JSON.stringify(state.ultraMode));
  updateMiniToggles();
}

/* ---------------------------------------------------------
   MODEL SELECTOR
   --------------------------------------------------------- */
function initModelSelector(){
  const sel = qs("#modelSelect");
  sel.innerHTML = "";
  Object.keys(XAYA_MODELS).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  sel.value = state.selectedModel;
  sel.addEventListener("change", () => switchModel(sel.value));

  const defSel = qs("#settingDefaultModel");
  defSel.innerHTML = sel.innerHTML;
  defSel.value = state.selectedModel;
  defSel.addEventListener("change", () => switchModel(defSel.value));
}
function switchModel(name){
  if (!XAYA_MODELS[name]) return;
  state.selectedModel = name;
  localStorage.setItem("selectedModel", name);
  qs("#modelSelect").value = name;
  qs("#settingDefaultModel").value = name;
}

/* ---------------------------------------------------------
   SETTINGS MODAL
   --------------------------------------------------------- */
function initSettings(){
  qs("#closeSettingsBtn").addEventListener("click", closeSettings);
  qs("#settingsOverlay").addEventListener("click", e => { if (e.target.id === "settingsOverlay") closeSettings(); });

  qsa(".modal-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      qsa(".modal-tab").forEach(t => t.classList.remove("active"));
      qsa(".tab-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      qs(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add("active");
    });
  });

  qs("#settingAssistantName").value = state.settings.assistantName;
  qs("#settingAssistantName").addEventListener("input", e => {
    state.settings.assistantName = e.target.value || "XAYA";
    persistSettings();
  });

  qs("#settingLanguage").value = state.settings.language;
  qs("#settingLanguage").addEventListener("change", e => {
    state.settings.language = e.target.value;
    persistSettings();
  });

  qs("#settingEnterSend").checked = state.settings.enterToSend;
  qs("#settingEnterSend").addEventListener("change", e => {
    state.settings.enterToSend = e.target.checked;
    persistSettings();
  });

  qs("#settingTextSize").value = state.settings.textSize;
  qs("#settingTextSize").addEventListener("change", e => {
    state.settings.textSize = e.target.value;
    applyTextSize(e.target.value);
    persistSettings();
  });

  qs("#settingSoundEffects").checked = state.settings.soundEffects;
  qs("#settingSoundEffects").addEventListener("change", e => {
    state.settings.soundEffects = e.target.checked;
    persistSettings();
    if (e.target.checked) playUiSound();
  });

  qs("#settingThinking").addEventListener("change", () => { toggleThinking(); });
  qs("#settingUltra").addEventListener("change", () => { toggleUltra(); });

  qs("#settingEndpoint").addEventListener("input", e => { sessionEndpoint = e.target.value.trim(); });
  qs("#settingApiKey").addEventListener("input", e => { sessionApiKey = e.target.value.trim(); });

  qs("#settingTimestamp").checked = state.settings.timestamp;
  qs("#settingTimestamp").addEventListener("change", e => { state.settings.timestamp = e.target.checked; persistSettings(); renderActiveMessages(); });

  qs("#settingStreaming").checked = state.settings.streaming;
  qs("#settingStreaming").addEventListener("change", e => { state.settings.streaming = e.target.checked; persistSettings(); });

  qs("#settingAutoContinue").checked = state.settings.autoContinue;
  qs("#settingAutoContinue").addEventListener("change", e => { state.settings.autoContinue = e.target.checked; persistSettings(); });

  qs("#exportHistoryBtn").addEventListener("click", exportHistory);
  qs("#clearHistoryBtn").addEventListener("click", async () => {
    const ok = await askConfirm("Semua riwayat percakapan akan dihapus permanen. Lanjutkan?");
    if (!ok) return;
    state.chatHistory = [];
    state.currentConversationId = null;
    saveHistory();
    renderHistory();
    showActiveConversationOrWelcome();
    showToast("Riwayat chat dihapus");
  });
  qs("#clearAllBtn").addEventListener("click", async () => {
    const ok = await askConfirm("Seluruh data XAYA di perangkat ini (tema, pengaturan, riwayat) akan direset. Lanjutkan?");
    if (!ok) return;
    localStorage.clear();
    location.reload();
  });

  updateHistoryCountLabel();
}
function persistSettings(){ localStorage.setItem("settings", JSON.stringify(state.settings)); }
function openSettings(){
  qs("#settingsOverlay").classList.add("open");
  updateHistoryCountLabel();
}
function closeSettings(){ qs("#settingsOverlay").classList.remove("open"); }
function updateHistoryCountLabel(){
  const el = qs("#historyCountLabel");
  if (el) el.textContent = `${state.chatHistory.length} percakapan tersimpan.`;
}
function exportHistory(){
  try{
    const blob = new Blob([JSON.stringify(state.chatHistory, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "xaya-riwayat.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast("Riwayat diekspor");
  } catch(e){ showToast("Gagal mengekspor riwayat"); }
}

function initConfirmModal(){
  qs("#confirmCancel").addEventListener("click", () => closeConfirm(false));
  qs("#confirmOk").addEventListener("click", () => closeConfirm(true));
}

/* ---------------------------------------------------------
   CHAT — CORE
   --------------------------------------------------------- */
function initChat(){
  const input = qs("#chatInput");
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 180) + "px";
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey && state.settings.enterToSend){
      e.preventDefault();
      sendMessage();
    }
  });

  qs("#sendBtn").addEventListener("click", sendMessage);
  qs("#stopBtn").addEventListener("click", stopGeneration);

  qsa(".suggestion-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      qs("#chatInput").value = chip.dataset.text;
      qs("#chatInput").dispatchEvent(new Event("input"));
      qs("#chatInput").focus();
    });
  });
}

function getCurrentConversation(){
  return state.chatHistory.find(c => c.id === state.currentConversationId) || null;
}

function createNewChat(){
  if (state.isGenerating) stopGeneration();
  state.currentConversationId = null;
  localStorage.setItem("currentConversation", "");
  qs("#chatInput").value = "";
  qs("#chatInput").style.height = "auto";
  state.pendingAttachments = [];
  renderAttachPreviews();
  showActiveConversationOrWelcome();
  renderHistory();
}

function showActiveConversationOrWelcome(){
  const conv = getCurrentConversation();
  const welcome = qs("#welcome");
  const msgWrap = qs("#messages");
  if (!conv || conv.messages.length === 0){
    welcome.classList.remove("hidden");
    msgWrap.innerHTML = "";
  } else {
    welcome.classList.add("hidden");
    renderActiveMessages();
  }
}

function renderActiveMessages(){
  const conv = getCurrentConversation();
  const msgWrap = qs("#messages");
  msgWrap.innerHTML = "";
  if (!conv) return;
  conv.messages.forEach(m => msgWrap.appendChild(buildMessageEl(m)));
  scrollToBottom();
}

function scrollToBottom(){
  const el = qs("#chatScroll");
  el.scrollTop = el.scrollHeight;
}

/* ---------- building message elements ---------- */
function buildMessageEl(m){
  const wrap = document.createElement("div");
  wrap.className = "msg " + m.role;
  wrap.dataset.id = m.id;

  if (m.role === "assistant"){
    const header = document.createElement("div");
    header.className = "msg-header";
    header.innerHTML = `<img class="msg-avatar" src="https://files.catbox.moe/ikhtan.jpg" alt="${escapeHtml(state.settings.assistantName)}"><span class="msg-header-name">${escapeHtml(state.settings.assistantName)}</span>`;
    wrap.appendChild(header);
  }

  if (m.attachments && m.attachments.length){
    const row = document.createElement("div");
    row.className = "attach-thumb-row";
    m.attachments.forEach(a => {
      if (a.type === "image"){
        const t = document.createElement("div");
        t.className = "attach-thumb";
        t.innerHTML = `<img src="${a.dataUrl}" alt="${escapeHtml(a.name)}">`;
        row.appendChild(t);
      } else {
        const chip = document.createElement("div");
        chip.className = "attach-file-chip";
        chip.textContent = `${a.name} · ${formatBytes(a.size)}`;
        row.appendChild(chip);
      }
    });
    wrap.appendChild(row);
  }

  if (m.role === "assistant" && m.ultra){
    const badge = document.createElement("div");
    badge.className = "ultra-badge";
    badge.textContent = "ULTRA ACTIVE";
    wrap.appendChild(badge);
  }

  if (m.role === "assistant" && m.statusText && m.pending){
    const badge = document.createElement("div");
    badge.className = "status-badge";
    badge.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span> ${escapeHtml(m.statusText)}`;
    wrap.appendChild(badge);
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  if (m.error){
    bubble.appendChild(buildErrorBox(m));
  } else if (m.role === "assistant"){
    renderRichContent(bubble, m.content || "");
  } else {
    bubble.textContent = m.content || "";
  }
  wrap.appendChild(bubble);

  if (m.role === "assistant" && m.sources && m.sources.length){
    const src = document.createElement("div");
    src.className = "web-sources";
    const title = document.createElement("div");
    title.className = "web-sources-title";
    title.innerHTML = `${globeSvg()} Sumber web`;
    src.appendChild(title);
    const list = document.createElement("div");
    list.className = "web-sources-list";
    m.sources.forEach(s => {
      const a = document.createElement("a");
      a.href = s.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.className = "web-source-chip";
      a.textContent = s.title.length > 42 ? s.title.slice(0, 42) + "…" : s.title;
      list.appendChild(a);
    });
    src.appendChild(list);
    wrap.appendChild(src);
  }

  if (m.truncated){
    const notice = document.createElement("div");
    notice.className = "truncated-notice";
    notice.innerHTML = `<span>Jawaban mungkin belum selesai.</span>`;
    const btn = document.createElement("button");
    btn.textContent = "Lanjutkan";
    btn.addEventListener("click", () => continueResponse(m.id));
    notice.appendChild(btn);
    wrap.appendChild(notice);
  }

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  if (state.settings.timestamp){
    const time = document.createElement("span");
    time.textContent = formatTime(m.ts);
    meta.appendChild(time);
  }
  const actions = document.createElement("div");
  actions.className = "msg-actions";
  actions.appendChild(actionBtn("copy", copySvg(), () => copyMessage(m.id)));
  if (m.role === "user"){
    actions.appendChild(actionBtn("edit", editSvg(), () => editPrompt(m.id)));
  }
  if (m.role === "assistant" && !m.pending){
    actions.appendChild(actionBtn("retry", retrySvg(), () => retryMessage(m.id)));
  }
  actions.appendChild(actionBtn("delete", trashSvg(), () => deleteMessage(m.id)));
  meta.appendChild(actions);
  wrap.appendChild(meta);

  return wrap;
}

function actionBtn(title, svg, handler){
  const b = document.createElement("button");
  b.title = title; b.innerHTML = svg;
  b.addEventListener("click", handler);
  return b;
}
function copySvg(){ return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" stroke-width="1.5"/></svg>`; }
function editSvg(){ return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`; }
function retrySvg(){ return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 1 3 6.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 21v-6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function trashSvg(){ return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function globeSvg(){ return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.4"/><path d="M3 12h18M12 3c2.4 2.7 2.4 15.3 0 18M12 3c-2.4 2.7-2.4 15.3 0 18" stroke="currentColor" stroke-width="1.2"/></svg>`; }

function buildErrorBox(m){
  const box = document.createElement("div");
  box.className = "error-box";
  box.innerHTML = `<span>${escapeHtml(m.content || "Terjadi kesalahan.")}</span>`;
  const btn = document.createElement("button");
  btn.className = "retry-btn";
  btn.textContent = "Coba Lagi";
  btn.addEventListener("click", () => retryMessage(m.id));
  box.appendChild(btn);
  return box;
}

/* ---------------------------------------------------------
   ATTACHMENTS (PLUS BUTTON)
   --------------------------------------------------------- */
function initPlusMenu(){
  const plusBtn = qs("#plusBtn");
  const menu = qs("#plusMenu");
  plusBtn.addEventListener("click", e => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });
  document.addEventListener("click", () => menu.classList.remove("open"));
  menu.addEventListener("click", e => e.stopPropagation());

  menu.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      menu.classList.remove("open");
      const action = btn.dataset.action;
      if (action === "camera") qs("#cameraInput").click();
      if (action === "gallery") qs("#galleryInput").click();
      if (action === "file") qs("#fileInput").click();
    });
  });
}

function initAttachmentInputs(){
  qs("#cameraInput").addEventListener("change", e => handleAttachment(e.target.files, "image"));
  qs("#galleryInput").addEventListener("change", e => handleAttachment(e.target.files, "image"));
  qs("#fileInput").addEventListener("change", e => handleAttachment(e.target.files, "file"));
}

function handleAttachment(fileList, kind){
  if (!fileList || !fileList.length) return;
  Array.from(fileList).forEach(file => {
    if (kind === "image") handleImage(file);
    else handleFile(file);
  });
  // reset input value supaya file yang sama bisa dipilih ulang
  qs("#cameraInput").value = "";
  qs("#galleryInput").value = "";
  qs("#fileInput").value = "";
}

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
function handleImage(file){
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)){
    showToast("Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.");
    return;
  }
  const modelInfo = XAYA_MODELS[state.selectedModel];
  if (!modelInfo.vision){
    showToast("Model yang dipilih tidak mendukung analisis gambar.");
  }
  if (file.size > 8 * 1024 * 1024){
    showToast("Ukuran gambar terlalu besar (maks 8MB).");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingAttachments.push({
      id: uid(), type: "image", name: file.name, mime: file.type, size: file.size, dataUrl: reader.result
    });
    renderAttachPreviews();
  };
  reader.onerror = () => showToast("Gagal membaca gambar.");
  reader.readAsDataURL(file);
}

const SUPPORTED_TEXT_EXT = ["txt", "json", "html", "css", "js", "csv", "md"];
function handleFile(file){
  const ext = file.name.split(".").pop().toLowerCase();
  if (!SUPPORTED_TEXT_EXT.includes(ext)){
    showToast(`Format .${ext} membutuhkan parser/backend tambahan dan belum didukung.`);
    return;
  }
  if (file.size > 2 * 1024 * 1024){
    showToast("Ukuran file terlalu besar (maks 2MB).");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingAttachments.push({
      id: uid(), type: "file", name: file.name, mime: file.type || ext, size: file.size, text: reader.result
    });
    renderAttachPreviews();
  };
  reader.onerror = () => showToast("Gagal membaca file.");
  reader.readAsText(file);
}

function renderAttachPreviews(){
  const row = qs("#attachPreviewRow");
  row.innerHTML = "";
  state.pendingAttachments.forEach(a => {
    const wrap = document.createElement("div");
    wrap.className = "attach-preview";
    if (a.type === "image"){
      wrap.innerHTML = `<img src="${a.dataUrl}" alt="${escapeHtml(a.name)}">`;
    } else {
      wrap.innerHTML = `<div class="file-tag"><span class="fname">${escapeHtml(a.name)}</span></div>`;
    }
    const rm = document.createElement("button");
    rm.className = "attach-remove";
    rm.textContent = "×";
    rm.addEventListener("click", () => {
      state.pendingAttachments = state.pendingAttachments.filter(x => x.id !== a.id);
      renderAttachPreviews();
    });
    wrap.appendChild(rm);
    row.appendChild(wrap);
  });
}

/* ---------------------------------------------------------
   SEND MESSAGE / GENERATION
   --------------------------------------------------------- */
function ensureConversation(){
  let conv = getCurrentConversation();
  if (!conv){
    conv = { id: uid(), title: null, messages: [], model: state.selectedModel, createdAt: Date.now(), updatedAt: Date.now() };
    state.chatHistory.unshift(conv);
    state.currentConversationId = conv.id;
    localStorage.setItem("currentConversation", conv.id);
  }
  return conv;
}

async function sendMessage(){
  if (state.isGenerating) return;
  const input = qs("#chatInput");
  const text = input.value.trim();
  if (!text && state.pendingAttachments.length === 0) return;

  const conv = ensureConversation();
  if (!conv.title) conv.title = text.slice(0, 60) || "Percakapan baru";

  const userMsg = {
    id: uid(), role: "user", content: text, ts: Date.now(),
    attachments: state.pendingAttachments.slice()
  };
  conv.messages.push(userMsg);
  state.pendingAttachments = [];
  renderAttachPreviews();
  input.value = ""; input.style.height = "auto";

  qs("#welcome").classList.add("hidden");
  qs("#messages").appendChild(buildMessageEl(userMsg));
  scrollToBottom();

  saveHistory(); renderHistory();

  await runAssistantTurn(conv);
}

function buildStatusSequence(){
  return ["Menganalisis...", "Memeriksa konteks...", "Menyusun jawaban..."];
}

async function runAssistantTurn(conv){
  const assistantMsg = {
    id: uid(), role: "assistant", content: "", ts: Date.now(),
    pending: true, statusText: "", ultra: state.ultraMode, model: state.selectedModel
  };
  conv.messages.push(assistantMsg);
  const el = buildMessageEl(assistantMsg);
  qs("#messages").appendChild(el);
  scrollToBottom();

  setGeneratingUI(true);

  let statusTimer = null;
  if (state.thinkingMode){
    const seq = buildStatusSequence();
    let i = 0;
    assistantMsg.statusText = seq[0];
    refreshMessageEl(conv, assistantMsg);
    statusTimer = setInterval(() => {
      i = (i + 1) % seq.length;
      assistantMsg.statusText = seq[i];
      refreshMessageEl(conv, assistantMsg);
    }, 900);
  }

  try{
    const result = await streamResponse(conv, assistantMsg);
    clearInterval(statusTimer);
    assistantMsg.pending = false;
    assistantMsg.statusText = "";
    assistantMsg.content = result.text;
    assistantMsg.truncated = result.truncated;
    refreshMessageEl(conv, assistantMsg);
  } catch(err){
    clearInterval(statusTimer);
    assistantMsg.pending = false;
    assistantMsg.statusText = "";
    if (err.name === "AbortError"){
      assistantMsg.content = assistantMsg.content || "(dihentikan oleh pengguna)";
    } else {
      assistantMsg.error = true;
      assistantMsg.content = describeError(err);
    }
    refreshMessageEl(conv, assistantMsg);
  }

  setGeneratingUI(false);
  conv.updatedAt = Date.now();
  saveHistory(); renderHistory();
}

function describeError(err){
  const msg = (err && err.message) || "";
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) return "Gagal terhubung ke server. Periksa koneksi internet Anda.";
  if (msg.includes("429")) return "Rate limit API Groq tercapai setelah beberapa kali dicoba ulang. Tunggu sekitar satu menit lalu coba lagi.";
  if (msg.includes("401") || msg.includes("403")) return "API key tidak valid atau tidak memiliki akses.";
  if (msg.includes("timeout")) return "Permintaan melewati batas waktu (timeout).";
  if (msg.includes("empty")) return "Model mengembalikan jawaban kosong.";
  return "Terjadi kesalahan saat menghasilkan jawaban: " + (msg || "unknown error");
}

function refreshMessageEl(conv, msg){
  const old = qs(`.msg[data-id="${msg.id}"]`);
  const fresh = buildMessageEl(msg);
  if (old) old.replaceWith(fresh); else qs("#messages").appendChild(fresh);
  scrollToBottom();
}

function setGeneratingUI(isGenerating){
  state.isGenerating = isGenerating;
  qs("#sendBtn").classList.toggle("hidden", isGenerating);
  qs("#stopBtn").classList.toggle("hidden", !isGenerating);
}

function stopGeneration(){
  if (state.abortController) state.abortController.abort();
  setGeneratingUI(false);
}

/* ---------- building request payload ---------- */
function buildApiMessages(conv, uptoIndex){
  const modelInfo = XAYA_MODELS[state.selectedModel];
  const msgs = [];

  let systemPrompt = `Anda adalah ${state.settings.assistantName}, asisten AI yang ramah, jelas, dan ringkas. Jawab dalam Bahasa Indonesia kecuali diminta lain.`;
  systemPrompt += " Jangan gunakan ikon emoji peringatan seperti ⚠️ di jawaban Anda; sampaikan catatan atau peringatan penting dengan kalimat biasa saja.";
  systemPrompt += " Jangan memperkenalkan diri atau menyebutkan nama Anda di setiap jawaban (misalnya 'Halo, saya XAYA...'); langsung jawab pertanyaan pengguna kecuali mereka menanyakan siapa Anda.";
  if (state.thinkingMode) systemPrompt += " Pikirkan langkah demi langkah secara internal, namun JANGAN tampilkan proses berpikir Anda ke pengguna — tampilkan hanya jawaban akhir.";
  if (state.ultraMode) systemPrompt += " Mode Ultra aktif: berikan jawaban paling lengkap dan teliti, jangan memotong kode atau penjelasan secara sengaja.";
  if (state.thinkingMode || state.ultraMode) systemPrompt += " Anda memiliki akses pencarian web langsung — gunakan untuk memastikan informasi terkini dan akurat, lalu sebutkan sumbernya secara wajar dalam jawaban.";
  msgs.push({ role: "system", content: systemPrompt });

  const history = conv.messages.slice(0, uptoIndex);
  history.forEach(m => {
    if (m.error) return;
    if (m.role === "user"){
      const hasImages = m.attachments && m.attachments.some(a => a.type === "image");
      let fileContext = "";
      (m.attachments || []).filter(a => a.type === "file").forEach(a => {
        fileContext += `\n\n[File terlampir: ${a.name}]\n${a.text.slice(0, 6000)}`;
      });
      if (hasImages && modelInfo.vision){
        const content = [];
        if (m.content || fileContext) content.push({ type: "text", text: (m.content || "") + fileContext });
        m.attachments.filter(a => a.type === "image").forEach(a => {
          content.push({ type: "image_url", image_url: { url: a.dataUrl } });
        });
        msgs.push({ role: "user", content });
      } else {
        msgs.push({ role: "user", content: (m.content || "") + fileContext });
      }
    } else if (m.role === "assistant" && m.content){
      msgs.push({ role: "assistant", content: m.content });
    }
  });

  return msgs;
}

/* ---------------------------------------------------------
   STREAM RESPONSE (Groq API, OpenAI-compatible SSE)
   --------------------------------------------------------- */
async function streamResponse(conv, assistantMsg){
  const idx = conv.messages.findIndex(m => m.id === assistantMsg.id);
  const apiMessages = buildApiMessages(conv, idx);
  const modelInfo = XAYA_MODELS[state.selectedModel];

  if (isDemoMode()){
    return await demoStream(conv, assistantMsg, apiMessages);
  }

  if (state.thinkingMode || state.ultraMode){
    return await webSearchResponse(conv, assistantMsg, apiMessages);
  }

  state.abortController = new AbortController();
  const maxTokens = 2048;

  const body = {
    model: modelInfo.id,
    messages: apiMessages,
    stream: !!state.settings.streaming,
    max_tokens: maxTokens,
    temperature: 0.7
  };

  const res = await fetchGroq(body, state.abortController.signal, statusText => {
    assistantMsg.statusText = statusText;
    assistantMsg.pending = true;
    refreshMessageEl(conv, assistantMsg);
  });

  if (!res.ok){
    const errText = await res.text().catch(() => "");
    throw new Error(`${res.status} ${errText}`.trim());
  }

  if (!state.settings.streaming){
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const finishReason = data.choices?.[0]?.finish_reason;
    if (!text) throw new Error("empty response");
    assistantMsg.content = text;
    refreshMessageEl(conv, assistantMsg);
    return { text, truncated: finishReason === "length" };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let finishReason = null;

  while (true){
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines){
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      const json = safeParse(payload, null);
      if (!json) continue;
      const delta = json.choices?.[0]?.delta?.content;
      if (delta){
        fullText += delta;
        assistantMsg.content = fullText;
        assistantMsg.pending = false;
        updateStreamingBubble(assistantMsg);
      }
      const fr = json.choices?.[0]?.finish_reason;
      if (fr) finishReason = fr;
    }
  }

  if (!fullText) throw new Error("empty response");
  return { text: fullText, truncated: finishReason === "length" };
}

/* ---------------------------------------------------------
   WEB SEARCH RESPONSE — dipakai otomatis saat mode Thinking
   atau Ultra aktif. Memakai sistem "groq/compound" yang bisa
   melakukan pencarian web sungguhan sebelum menjawab.
   --------------------------------------------------------- */
async function webSearchResponse(conv, assistantMsg, apiMessages){
  state.abortController = new AbortController();
  assistantMsg.statusText = "Mencari informasi terbaru di web...";
  assistantMsg.pending = true;
  refreshMessageEl(conv, assistantMsg);

  const body = {
    // compound-mini lebih hemat token & kuota untuk mode Thinking biasa;
    // compound (penuh, multi-pencarian) hanya dipakai saat Ultra aktif.
    model: state.ultraMode ? "groq/compound" : "groq/compound-mini",
    messages: apiMessages,
    stream: false,
    max_tokens: state.ultraMode ? 4096 : 2048,
    temperature: state.ultraMode ? 0.4 : 0.7
  };

  const res = await fetchGroq(body, state.abortController.signal, statusText => {
    assistantMsg.statusText = statusText;
    assistantMsg.pending = true;
    refreshMessageEl(conv, assistantMsg);
  });

  if (!res.ok){
    const errText = await res.text().catch(() => "");
    throw new Error(`${res.status} ${errText}`.trim());
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message || {};
  const text = message.content || "";
  const finishReason = data.choices?.[0]?.finish_reason;
  if (!text) throw new Error("empty response");

  assistantMsg.sources = extractWebSources(message);
  assistantMsg.content = text;
  refreshMessageEl(conv, assistantMsg);

  return { text, truncated: finishReason === "length" };
}

/* mengambil daftar sumber dari executed_tools hasil pencarian web groq/compound */
function extractWebSources(message){
  const out = [];
  const tools = message.executed_tools || [];
  tools.forEach(t => {
    const results = t.search_results || (t.output && t.output.results) || [];
    (Array.isArray(results) ? results : []).forEach(r => {
      if (r && r.url && !out.some(s => s.url === r.url)){
        out.push({ title: r.title || r.url, url: r.url });
      }
    });
  });
  return out.slice(0, 6);
}

/* saat streaming, update konten bubble secara langsung tanpa rebuild seluruh elemen (menghindari flicker) */
function updateStreamingBubble(assistantMsg){
  const el = qs(`.msg[data-id="${assistantMsg.id}"]`);
  if (!el){ return; }
  let bubble = el.querySelector(".msg-bubble");
  const statusBadge = el.querySelector(".status-badge");
  if (statusBadge) statusBadge.remove();
  if (bubble){
    bubble.innerHTML = "";
    bubble.textContent = assistantMsg.content;
  }
  scrollToBottom();
}

/* ---------- demo mode (tanpa API key) ---------- */
async function demoStream(conv, assistantMsg, apiMessages){
  state.abortController = new AbortController();
  const lastUserText = (apiMessages[apiMessages.length - 1] && apiMessages[apiMessages.length - 1].content) || "";
  const userPreview = typeof lastUserText === "string" ? lastUserText : "(pesan dengan lampiran)";

  const demoText =
`Demo Mode aktif — belum ada endpoint/API key Groq yang dikonfigurasi.

Pesan Anda: "${userPreview.slice(0, 140)}"

Untuk mengaktifkan jawaban AI sungguhan, buka Pengaturan → Model, lalu isi endpoint (idealnya backend/proxy Anda sendiri) dan API key Groq. Jangan menaruh API key rahasia langsung di kode frontend untuk keperluan produksi.

Contoh blok kode agar Anda bisa melihat tampilan code card:

\`\`\`javascript
function sapa(nama) {
  return "Halo, " + nama + "!";
}
\`\`\`
`;

  return new Promise((resolve, reject) => {
    let i = 0;
    let acc = "";
    const signal = state.abortController.signal;
    const onAbort = () => { clearInterval(timer); reject(makeAbortError()); };
    signal.addEventListener("abort", onAbort);
    const timer = setInterval(() => {
      if (signal.aborted) return;
      const chunk = demoText.slice(i, i + 4);
      acc += chunk;
      i += 4;
      assistantMsg.content = acc;
      assistantMsg.pending = false;
      updateStreamingBubble(assistantMsg);
      if (i >= demoText.length){
        clearInterval(timer);
        signal.removeEventListener("abort", onAbort);
        resolve({ text: acc, truncated: false });
      }
    }, 12);
  });
}
function makeAbortError(){ const e = new Error("aborted"); e.name = "AbortError"; return e; }

/* ---------------------------------------------------------
   CONTINUE / RETRY / EDIT / DELETE / COPY
   --------------------------------------------------------- */
async function continueResponse(messageId){
  const conv = getCurrentConversation();
  if (!conv) return;
  const msg = conv.messages.find(m => m.id === messageId);
  if (!msg) return;
  msg.pending = true;
  msg.statusText = "Melanjutkan jawaban...";
  refreshMessageEl(conv, msg);
  setGeneratingUI(true);

  try{
    const idx = conv.messages.findIndex(m => m.id === messageId);
    const apiMessages = buildApiMessages(conv, idx);
    apiMessages.push({ role: "assistant", content: msg.content });
    apiMessages.push({ role: "user", content: "Lanjutkan jawaban sebelumnya persis dari kalimat terakhir, jangan mengulang bagian yang sudah ada." });

    const modelInfo = XAYA_MODELS[state.selectedModel];
    let continuation = "";
    let truncated = false;

    if (isDemoMode()){
      continuation = "\n\n(Demo Mode) Ini adalah kelanjutan simulasi karena belum ada API key yang dikonfigurasi.";
    } else {
      state.abortController = new AbortController();
      const res = await fetchGroq(
        { model: modelInfo.id, messages: apiMessages, stream: false, max_tokens: 2048 },
        state.abortController.signal,
        statusText => { msg.statusText = statusText; refreshMessageEl(conv, msg); }
      );
      if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
      const data = await res.json();
      continuation = data.choices?.[0]?.message?.content || "";
      truncated = data.choices?.[0]?.finish_reason === "length";
      if (!continuation) throw new Error("empty response");
    }

    msg.content = msg.content + continuation;
    msg.truncated = truncated;
    msg.pending = false;
    msg.statusText = "";
    refreshMessageEl(conv, msg);
  } catch(err){
    msg.pending = false; msg.statusText = "";
    showToast(describeError(err));
    refreshMessageEl(conv, msg);
  }

  setGeneratingUI(false);
  conv.updatedAt = Date.now();
  saveHistory();
}

async function retryMessage(messageId){
  const conv = getCurrentConversation();
  if (!conv || state.isGenerating) return;
  const idx = conv.messages.findIndex(m => m.id === messageId);
  if (idx === -1) return;
  const msg = conv.messages[idx];
  if (msg.role === "assistant"){
    conv.messages.splice(idx, 1);
  } else if (msg.role === "user"){
    conv.messages.splice(idx + 1);
  }
  renderActiveMessages();
  await runAssistantTurn(conv);
}

function editPrompt(messageId){
  const conv = getCurrentConversation();
  if (!conv) return;
  const msg = conv.messages.find(m => m.id === messageId);
  if (!msg) return;
  qs("#chatInput").value = msg.content;
  qs("#chatInput").dispatchEvent(new Event("input"));
  qs("#chatInput").focus();
  const idx = conv.messages.findIndex(m => m.id === messageId);
  conv.messages.splice(idx);
  renderActiveMessages();
  saveHistory(); renderHistory();
  showToast("Pesan dipindahkan ke kotak input untuk diedit");
}

async function deleteMessage(messageId){
  const conv = getCurrentConversation();
  if (!conv) return;
  const ok = await askConfirm("Hapus pesan ini?");
  if (!ok) return;
  conv.messages = conv.messages.filter(m => m.id !== messageId);
  conv.updatedAt = Date.now();
  saveHistory(); renderHistory();
  showActiveConversationOrWelcome();
}

function copyMessage(messageId){
  const conv = getCurrentConversation();
  if (!conv) return;
  const msg = conv.messages.find(m => m.id === messageId);
  if (!msg) return;
  navigator.clipboard.writeText(msg.content || "").then(
    () => showToast("Disalin ke clipboard"),
    () => showToast("Gagal menyalin")
  );
}

/* ---------------------------------------------------------
   HISTORY (localStorage)
   --------------------------------------------------------- */
function saveHistory(){
  try{
    localStorage.setItem("chatHistory", JSON.stringify(state.chatHistory));
    localStorage.setItem("currentConversation", state.currentConversationId || "");
    updateHistoryCountLabel();
  } catch(e){ showToast("Gagal menyimpan riwayat (penyimpanan penuh)."); }
}
function loadHistory(){
  state.chatHistory = safeParse(localStorage.getItem("chatHistory"), []);
}

function groupHistory(list){
  const now = new Date();
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups = { "Hari ini": [], "Kemarin": [], "7 Hari Terakhir": [], "Lebih lama": [] };
  list.forEach(c => {
    const t = c.updatedAt || c.createdAt;
    if (t >= today) groups["Hari ini"].push(c);
    else if (t >= yesterday) groups["Kemarin"].push(c);
    else if (t >= weekAgo) groups["7 Hari Terakhir"].push(c);
    else groups["Lebih lama"].push(c);
  });
  return groups;
}

function renderHistory(filter = ""){
  const listEl = qs("#historyList");
  listEl.innerHTML = "";
  const f = filter.trim().toLowerCase();
  let sorted = state.chatHistory.slice().sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  if (f) sorted = sorted.filter(c => (c.title || "").toLowerCase().includes(f));

  if (sorted.length === 0){
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = f ? "Tidak ada hasil." : "Belum ada riwayat.";
    listEl.appendChild(empty);
    return;
  }

  const groups = groupHistory(sorted);
  Object.keys(groups).forEach(label => {
    const items = groups[label];
    if (!items.length) return;
    const groupLabel = document.createElement("div");
    groupLabel.className = "history-group-label";
    groupLabel.textContent = label;
    listEl.appendChild(groupLabel);
    items.forEach(conv => listEl.appendChild(buildHistoryItemEl(conv)));
  });
}

function buildHistoryItemEl(conv){
  const item = document.createElement("div");
  item.className = "history-item" + (conv.id === state.currentConversationId ? " active" : "");

  const title = document.createElement("button");
  title.className = "title";
  title.textContent = conv.title || "Percakapan baru";
  title.addEventListener("click", () => openConversation(conv.id));
  item.appendChild(title);

  const actions = document.createElement("div");
  actions.className = "history-actions";

  const renameBtn = document.createElement("button");
  renameBtn.title = "Ganti nama";
  renameBtn.innerHTML = editSvg();
  renameBtn.addEventListener("click", e => { e.stopPropagation(); startRename(item, conv); });
  actions.appendChild(renameBtn);

  const delBtn = document.createElement("button");
  delBtn.title = "Hapus";
  delBtn.innerHTML = trashSvg();
  delBtn.addEventListener("click", async e => {
    e.stopPropagation();
    const ok = await askConfirm(`Hapus percakapan "${conv.title || "Percakapan baru"}"?`);
    if (!ok) return;
    state.chatHistory = state.chatHistory.filter(c => c.id !== conv.id);
    if (state.currentConversationId === conv.id){
      state.currentConversationId = null;
      localStorage.setItem("currentConversation", "");
      showActiveConversationOrWelcome();
    }
    saveHistory(); renderHistory();
  });
  actions.appendChild(delBtn);

  item.appendChild(actions);
  return item;
}

function startRename(itemEl, conv){
  const titleBtn = itemEl.querySelector(".title");
  const input = document.createElement("input");
  input.className = "rename-input";
  input.value = conv.title || "";
  titleBtn.replaceWith(input);
  input.focus();
  input.select();
  const commit = () => {
    conv.title = input.value.trim() || "Percakapan baru";
    saveHistory(); renderHistory();
  };
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") renderHistory();
  });
  input.addEventListener("blur", commit);
}

function openConversation(id){
  if (state.isGenerating) stopGeneration();
  state.currentConversationId = id;
  localStorage.setItem("currentConversation", id);
  showActiveConversationOrWelcome();
  renderHistory();
  qs("#app").classList.remove("sidebar-open");
}

/* ---------------------------------------------------------
   RICH CONTENT RENDERING (teks + code block)
   --------------------------------------------------------- */
function renderRichContent(bubble, text){
  bubble.innerHTML = "";
  const parts = splitCodeBlocks(text);
  parts.forEach(part => {
    if (part.type === "text"){
      if (!part.content.trim()) return;
      const p = document.createElement("div");
      p.textContent = part.content;
      p.style.whiteSpace = "pre-wrap";
      bubble.appendChild(p);
    } else {
      bubble.appendChild(renderCodeBlock(part.lang, part.content));
    }
  });
  if (!bubble.childNodes.length) bubble.textContent = text;
}

function splitCodeBlocks(text){
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  const result = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null){
    if (match.index > lastIndex) result.push({ type: "text", content: text.slice(lastIndex, match.index) });
    result.push({ type: "code", lang: (match[1] || "text").toLowerCase(), content: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) result.push({ type: "text", content: text.slice(lastIndex) });
  return result;
}

function renderCodeBlock(lang, code){
  const card = document.createElement("div");
  card.className = "code-card";

  const header = document.createElement("div");
  header.className = "code-card-header";
  header.innerHTML = `<span class="code-lang">${escapeHtml(lang || "text")}</span>`;

  const actions = document.createElement("div");
  actions.className = "code-card-actions";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(code).then(() => showToast("Kode disalin"), () => showToast("Gagal menyalin"));
  });
  actions.appendChild(copyBtn);

  const isPreviewable = ["html", "htm"].includes(lang);
  let previewBtn = null;
  if (isPreviewable){
    previewBtn = document.createElement("button");
    previewBtn.textContent = "Preview";
    actions.appendChild(previewBtn);
  }

  const fullscreenBtn = document.createElement("button");
  fullscreenBtn.textContent = "Fullscreen";
  fullscreenBtn.addEventListener("click", () => {
    const frame = card.querySelector(".code-preview-frame");
    if (frame && frame.style.display !== "none" && body.classList.contains("showing-preview")){}
    if (frame && frame.requestFullscreen) frame.requestFullscreen().catch(() => showToast("Fullscreen tidak didukung"));
    else showToast("Fullscreen hanya tersedia untuk preview HTML");
  });
  actions.appendChild(fullscreenBtn);

  const downloadBtn = document.createElement("button");
  downloadBtn.textContent = "Download";
  downloadBtn.addEventListener("click", () => downloadCode(lang, code));
  actions.appendChild(downloadBtn);

  header.appendChild(actions);
  card.appendChild(header);

  let tabs = null;
  if (isPreviewable){
    tabs = document.createElement("div");
    tabs.className = "code-tabs";
    tabs.innerHTML = `<button class="code-tab active" data-tab="code">CODE</button><button class="code-tab" data-tab="preview">PREVIEW</button>`;
    card.appendChild(tabs);
  }

  const body = document.createElement("div");
  body.className = "code-body";
  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");
  codeEl.innerHTML = highlightCode(code, lang);
  pre.appendChild(codeEl);
  body.appendChild(pre);
  card.appendChild(body);

  if (isPreviewable){
    const frame = createPreview(code);
    body.appendChild(frame);

    tabs.querySelectorAll(".code-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.querySelectorAll(".code-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        body.classList.toggle("showing-preview", tab.dataset.tab === "preview");
      });
    });
    if (previewBtn){
      previewBtn.addEventListener("click", () => {
        tabs.querySelector('[data-tab="preview"]').click();
      });
    }
  }

  return card;
}

function createPreview(html){
  const frame = document.createElement("iframe");
  frame.className = "code-preview-frame";
  frame.setAttribute("sandbox", "allow-scripts");
  frame.srcdoc = html;
  return frame;
}

function downloadCode(lang, code){
  const extMap = { javascript: "js", js: "js", html: "html", htm: "html", css: "css", json: "json", python: "py", py: "py", markdown: "md", md: "md" };
  const ext = extMap[lang] || "txt";
  let filename = "code." + ext;
  if (ext === "html") filename = "index.html";
  if (ext === "css") filename = "style.css";
  if (ext === "js") filename = "index.js";
  const blob = new Blob([code], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast(`Mengunduh ${filename}`);
}

/* ---------- syntax highlighting ringan ---------- */
function highlightCode(code, lang){
  let escaped = escapeHtml(code);
  const kw = ["const","let","var","function","return","if","else","for","while","class","import","export","from","new","this","async","await","try","catch","break","continue","switch","case","default","null","true","false","typeof","def","print","end","public","private","void","int","string"];
  if (["html", "htm", "xml"].includes(lang)){
    escaped = escaped.replace(/(&lt;\/?)([a-zA-Z0-9-]+)/g, '$1<span class="tok-tag">$2</span>');
    escaped = escaped.replace(/([a-zA-Z-]+)(=)(&quot;.*?&quot;)/g, '<span class="tok-attr">$1</span>$2<span class="tok-str">$3</span>');
  } else if (["json"].includes(lang)){
    escaped = escaped.replace(/(&quot;.*?&quot;)(\s*:)/g, '<span class="tok-attr">$1</span>$2');
    escaped = escaped.replace(/:\s*(&quot;.*?&quot;)/g, ': <span class="tok-str">$1</span>');
  } else {
    escaped = escaped.replace(/(\/\/.*)/g, '<span class="tok-com">$1</span>');
    escaped = escaped.replace(/(#.*)/g, m => m.includes("include") ? m : `<span class="tok-com">${m}</span>`);
    escaped = escaped.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`)/g, '<span class="tok-str">$1</span>');
    escaped = escaped.replace(new RegExp("\\b(" + kw.join("|") + ")\\b", "g"), '<span class="tok-kw">$1</span>');
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="tok-num">$1</span>');
  }
  return escaped;
}

/* ---------------------------------------------------------
   AUTENTIKASI (Supabase Auth)
   Login/daftar diperlukan sebelum masuk ke chat. Sesi disimpan
   otomatis oleh Supabase (localStorage) sehingga user tetap
   login walau menutup browser.
   --------------------------------------------------------- */
const SUPABASE_URL = "https://befejcdphyvzixkdegyp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Dm2y6L87i6btutQpQyaZnQ_jnwminAP";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let authMode = "login"; // "login" | "register"

function qsAuth(sel){ return document.querySelector(sel); }

function setAuthMode(mode){
  authMode = mode;
  const title = qsAuth("#authTitle");
  const usernameRow = qsAuth("#authUsernameRow");
  const submitBtn = qsAuth("#authSubmitBtn");
  const switchText = qsAuth("#authSwitchText");
  const switchBtn = qsAuth("#authSwitchBtn");
  if (mode === "login"){
    title.textContent = "Masuk ke XAYA";
    usernameRow.classList.add("hidden");
    submitBtn.textContent = "Masuk";
    switchText.textContent = "Belum punya akun?";
    switchBtn.textContent = "Daftar";
  } else {
    title.textContent = "Daftar akun XAYA";
    usernameRow.classList.remove("hidden");
    submitBtn.textContent = "Daftar";
    switchText.textContent = "Sudah punya akun?";
    switchBtn.textContent = "Masuk";
  }
  qsAuth("#authError").classList.add("hidden");
}

function showAuthError(msg){
  const el = qsAuth("#authError");
  el.textContent = msg;
  el.classList.remove("hidden");
}

async function handleAuthSubmit(){
  const email = qsAuth("#authEmail").value.trim();
  const password = qsAuth("#authPassword").value;
  const username = qsAuth("#authUsername").value.trim();
  const btn = qsAuth("#authSubmitBtn");

  if (!email || !password){ showAuthError("Email dan password wajib diisi."); return; }
  if (authMode === "register" && !username){ showAuthError("Username wajib diisi."); return; }
  if (password.length < 6){ showAuthError("Password minimal 6 karakter."); return; }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Memproses...";

  try{
    if (authMode === "login"){
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { username } }
      });
      if (error) throw error;
      showAuthError("");
      qsAuth("#authError").classList.add("hidden");
      alert("Pendaftaran berhasil! Silakan cek email untuk verifikasi, lalu masuk.");
      setAuthMode("login");
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }
    onAuthSuccess();
  } catch(err){
    showAuthError(err.message || "Terjadi kesalahan. Coba lagi.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function onAuthSuccess(){
  qsAuth("#authOverlay").classList.remove("open");
  qsAuth("#app").classList.remove("hidden");
  if (typeof initApp === "function" && !window.__xayaAppStarted){
    window.__xayaAppStarted = true;
    initApp();
  }
}

function showAuthGate(){
  qsAuth("#app").classList.add("hidden");
  qsAuth("#authOverlay").classList.add("open");
}

async function initAuth(){
  const { data } = await supabaseClient.auth.getSession();
  if (data && data.session){
    onAuthSuccess();
  } else {
    showAuthGate();
  }

  qsAuth("#authSubmitBtn").addEventListener("click", handleAuthSubmit);
  qsAuth("#authPassword").addEventListener("keydown", e => { if (e.key === "Enter") handleAuthSubmit(); });
  qsAuth("#authSwitchBtn").addEventListener("click", () => setAuthMode(authMode === "login" ? "register" : "login"));

  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") location.reload();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn){
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
    });
  }
});

