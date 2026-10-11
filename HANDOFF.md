# Handoff Presensi Siswa BK — kandidat final 11 Oktober 2026

## Status aktif
- Folder kerja: `/Users/burhanyudha/.codex/worktrees/presensi-repairs/Presensi Siswa BK`.
- Branch kandidat: `codex/final-test-validation`; basis `0e38e6a` di main. Gunakan `git log -1` untuk commit kandidat terakhir.
- GAS TEST aktif v33 pada deployment TEST yang sama. Sumber TEST berasal dari kandidat; spreadsheet salinan tetap dipakai. Versi v32 tersedia untuk rollback TEST.
- Riwayat produksi sebelumnya sudah mencakup cutover GAS v30/Pages dan perbaikan akhir pekan. Iterasi kandidat ini tidak mengubah GAS, spreadsheet, atau Pages produksi. Jangan menyamakan status TEST dengan produksi.
- Perbaikan terbaru: rentang kolom Sheets lebih sempit, ringkasan kasus tetap memfilter ID, respons sesi lama tidak membatalkan login baru, cache detail halaman 30 detik dengan invalidasi refresh/unmount, serta log render ringkasan untuk pengukuran development.
- Tidak ada migrasi skema/data pada iterasi ini. Jangan menjalankan runner sintetis di produksi.

## Bukti dan batas
- Acuan hasil terbaru: bagian terakhir TEST-RESULTS.md dan GAUNTLET-PROGRESS.md. Bagian lama pada dokumen hasil adalah sejarah, bukan kondisi terbaru.
- Cache detail hanya memori instance halaman, tidak disimpan di browser storage. Refresh menghapusnya; perubahan pengguna lain bisa tertunda maksimum 30 detik saat detail dibuka ulang.
- HTTP/GAS diukur melalui log `[BK_PERF]`; event-ke-render melalui `[BK_UI]` dan dua animation frames. Ini mencakup operasi app browser, bukan waktu tool membaca accessibility tree. Bukan jaminan pixel paint/SLA produksi.
- Redirect 404 GET memiliki retry terbatas; POST tidak otomatis diulang. Kegagalan persistent ditampilkan sebagai error. Tidak ada klaim gangguan infrastruktur Google hilang permanen.
- Timeout save tetap menggunakan draft yang dibekukan dan fresh GET dengan ScriptLock. Bukti live TEST 4 detik writer/700 ms client timeout tercatat di GAUNTLET-PROGRESS.md; kode barrier tidak berubah di iterasi ini.

## Menjalankan TEST
`npm run dev:test` dari folder aktif, lalu buka `http://localhost:3001/presensi-siswa`.
Periksa proses pemilik port sebelum membuat server kedua. Perintah ini mengisi API_URL deployment TEST secara eksplisit.
Untuk konfigurasi clasp TEST gunakan `handoff/gas-test/.clasp.json` di staging terpisah. Jangan memakai `clasp_backend/.clasp.json` (target produksi) untuk pengujian.

## Rilis kandidat
- Paket release harus dibuat ulang dari commit kandidat terbaru, termasuk static frontend yang dibangun dengan URL API dari GitHub repository variable NEXT_PUBLIC_GAS_API_URL. Jangan mengirim static build TEST ke Pages produksi.
- Paket tidak menyertakan .clasp.json, .env, token, credential, snapshot Users, spreadsheet, atau runner ManualTest.
- Persetujuan rilis/push harus merujuk pasangan frontend/backend terbaru; pushing main memicu deployment Pages. Branch kandidat lokal belum dirilis.
- Backup produksi privat dan prosedur rollback lama dipertahankan. Iterasi ini tidak mengganti password/schema. Rollback historis sebelum migrasi password tetap memerlukan snapshot Users sesuai PRODUCTION-RELEASE-CHECKLIST.md.
- Pengujian produksi sesudah rilis harus baca-saja; canary simpan hanya tindakan bisnis nyata petugas. Jangan membuat siswa/absensi sintetis di produksi.

## Arsitektur
Next.js 16.4, React 18.3, TypeScript, Tailwind/shadcn, static export GitHub Pages dengan basePath /presensi-siswa. GAS mengakses Google Sheets dan Drive. Komponen dan dependency yang sudah ada dipakai; tidak ada penambahan dependency dalam iterasi ini.

## Aturan kerja
Ikuti AGENTS.md dan panduan Next terpasang. Bekerja di worktree aktif ini. Folder Google Drive/Documents lama bukan sumber localhost. Model akses publik mengikuti pilihan pemilik; hak mutasi aplikasi tetap memerlukan sesi server. Jangan mengubah konfigurasi produksi saat menjalankan gauntlet TEST.
