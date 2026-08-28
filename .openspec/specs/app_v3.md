# Spesifikasi Frontend: Presensi BK App

## 1. Konfigurasi Backend API
- **Base URL**: `https://script.google.com/macros/s/AKfycbwM35Xmlof--5yFEaVK-JClOoZ49KkAUWeTR01_HrjMNjRw2uIJTjNmMdmlCNjLUyMV/exec`
- **Metode**: POST/GET via Web App App Script (CORS-friendly dengan `fetch` / JSONP atau POST body raw JSON tergantung setup GAS).

## 2. Fitur & Halaman UI
1. **Layout & Navbar**: Navigasi sticky, memuat link ke 3 halaman utama.
2. **Dashboard BK (`/dashboard`)**:
   - Menampilkan alert prioritas teratas (kasus tingkat 1-4).
   - Card alert berwarna sesuai level.
   - Tombol Upload PDF -> Membuka Modal (Dialog).
3. **Presensi Harian (`/presensi`)**:
   - Filter Tingkat & Kelas.
   - Tabel daftar siswa (default "HADIR").
   - Tombol Submit (Batch data presensi).
4. **Riwayat (`/riwayat`)**:
   - Menampilkan kasus dengan status "SELESAI".

## 3. Komponen shadcn/ui
`button`, `card`, `table`, `select`, `badge`, `dialog`, `label`, `input`, `textarea`, `sonner` (Toaster).
