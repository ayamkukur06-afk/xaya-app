/* =========================================================
   chat-widget.js — Chat global real-time (gaya WhatsApp)
   + online sekarang & total pengunjung, pakai Firebase
   Realtime Database.

   Semua path di database di-scope pakai XAYA_COUNTER_NAMESPACE
   (dari config.js, sekarang "xaya-ayam") supaya kalau Firebase
   project ini dipakai bareng project/app lain, datanya nggak
   bentrok — sama seperti namespace yang dipakai counter lama.

   Isi dulu XAYA_FIREBASE_CONFIG di config.js sebelum file ini
   bisa jalan. Load file ini SETELAH SDK Firebase, config.js,
   dan script.js di index.html.

   Rules Realtime Database yang disarankan (Firebase Console ->
   Realtime Database -> Rules) — ganti "xaya-ayam" kalau kamu
   ganti namespace-nya:
   {
     "rules": {
       "xaya-ayam": {
         "chat": {
           "messages": {
             ".read": true,
             ".indexOn": ["ts"],
             "$msgId": {
               ".write": "!data.exists() && newData.hasChildren(['username','text','ts','clientId'])
                           && newData.child('text').val().length > 0
                           && newData.child('text').val().length <= 500"
             }
           }
         },
         "presence": {
           ".read": true,
           "$clientId": { ".write": true }
         },
         "meta": {
           "totalVisitors": { ".read": true, ".write": true }
         }
       }
     }
   }
   Catatan: rules di atas tetap tanpa login/otentikasi (sesuai
   aplikasi ini yang cuma pakai nama panggilan), jadi masih bisa
   disalahgunakan orang yang tahu cara panggil Firebase langsung.
   Cukup aman untuk skala kecil/personal, bukan tingkat keamanan
   produksi.
   ========================================================= */

(function(){
  "use strict";

  function hasFirebaseConfig(){
    return typeof firebase !== "undefined"
      && window.XAYA_FIREBASE_CONFIG
      && typeof window.XAYA_FIREBASE_CONFIG.apiKey === "string"
      && !window.XAYA_FIREBASE_CONFIG.apiKey.includes("GANTI_DENGAN");
  }

  if (!hasFirebaseConfig()){
    console.warn("XAYA: XAYA_FIREBASE_CONFIG belum diisi di config.js — Chat Global nonaktif.");
    return;
  }

  const NS = (typeof XAYA_COUNTER_NAMESPACE === "string" && XAYA_COUNTER_NAMESPACE)
    ? XAYA_COUNTER_NAMESPACE
    : "xaya-default";

  firebase.initializeApp(window.XAYA_FIREBASE_CONFIG);
  const db = firebase.database();
  const root = db.ref(NS);

  const NICKNAME_KEY   = "xayaNickname";
  const DEVICE_KEY     = "xayaDeviceName";
  const CLIENT_ID_KEY  = "xayaClientId";
  const VISITED_KEY    = NS + "_xayaHasVisitedBefore";

  /* ---------------- helper: identitas pengguna ---------------- */
  function detectDevice(){
    const ua = navigator.userAgent;
    let browser = "Browser";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/OPR\//.test(ua)) browser = "Opera";
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

    let os = "Unknown";
    if (/Android/.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
    else if (/Windows/.test(ua)) os = "Windows";
    else if (/Mac OS X/.test(ua)) os = "macOS";
    else if (/Linux/.test(ua)) os = "Linux";

    return browser + " · " + os;
  }

  function makeId(){
    return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getUsername(){
    try{ return localStorage.getItem(NICKNAME_KEY) || "Tamu"; }catch(e){ return "Tamu"; }
  }
  function setUsername(name){
    try{ localStorage.setItem(NICKNAME_KEY, name); }catch(e){}
  }
  function getDeviceName(){
    try{
      let d = localStorage.getItem(DEVICE_KEY);
      if (!d){ d = detectDevice(); localStorage.setItem(DEVICE_KEY, d); }
      return d;
    }catch(e){ return detectDevice(); }
  }
  function setDeviceName(name){
    try{ localStorage.setItem(DEVICE_KEY, name); }catch(e){}
  }
  function getClientId(){
    try{
      let id = localStorage.getItem(CLIENT_ID_KEY);
      if (!id){ id = makeId(); localStorage.setItem(CLIENT_ID_KEY, id); }
      return id;
    }catch(e){ return makeId(); }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  const clientId = getClientId();

  /* ---------------- PRESENCE: online turun beneran saat keluar ----------------
     Pola resmi Firebase: begitu koneksi client putus (tutup tab, refresh,
     internet mati, dsb), Firebase SENDIRI yang menjalankan onDisconnect()
     di sisi server. Beda dari counter lama (countapi) yang cuma get-then-set
     manual dan gagal kalau tab ditutup sebelum request selesai. */
  function setupPresence(){
    const presenceRef = root.child("presence/" + clientId);
    db.ref(".info/connected").on("value", snap => {
      if (snap.val() !== true) return;
      presenceRef.onDisconnect().remove().then(() => {
        presenceRef.set({
          username: getUsername(),
          device: getDeviceName(),
          ts: firebase.database.ServerValue.TIMESTAMP
        });
      });
    });

    root.child("presence").on("value", snap => {
      const count = snap.numChildren();
      document.querySelectorAll("#onlineCount, #aboutOnlineCount")
        .forEach(el => { el.textContent = String(count); });
      const label = document.getElementById("xayaChatOnlineLabel");
      if (label) label.textContent = count + " online";
    });
  }

  function syncPresenceProfile(){
    root.child("presence/" + clientId).update({
      username: getUsername(),
      device: getDeviceName()
    }).catch(() => {});
  }

  /* ---------------- TOTAL PENGUNJUNG (naik terus, +1 per perangkat) ---------------- */
  function setupVisitorCount(){
    const totalRef = root.child("meta/totalVisitors");
    let alreadyVisited = false;
    try{ alreadyVisited = !!localStorage.getItem(VISITED_KEY); }catch(e){}

    if (!alreadyVisited){
      totalRef.transaction(v => (v || 0) + 1).then(() => {
        try{ localStorage.setItem(VISITED_KEY, "1"); }catch(e){}
      });
    }

    totalRef.on("value", snap => {
      const total = snap.val() || 0;
      document.querySelectorAll("#totalVisitorCount, #aboutTotalVisitorCount")
        .forEach(el => { el.textContent = String(total); });
    });
  }

  /* ---------------- WIDGET UI (tombol mengambang + jendela chat global) ---------------- */
  function buildWidgetDom(){
    const btn = document.createElement("button");
    btn.id = "xayaChatFabBtn";
    btn.className = "xaya-chat-fab";
    btn.type = "button";
    btn.setAttribute("aria-label", "Buka Chat Global");
    btn.innerHTML =
      '<svg width="25" height="25" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="xaya-chat-fab-badge" id="xayaChatUnread" hidden>0</span>';

    const win = document.createElement("div");
    win.id = "xayaChatWindow";
    win.className = "xaya-chat-window hidden";
    win.innerHTML = `
      <div class="xaya-chat-header">
        <div class="xaya-chat-header-info">
          <strong>Chat Global</strong>
          <span id="xayaChatOnlineLabel">– online</span>
        </div>
        <div class="xaya-chat-header-actions">
          <button class="icon-btn" id="xayaChatProfileBtn" type="button" aria-label="Profil kamu">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.3" stroke="currentColor" stroke-width="1.6"/><path d="M5 20c1-3.5 4-5.5 7-5.5s6 2 7 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </button>
          <button class="icon-btn" id="xayaChatCloseBtn" type="button" aria-label="Tutup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>

      <div class="xaya-chat-profile-panel hidden" id="xayaChatProfilePanel">
        <label for="xayaChatUsernameInput">Nama kamu</label>
        <input type="text" id="xayaChatUsernameInput" maxlength="24" placeholder="Nama kamu...">
        <label for="xayaChatDeviceInput">Nama perangkat</label>
        <input type="text" id="xayaChatDeviceInput" maxlength="30" placeholder="Nama perangkat...">
        <button type="button" id="xayaChatProfileSaveBtn">Simpan</button>
      </div>

      <div class="xaya-chat-messages" id="xayaChatMessages"></div>

      <form class="xaya-chat-input-row" id="xayaChatForm">
        <input type="text" id="xayaChatInput" maxlength="500" placeholder="Tulis pesan..." autocomplete="off">
        <button type="submit" class="xaya-chat-send-btn" aria-label="Kirim pesan">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
        </button>
      </form>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(win);
    return { btn, win };
  }

  function fmtTime(ts){
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }

  function initWidget(){
    const { btn, win } = buildWidgetDom();

    const messagesEl     = win.querySelector("#xayaChatMessages");
    const formEl          = win.querySelector("#xayaChatForm");
    const inputEl          = win.querySelector("#xayaChatInput");
    const closeBtn         = win.querySelector("#xayaChatCloseBtn");
    const profileBtn       = win.querySelector("#xayaChatProfileBtn");
    const profilePanel     = win.querySelector("#xayaChatProfilePanel");
    const usernameInput    = win.querySelector("#xayaChatUsernameInput");
    const deviceInput      = win.querySelector("#xayaChatDeviceInput");
    const profileSaveBtn   = win.querySelector("#xayaChatProfileSaveBtn");
    const unreadBadge      = btn.querySelector("#xayaChatUnread");

    let isOpen = false;
    let unread = 0;
    let historyLoaded = false;

    function setOpen(open){
      isOpen = open;
      win.classList.toggle("hidden", !open);
      if (open){
        unread = 0;
        unreadBadge.hidden = true;
        messagesEl.scrollTop = messagesEl.scrollHeight;
        inputEl.focus();
      }
    }

    btn.addEventListener("click", () => setOpen(!isOpen));
    closeBtn.addEventListener("click", () => setOpen(false));

    function openProfilePanel(){
      usernameInput.value = getUsername();
      deviceInput.value = getDeviceName();
      profilePanel.classList.toggle("hidden");
    }
    profileBtn.addEventListener("click", openProfilePanel);

    profileSaveBtn.addEventListener("click", () => {
      const name = usernameInput.value.trim() || "Tamu";
      const device = deviceInput.value.trim() || detectDevice();
      setUsername(name);
      setDeviceName(device);
      syncPresenceProfile();
      profilePanel.classList.add("hidden");

      const settingUsername = document.getElementById("settingUsername");
      const settingDevice = document.getElementById("settingDeviceName");
      if (settingUsername) settingUsername.value = name;
      if (settingDevice) settingDevice.value = device;
    });

    function appendMessage(key, msg){
      if (messagesEl.querySelector('[data-key="' + key + '"]')) return;
      const mine = msg.clientId === clientId;
      const row = document.createElement("div");
      row.className = "xaya-chat-msg" + (mine ? " mine" : "");
      row.dataset.key = key;
      row.innerHTML =
        (mine ? "" : '<div class="xaya-chat-msg-meta">' + escapeHtml(msg.username) +
          ' <span>· ' + escapeHtml(msg.device || "") + '</span></div>') +
        '<div class="xaya-chat-msg-bubble">' + escapeHtml(msg.text) + '</div>' +
        '<div class="xaya-chat-msg-time">' + fmtTime(msg.ts) + '</div>';
      messagesEl.appendChild(row);

      const nearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 120;
      if (nearBottom || mine) messagesEl.scrollTop = messagesEl.scrollHeight;

      if (!isOpen && historyLoaded && !mine){
        unread++;
        unreadBadge.hidden = false;
        unreadBadge.textContent = String(unread);
      }
    }

    const messagesQuery = root.child("chat/messages").limitToLast(100);
    messagesQuery.on("child_added", snap => appendMessage(snap.key, snap.val()));
    messagesQuery.once("value", () => { historyLoaded = true; });

    formEl.addEventListener("submit", e => {
      e.preventDefault();
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = "";
      root.child("chat/messages").push({
        username: getUsername(),
        device: getDeviceName(),
        clientId,
        text,
        ts: firebase.database.ServerValue.TIMESTAMP
      });
    });
  }

  /* ---------------- BOOT ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    setupPresence();
    setupVisitorCount();
    initWidget();

    document.addEventListener("xaya:nickname-set", () => syncPresenceProfile());

    const settingUsername = document.getElementById("settingUsername");
    const settingDevice   = document.getElementById("settingDeviceName");
    if (settingUsername){
      settingUsername.value = getUsername();
      settingUsername.addEventListener("change", e => {
        setUsername(e.target.value.trim() || "Tamu");
        syncPresenceProfile();
      });
    }
    if (settingDevice){
      settingDevice.value = getDeviceName();
      settingDevice.addEventListener("change", e => {
        setDeviceName(e.target.value.trim() || detectDevice());
        syncPresenceProfile();
      });
    }
  });
})();
