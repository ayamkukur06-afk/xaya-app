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
