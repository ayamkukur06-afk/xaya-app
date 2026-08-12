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
   SUPABASE — MULTI-USER (daftar pengguna, status online,
   chat antar pengguna, dan panel admin ban/kick)
   ---------------------------------------------------------
   countapi di atas cuma angka doang, jadi fitur ini butuh
   database beneran. Supabase dipilih karena gratis dan bisa
   dipanggil langsung dari browser (tanpa server sendiri).

   Cara aktifkan:
   1. Buat project gratis di https://supabase.com
   2. Buka SQL Editor di dashboard project, jalankan isi file
      supabase-schema.sql (satu file terpisah, sudah disertakan)
   3. Buka Project Settings > API, salin "Project URL" dan
      "anon public" key, lalu isi ke 2 baris di bawah ini.
   --------------------------------------------------------- */
const SUPABASE_URL = "https://befejcdphyvzixkdegyp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlZmVqY2RwaHl2eml4a2RlZ3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MTgyMDAsImV4cCI6MjEwMTk5NDIwMH0.wcmjqZEXwR1bwT5-L7Yjs7a8C-85AKt0nvPEBx8ezKY";

/* Prefix nama tabel di Supabase, disamakan dengan namespace
   counter di atas ("xaya-ayam" -> "xaya_ayam", karena nama
   tabel SQL tidak boleh pakai tanda "-"). */
const XAYA_DB_NAMESPACE = "xaya_ayam";

/* Username yang, kalau diketik di kolom "Kode Admin" pada tab
   Umum di Pengaturan, membuka tab Admin (untuk ban & kick
   pengguna).
   CATATAN JUJUR: XAYA tidak punya sistem login/password
   sungguhan (nama panggilan cuma disimpan di localStorage),
   jadi ini hanyalah kunci sisi-klien untuk menyembunyikan
   tombol admin dari pengguna biasa — BUKAN proteksi keamanan
   sungguhan. Siapa pun yang membaca file ini atau membuka
   DevTools bisa tahu kodenya, dan siapa pun yang punya
   SUPABASE_ANON_KEY di atas (semua pengunjung situs) secara
   teknis bisa memanggil Supabase API secara langsung tanpa
   lewat tombol admin sama sekali. Untuk keamanan sungguhan
   dibutuhkan sistem login + aturan akses di sisi server, yang
   di luar cakupan aplikasi statis (HTML/CSS/JS murni) ini. */
const XAYA_ADMIN_CODE = "ayamkukurayam";
