XAYA AI

XAYA AI adalah platform chatbot AI modern dengan tampilan bersih, responsif, dan nyaman digunakan di desktop maupun perangkat mobile.

XAYA AI dirancang sebagai ruang percakapan AI yang sederhana namun memiliki fitur lengkap, termasuk mode Thinking, mode Ultra, riwayat percakapan, pengaturan tema, dan pembuatan obrolan baru.

Fitur

- Chat dengan AI
- Tampilan modern dan responsif
- Mode Thinking — dapat diaktifkan atau dinonaktifkan
- Mode Ultra
- Riwayat chat
- Obrolan baru
- Pengaturan aplikasi
- Tema terang
- Tema gelap
- Tema biru-hitam
- Tema hitam pekat
- Tema kuning
- Tema hijau
- Animasi teks perkenalan
- Sidebar navigasi
- Tampilan nyaman untuk mobile
- UI yang ringan dan mudah digunakan
- Penyimpanan riwayat percakapan secara lokal
- Desain yang dapat dikembangkan untuk berbagai API AI

Preview

«XAYA AI — Your Intelligent AI Assistant»

Tampilan dirancang dengan fokus pada pengalaman pengguna yang sederhana, modern, dan responsif.

Teknologi

Project ini dapat dikembangkan menggunakan:

- HTML
- CSS
- JavaScript
- REST API
- LocalStorage
- API AI pilihan

Struktur Project

XAYA-AI/
├── index.html
├── style.css
├── script.js
├── README.md
└── assets/
    ├── logo/
    ├── icons/
    └── images/

Instalasi

Clone repository:

git clone https://github.com/USERNAME/XAYA-AI.git

Masuk ke folder project:

cd XAYA-AI

Kemudian buka:

index.html

Atau gunakan Live Server untuk menjalankan project secara lokal.

Konfigurasi API

Jika XAYA AI menggunakan API AI, jangan menyimpan API key secara langsung di repository publik.

Contoh konfigurasi:

const API_URL = "YOUR_API_ENDPOINT";
const API_KEY = "YOUR_API_KEY";

Untuk project production, gunakan backend/server untuk menyimpan API key dengan aman.

Tema

XAYA AI menyediakan beberapa pilihan tampilan:

Tema| Deskripsi
Light| Tampilan terang
Dark| Tampilan gelap
Blue Black| Biru dan hitam
Pure Black| Hitam pekat
Yellow| Tema kuning
Green| Tema hijau

Mode AI

Thinking Mode

Mode Thinking digunakan ketika pengguna ingin AI melakukan pemrosesan yang lebih mendalam sebelum memberikan jawaban.

Mode ini dapat dinyalakan atau dimatikan melalui pengaturan XAYA AI.

Ultra Mode

Ultra Mode merupakan mode khusus untuk pengalaman AI yang lebih maksimal, tergantung pada model dan API yang digunakan.

Riwayat Chat

Percakapan dapat ditampilkan dalam bagian History sehingga pengguna dapat kembali membuka percakapan sebelumnya.

Fitur yang dapat dikembangkan:

- Membuat chat baru
- Mengganti nama chat
- Menghapus chat
- Membuka chat sebelumnya
- Menyimpan chat secara lokal

Keamanan

Jangan pernah memasukkan API key pribadi ke dalam repository GitHub publik.

Gunakan:

- Environment variables
- Backend proxy
- Server-side API requests
- Secret management

Contoh:

AI_API_KEY=your_secret_key

Tambahkan file rahasia ke ".gitignore":

.env
.env.local
node_modules/

Pengembangan

Jika ingin mengembangkan XAYA AI lebih lanjut, beberapa fitur yang dapat ditambahkan:

- Login pengguna
- Sinkronisasi cloud
- Streaming response
- Upload file
- Upload gambar
- Voice input
- Text-to-speech
- Markdown renderer
- Code highlighting
- Export conversation
- Pencarian riwayat
- Multi-model AI
- Custom system prompt
- Web search
- Image generation
- Admin dashboard

Kontribusi

Kontribusi untuk XAYA AI sangat terbuka.

1. Fork repository ini.
2. Buat branch baru.

git checkout -b feature-fitur-baru

3. Lakukan perubahan.
4. Commit perubahan.

git commit -m "Add new feature"

5. Push branch.

git push origin feature-fitur-baru

6. Buat Pull Request.

Lisensi

Project ini dapat menggunakan lisensi sesuai kebutuhan pengembang.

Jika menggunakan MIT License, tambahkan file:

LICENSE

dengan lisensi MIT.

Status

XAYA AI — In Development

Project masih dapat terus dikembangkan dengan berbagai fitur AI dan integrasi model baru.

---

XAYA AI

Simple. Modern. Intelligent.

Dibuat untuk menghadirkan pengalaman chatbot AI yang cepat, bersih, dan mudah digunakan.
