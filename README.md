# EMKAIN GURU - Full-Stack Educational Assistant Platform

EMKAIN GURU adalah platform full-stack mutakhir yang dirancang khusus untuk mendukung kolaborasi, produktivitas, dan efisiensi manajemen materi pembelajaran bagi para rekan guru serta administrator EMKAIN.

Aplikasi ini menggabungkan antarmuka **Single Page Application (SPA) React** yang responsif dan berestetika modern dengan **Express Node.js Backend** sebagai server API, didukung sepenuhnya oleh **Supabase (Auth, Database, Storage, dan Realtime)** untuk persistensi data secara real-time dan aman.

---

## 🚀 Fitur Utama & Arsitektur Fitur

Aplikasi ini memiliki sistem otorisasi dan fungsionalitas ganda berdasarkan peran pengguna:

1. **Autentikasi & Manajemen Peran Mandatori**
   - **Administrator Resmi**: Menggunakan akun `admin@gmail.com` dengan hak akses penuh ke panel kontrol.
   - **Rekan Guru**: Semua akun non-admin secara otomatis diberikan peran `guru`.
   - **Kontrol Akun**: Guru yang dinonaktifkan oleh administrator kehilangan akses masuk ke aplikasi (*Account Disabled Screen*).

2. **Dashboard Guru & Panel Navigasi**
   - Menampilkan status konektivitas Supabase secara langsung (*live connectivity indicator*).
   - Akses cepat ke seluruh fitur utama: Pembuat Soal, Forum Diskusi, Lounge Pesan Pribadi, Bank Materi, dan Simulasi Ujian.

3. **Generator Soal Mandiri & Bank Soal (AI Cooking)**
   - Guru dapat membuat paket soal baru berdasarkan Mata Pelajaran, Tingkat Kelas, Topik Pembelajaran, Tingkat Kesulitan (Mudah, Sedang, Sulit), Jenis Pertanyaan (Pilihan Ganda/Esai), dan Jumlah Soal.
   - Simulasi pembuatan soal dengan antarmuka memukau (*AI Cooking screen*).

4. **EMKAIN Forum (Komunitas Diskusi)**
   - Media sosial internal guru untuk berbagi ide, materi, dan diskusi kurikulum.
   - Dilengkapi dengan fitur kategori diskusi, tombol upvote, dan utas komentar yang interaktif.

5. **EMKAIN Lounge (Pesan Pribadi & File Sharing)**
   - Sistem komunikasi pribadi (*direct messaging*) antar guru dan administrator.
   - **Multi-Format Attachment Support**: Berbagi dokumen (Word, PDF, Excel, PowerPoint, CSV), foto/gambar, video, dan rekaman audio.
   - **Rich Media Elements**: Dilengkapi dengan Media Player terintegrasi (Audio & Video langsung di bubble chat), Lightbox Image Zoom, dan tombol download aman.
   - **Pesan Terenkripsi & Terkontrol**: Tombol hapus pesan sendiri (*sender-only deletion*) dengan pembersihan aset media otomatis.

6. **Materi Pembelajaran & Simulasi Ujian**
   - Pustaka kurikulum digital untuk membaca bahan ajar secara interaktif.
   - Modul ujian interaktif dengan penghitung waktu mundur (*timer*) dan penilaian otomatis instan setelah selesai.

7. **Admin Panel Control (Eksklusif Administrator)**
   - Manajemen database guru: Mengaktifkan/menonaktifkan akun guru, memantau detail profil, dan penyesuaian hak akses.

---

## 🛠️ Tech Stack & Konfigurasi Arsitektur

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide Icons, Framer Motion.
- **Backend API**: Node.js, Express v4, Multer, Tsx (TypeScript Execution), Esbuild.
- **Database & Storage**: Supabase (PostgreSQL Database, Auth Service, Storage Buckets).
- **Production Bundling**: Bundling CJS Node.js teroptimasi menggunakan `esbuild` untuk kecepatan startup maksimum pada kontainer Google Cloud Run atau hosting Node.js sejenis.

---

## 📋 Variabel Lingkungan (Environment Variables)

Salin berkas `.env.example` menjadi `.env` di direktori utama Anda sebelum menjalankan aplikasi:

```bash
cp .env.example .env
```

Isi variabel lingkungan berikut secara tepat sesuai dengan konsol Supabase Anda:

```env
# Supabase Client Credentials (Diperlukan oleh Frontend & Server)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Server-Only Secret (SANGAT RAHASIA - Jangan perlihatkan ke Frontend!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key...
```

> ⚠️ **PENTING**: Kunci `SUPABASE_SERVICE_ROLE_KEY` (service-role key) memiliki akses penuh melintasi sistem keamanan RLS Supabase. **HANYA** gunakan kunci ini di lingkungan backend (`server.ts`) dan **JANGAN PERNAH** memajangnya di kode client-side (Frontend/React) atau menambahkannya dengan awalan `VITE_`.

---

## 📦 Panduan Menjalankan & Membangun Project

### 1. Instalasi Dependensi
Jalankan perintah berikut untuk menginstal seluruh pustaka yang diperlukan:
```bash
npm install
```

### 2. Mode Pengembangan (Development)
Jalankan server pengembangan lokal (Express backend + Vite middleware) secara bersamaan pada port `3000`:
```bash
npm run dev
```
Akses aplikasi melalui peramban di: `http://localhost:3000`

### 3. Membangun Build Produksi (Production Build)
Untuk melakukan kompilasi aset frontend menjadi file statis teroptimasi dan membundel backend TypeScript menjadi satu file NodeJS CommonJS mandiri (`dist/server.cjs`):
```bash
npm run build
```

### 4. Menjalankan Server Produksi (Production Run)
Jalankan server aplikasi produksi yang telah dikompilasi:
```bash
npm run start
```
Aplikasi akan mendengarkan permintaan pada port `3000` (`0.0.0.0:3000`), siap melayani lalu lintas pengguna secara penuh dan responsif.

---

## 🌐 Kesiapan Produksi (Production-Ready) & Custom Domain

Aplikasi ini dirancang sepenuhnya terbebas dari ketergantungan hostname tertentu (*zero hardcoded hostnames*). Anda dapat mendeploy aplikasi ini ke cloud platform pilihan Anda (misalnya **Google Cloud Run**, AWS, VPS, atau Docker-based hosting) dan memasang custom domain Anda, seperti:

👉 **https://app.mkverse.my.id**

- **Auth Redirects**: Semua skema autentikasi Supabase menggunakan rujukan dinamis `window.location.origin` guna memuluskan transisi URL dari lingkungan pengembangan ke domain produksi tanpa konfigurasi berulang.
- **Single Page Application Fallback**: Backend produksi Express telah dilengkapi dengan router fallback wild-card `app.get('*')` untuk memastikan seluruh rute SPA internal (seperti `/dashboard`, `/forum`, dll.) tetap bekerja dengan sempurna tanpa memicu halaman error `404 Not Found` pada refresh browser.
- **Penyimpanan Berkas**: Seluruh file lampiran chat disimpan langsung di dalam cloud bucket **Supabase Storage** sehingga aman dari penghapusan disk sementara pada platform berbasis kontainer (seperti Google Cloud Run).

---

## 🔒 Keamanan & Penanganan Kesalahan (Security & Error Handling)

- **Sanitisasi Pesan Error**: Pesan kesalahan sistem di tingkat backend disanitasi secara ketat sebelum dikirim ke pengguna. Pengguna tidak akan melihat raw stack-trace PostgreSQL atau informasi kunci rahasia saat terjadi galat, melainkan pesan ramah pengguna.
- **Signed Attachments**: Pengunduhan berkas media di dalam EMKAIN Lounge dilindungi menggunakan *signed token-based URL* temporer untuk menjamin berkas hanya dapat diakses oleh anggota percakapan yang terautentikasi secara sah.

---

## 🧑‍💻 Hak Cipta dan Lisensi

Dikembangkan secara eksklusif untuk **EMKAIN GURU Platform**.
Lisensi di bawah **Apache-2.0 License**. All rights reserved.
