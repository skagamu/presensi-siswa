# OpenSpec: Presensi Siswa BK Dashboard

## 1. Overview
Sistem Presensi & Monitoring Siswa untuk Bimbingan Konseling (BK). Menampilkan statistik kehadiran, daftar siswa bermasalah/alfa, dan form pencatatan konseling.

## 2. Requirements & UI Components
- **Stats Overview Cards**: Total Siswa, Hadir Hari Ini, Sakit/Izin, Alfa/Tanpa Keterangan.
- **Data Table**: Tabel presensi siswa (Nama, Kelas, Status Kehadiran, Catatan BK, Aksi).
- **Filters**: Filter berdasarkan Kelas (X, XI, XII) dan Tanggal.
- **Action Modal**: Modal pencatatan tindakan/konseling BK.

## 3. UI/UX Rules
- Tech Stack: Next.js (App Router), Tailwind CSS, shadcn/ui.
- Components to use: `Card`, `Table`, `Dialog`, `Input`, `Select`, `Button`, `Badge`, `Avatar`.
- Layout: Responsive Dashboard dengan Sidebar & Header Navigation.
