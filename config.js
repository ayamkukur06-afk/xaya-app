/* =========================================================
   config.js — Konfigurasi terpisah dari script.js
   Isinya: API key Groq per model, dan URL avatar (catbox.moe).
   Load file ini SEBELUM script.js di index.html.
   ========================================================= */

/* ---------- ASET: AVATAR (catbox.moe) ---------- */
const XAYA_AVATAR_URL = "https://files.catbox.moe/ikhtan.jpg";

/* Terapkan avatar ke semua elemen <img class="xaya-avatar-img"> di HTML,
   dan sediakan konstanta untuk dipakai script.js saat render pesan chat. */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".xaya-avatar-img").forEach(img => {
    img.src = XAYA_AVATAR_URL;
  });
});

/* ---------- API KEY GROQ (per model: teks & vision/gambar) ---------- */
const XAYA_API_KEYS = {
  "XAYA BLACKHOLE": "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",
  "QHY XAYA": "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"
};

/* ---------------------------------------------------------
   NAMESPACE COUNTER (untuk hitung user online & total pengunjung)
   Pakai countapi.mileshilliard.com — API counter gratis pengganti
   countapi.xyz (yang sudah tutup/tidak aktif lagi per pertengahan
   2026). Bukan database, cuma penghitung angka bersama lewat API
   sederhana, tanpa perlu daftar akun atau API key.
   Ganti XAYA_COUNTER_NAMESPACE dengan nama unik supaya angkanya
   tidak bentrok dengan pengguna lain (semua key bersifat publik).
   --------------------------------------------------------- */
const XAYA_COUNTER_NAMESPACE = "xaya-ayam";

/* ---------------------------------------------------------
   FIREBASE (chat pengguna real-time + online/offline presence)
   ---------------------------------------------------------
   1. Buka https://console.firebase.google.com -> Add project.
   2. Di project, buka menu "Build > Realtime Database" -> Create
      Database -> pilih lokasi -> mulai di "test mode" dulu (nanti
      rules-nya diganti, lihat catatan di chat-widget.js).
   3. Buka Project settings (ikon gerigi) -> scroll ke "Your apps"
      -> klik ikon web "</>" -> daftarkan app (nama bebas) -> nanti
      muncul object firebaseConfig, salin nilainya ke bawah ini.
   4. WAJIB copy juga "databaseURL" (biasanya bentuknya
      https://NAMA-PROJECT-default-rtdb.REGION.firebasedatabase.app)
      -- kadang tidak otomatis muncul di config snippet, ambil dari
      halaman Realtime Database.
   --------------------------------------------------------- */
const XAYA_FIREBASE_CONFIG = {
  apiKey: "GANTI_DENGAN_API_KEY",
  authDomain: "GANTI_DENGAN_PROJECT.firebaseapp.com",
  databaseURL: "https://GANTI_DENGAN_PROJECT-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "GANTI_DENGAN_PROJECT",
  storageBucket: "GANTI_DENGAN_PROJECT.appspot.com",
  messagingSenderId: "GANTI_DENGAN_SENDER_ID",
  appId: "GANTI_DENGAN_APP_ID"
};
