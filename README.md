# Desy Salon & Spa — Web App & Management Studio

Aplikasi web modern untuk layanan salon kecantikan, rias pengantin (*wedding bridal*), dan reservasi acara. Dilengkapi dengan antarmuka publik yang elegan dan responsif, serta dashboard admin (**Studio Manager**) dengan sistem backend **Full TypeScript (Express)** dan database **Supabase (PostgreSQL & Storage CDN)**.

---

## Daftar Isi
- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan (Tech Stack)](#-teknologi-yang-digunakan-tech-stack)
- [Struktur Folder](#-struktur-folder)
- [Persyaratan Sistem](#-persyaratan-sistem)
- [Panduan Instalasi & Menjalankan (Langkah demi Langkah)](#-panduan-instalasi--menjalankan-langkah-demi-langkah)
  - [1. Clone Repository & Install Dependencies](#1-clone-repository--install-dependencies)
  - [2. Setup Database & Storage di Supabase](#2-setup-database--storage-di-supabase)
  - [3. Konfigurasi Environment Variable (.env)](#3-konfigurasi-environment-variable-env)
  - [4. Jalankan Aplikasi Secara Lokal](#4-jalankan-aplikasi-secara-lokal)
- [Kredensial Login Admin Default](#-kredensial-login-admin-default)
- [Dokumentasi Endpoint REST API](#-dokumentasi-endpoint-rest-api)
- [Panduan Deployment ke Production](#-panduan-deployment-ke-production)

---

## Fitur Utama

### Pengunjung Publik
- **Katalog Layanan & Paket:** Eksplorasi paket rias akad, resepsi adat/modern, wisuda, dan perawatan pra-nikah dengan filter kategori dan pencarian.
- **Portofolio Galeri:** Tampilan visual hasil riasan beresolusi tinggi dengan filter kategori acara.
- **Formulir Reservasi Cepat:** Pemesanan online yang otomatis tersimpan ke database dan langsung terhubung ke WhatsApp salon dengan template pesan otomatis.
- **Profil & Navigasi Salon:** Informasi jam operasional, alamat lengkap, dan tautan media sosial.

### Admin (Studio Manager `/admin`)
- **Manajemen Katalog:** Tambah, edit, dan hapus paket layanan salon.
- **Manajemen Kategori:** Tambah dan atur kategori paket secara dinamis.
- **Manajemen Jadwal Booking:**
  - Pemantauan status reservasi: *Menunggu Konfirmasi*, *Terkonfirmasi*, *Menunggu DP*, dan *Lunas*.
  - **Deteksi Bentrok Jadwal Otomatis (*Collision Detection*):** Server otomatis mencegah/memperingatkan jika ada 2 acara pada tanggal dan sesi waktu yang sama.
- **Portofolio & Media Manager:** Upload gambar langsung dari perangkat ke CDN Supabase Storage.
- **Pengaturan Profil & Akun:** Ubah nomor kontak WhatsApp, alamat, jam buka, username, dan password admin secara terenkripsi (bcrypt).

---

## Teknologi yang Digunakan (Tech Stack)

### Frontend
- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + PostCSS
- **Ikon:** Lucide React
- **API Client:** Fetch API dengan arsitektur type-safe & offline fallback

### Backend
- **Runtime:** Node.js (v18+ atau v20+)
- **Framework:** Express.js 
- **Validasi Data:** Zod 
- **Autentikasi:** JWT (*JSON Web Token*) + bcryptjs (Password hashing)
- **Upload File:** Multer + Supabase Storage CDN
- **Dev Runner:** `tsx` (*Zero-config TypeScript execution & hot-reload*)

### Database & Cloud
- **Database:** Supabase (PostgreSQL dengan RLS / *Row Level Security*)
- **Media Storage:** Supabase Storage Bucket (`salon-assets`)

---

## Struktur Folder

```text
desy-salon/
├── dist/                     # Hasil build frontend production
├── public/                   # Asset statis publik
├── src/                      # Source code Frontend (React + TypeScript)
│   ├── assets/               # Logo dan ilustrasi salon
│   ├── services/
│   │   └── api.ts            # API Client service penghubung ke Backend
│   ├── types.ts              # Definisi TypeScript type frontend
│   ├── data.ts               # Data fallback lokal
│   ├── App.tsx               # Komponen utama aplikasi & admin
│   └── main.tsx              # Entry point React
├── server/                   # Source code Backend (Express + TypeScript)
│   ├── src/
│   │   ├── config/           # Konfigurasi env & Supabase client
│   │   ├── middleware/       # Auth guard (JWT), error handler
│   │   ├── modules/          # Modul API (auth, packages, schedules, gallery, profile)
│   │   ├── schemas/          # Validasi skema input (Zod)
│   │   ├── types/            # TypeScript database interfaces
│   │   ├── db/               # Seeding script data awal
│   │   └── index.ts          # Entry point server Express
│   ├── dist/                 # Hasil build compile backend (.js)
│   ├── supabase_schema.sql   # DDL skema database & data awal Supabase
│   ├── Dockerfile            # Multi-stage Docker container backend
│   ├── .dockerignore
│   ├── .env                  # File environment backend (rahasia, tidak di-commit)
│   ├── .env.example          # Contoh format variabel environment
│   ├── package.json          # Dependencies & scripts backend
│   └── tsconfig.json         # Konfigurasi TypeScript backend
├── package.json              # Root dependencies & convenience scripts
├── tailwind.config.js        # Konfigurasi tema Tailwind CSS
├── tsconfig.json             # Konfigurasi TypeScript frontend
└── vite.config.ts            # Konfigurasi Vite & proxy /api
```

---

## Persyaratan Sistem

Sebelum memulai, pastikan perangkat Anda telah terinstall:
- **Node.js** (Versi 18.x, 20.x, atau lebih baru) — [Unduh di nodejs.org](https://nodejs.org/)
- **npm** (Bawaan Node.js) atau **pnpm**
- **Git**
- Akun di **[Supabase](https://supabase.com/)** (Tersedia gratis)

---

## Panduan Instalasi & Menjalankan (Langkah demi Langkah)

### 1. Clone Repository & Install Dependencies

Buka terminal / PowerShell dan jalankan perintah berikut:

```bash
# 1. Masuk ke folder proyek
cd d:/projek/desy-salon

# 2. Install dependencies frontend di root
npm install

# 3. Install dependencies backend di folder server
npm --prefix server install
```

---

### 2. Setup Database & Storage di Supabase

1. Buka dashboard proyek Supabase Anda di [supabase.com/dashboard](https://supabase.com/dashboard).
2. Di menu samping kiri, klik **SQL Editor** $\rightarrow$ klik **New query**.
3. Buka file [`server/supabase_schema.sql`](file:///d:/projek/desy-salon/server/supabase_schema.sql) pada proyek Anda, **salin seluruh isinya**, lalu **tempel** ke SQL Editor Supabase.
4. Klik tombol **Run** (atau tekan `Ctrl + Enter`).
   > Script ini akan secara otomatis:
   > - Membuat 6 tabel PostgreSQL (`categories`, `packages`, `schedules`, `gallery`, `salon_profile`, `admin_users`).
   > - Mengaktifkan Row Level Security (RLS) & index deteksi bentrok jadwal.
   > - Membuat bucket penyimpanan `salon-assets` untuk file foto.
   > - Mengisi data bawaan (*seed data*) katalog paket dan portofolio salon.

---

### 3. Konfigurasi Environment Variable (.env)

Pastikan file `server/.env` sudah terisi dengan kredensial Supabase Anda. Jika belum ada, buat file `server/.env` dengan mencontoh file `server/.env.example`:

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# Konfigurasi Supabase Anda (Didapat dari Project Settings -> API di Supabase)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Kredensial & Rahasia Autentikasi Admin
JWT_SECRET=rahasia_jwt_token_desy_salon_2026
ADMIN_DEFAULT_USER=desy
ADMIN_DEFAULT_PASSWORD=adminDESI@2026
```

> **PENTING:** Gunakan `SUPABASE_SERVICE_ROLE_KEY` pada server backend agar server dapat mengelola data dan bypass RLS secara aman tanpa perlu login user database. Jangan pernah membagikan Service Role Key ke frontend!

---

### 4. Jalankan Aplikasi Secara Lokal

Untuk menjalankan frontend dan backend secara bersamaan, buka **2 terminal terpisah**:

#### **Terminal 1: Jalankan Backend Express**
```bash
npm run dev:server
```
*Backend akan aktif di: `http://localhost:5000`*  
*(Endpoint pengecekan: `http://localhost:5000/api/health`)*

#### **Terminal 2: Jalankan Frontend Vite**
```bash
npm run dev
```
*Frontend akan aktif di: `http://localhost:5173`*

Buka browser Anda dan akses:
- **Halaman Pengunjung:** `http://localhost:5173/`
- **Halaman Katalog:** `http://localhost:5173/paket`
- **Halaman Admin Studio:** `http://localhost:5173/admin`

---

## Kredensial Login Admin Default

Gunakan kredensial berikut untuk masuk ke dashboard admin:
- **URL Login:** `http://localhost:5173/admin`
- **Username:** `desy`
- **Password:** `adminDESI@2026`

*(Username & password dapat diubah kapan saja melalui menu **Studio Manager $\rightarrow$ Akun** setelah login).*

---

## Dokumentasi Endpoint REST API

Semua endpoint backend diawali dengan prefix `/api`:

| Modul | Method | Endpoint | Akses | Deskripsi |
| :--- | :---: | :--- | :---: | :--- |
| **System** | `GET` | `/api/health` | Publik | Cek status server dan koneksi database |
| **Auth** | `POST` | `/api/auth/login` | Publik | Login admin & mendapatkan JWT token |
| | `GET` | `/api/auth/me` | Admin | Memverifikasi validitas token sesi admin |
| | `POST` | `/api/auth/change-password` | Admin | Mengganti password akun admin |
| **Paket** | `GET` | `/api/packages` | Publik | Ambil daftar paket (filter `?category=...&search=...`) |
| | `GET` | `/api/packages/:id` | Publik | Detail 1 paket |
| | `POST` | `/api/packages` | Admin | Tambah paket baru |
| | `PUT` | `/api/packages/:id` | Admin | Perbarui data paket |
| | `DELETE`| `/api/packages/:id` | Admin | Hapus paket |
| **Kategori** | `GET` | `/api/categories` | Publik | Ambil daftar kategori |
| | `POST` | `/api/categories` | Admin | Tambah kategori baru |
| | `PUT` | `/api/categories/:id` | Admin | Edit kategori |
| | `DELETE`| `/api/categories/:id` | Admin | Hapus kategori |
| **Jadwal** | `GET` | `/api/schedules` | Publik/Admin | Ambil daftar jadwal acara |
| | `GET` | `/api/schedules/check` | Publik | Cek ketersediaan slot tanggal & sesi waktu |
| | `POST` | `/api/schedules` | Publik/Admin | Buat reservasi baru (dengan cek bentrok otomatis) |
| | `PATCH`| `/api/schedules/:id/status`| Admin | Update status (*Terkonfirmasi, DP, Lunas*) |
| | `PUT` | `/api/schedules/:id` | Admin | Edit seluruh data jadwal |
| | `DELETE`| `/api/schedules/:id` | Admin | Hapus jadwal |
| **Galeri** | `GET` | `/api/gallery` | Publik | Ambil daftar portofolio |
| | `POST` | `/api/gallery/upload` | Admin | Upload file gambar langsung ke Supabase Storage |
| | `POST` | `/api/gallery` | Admin | Tambah item portofolio |
| | `PUT` | `/api/gallery/:id` | Admin | Edit item portofolio |
| | `DELETE`| `/api/gallery/:id` | Admin | Hapus item portofolio |
| **Profil** | `GET` | `/api/profile` | Publik | Ambil profil, alamat, jam buka, medsos salon |
| | `PUT` | `/api/profile` | Admin | Perbarui informasi profil salon |

---