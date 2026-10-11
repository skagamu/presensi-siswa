> Status historis. Untuk kelanjutan terbaru (10 Oktober 2026), baca HANDOFF.md: portal telah dihapus, TEST v6, overlay/latensi live telah diverifikasi, dan performa masih lambat.

# Perbaikan Presensi BK — 7 Oktober 2026

Baseline GitHub: fdd13e6f66a3b3af94b23bb25c57c4b074db1cec. Kode Apps Script deployment versi29 diambil dan cocok dengan baseline. Semua perubahan di worktree codex/presensi-repairs; checkout asli dan deployment produksi belum diubah.

## Aturan
Sakit dengan/tanpa surat = 1 hari. Alert akumulasi tahun ajaran, asumsi 1 Juli–30 Juni. Kalender Senin–Jumat. Bukti PDF/Word/Excel/JPG/PNG dengan batas 10MB dan pemeriksaan signature. Portal wali tanpa akun BK memakai NIS+kode akses per siswa yang dapat diambil Guru BK di detail siswa.

## Perbaikan
Backend session acak server tervalidasi, expiry12jam, logout mencabut session, hash password saat login berhasil, throttle login; action setup/dummy publik dihapus. Save kelas satu request dan lock, batch upsert/koreksi HADIR, tautan lama dipertahankan, upload sekali, alert unik per siswa/tahun/level dan rekonsiliasi. Mapping data log/arsip diperbaiki. Input/file divalidasi di server, upload gagal tidak menutup kasus, dokumen baru tidak otomatis dibagikan publik.

Daftar siswa mengambil ringkasan ringan, detail dimuat saat dipilih. Dashboard request independen paralel; rekap log dikelompokkan sekali. Rekap/ekspor memakai periode, tanggal penuh lintas bulan, hari sekolah, denominator sesuai filter; tanggal WIB; Excel dimuat saat ekspor. Respons lambat tidak menimpa pilihan terbaru. DOCX escape XML. Seluruh pembacaan frontend via API, tidak memerlukan sheet publik. Pemasangan layar utama tetap tersedia; tidak menjanjikan offline dan tidak menghapus cache aplikasi lain.

Lockfile/lint diperbaiki, Next16.4 menutup advisory versi16.3.3; CI memakai npmci dan typecheck/regresi. Artefak patch/orig/rej dan folder komponen salah lokasi dihapus.

## Verifikasi
npmci, regresi Node, TypeScript dan static build dijalankan. Lint tersedia dan nol error; warning gaya/initialization React18 tersisa. npm audit fix tanpa force mengurangi temuan27 menjadi12 (4 moderate/8high, nol critical); sebagian bergantung migrasi major Tailwind/ExcelJS/devtools, belum dipaksa karena perubahan kompatibilitas.
Benchmark lokal300siswa/6600log: rekap baseline682ms versus perbaikan6ms (rerata3run); tidak mengukur latensi Google/jaringan dan tidak menjanjikan rasio tersebut pada produksi.

## Uji Google yang masih diperlukan
Spreadsheet salinan: 16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ. Izin mengubah/menghapus data uji disetujui. Akun clasp memiliki canEdit true. SheetsAPI dengan OAuth default clasp tidak aktif, sehingga disiapkan Apps Script bound terpisah:
https://script.google.com/home/projects/1-NpiLFzPdn5d-NkuXVcv1A8Aijaux4eueJYT5gymCuPJM92zaKZ84fkH/edit

Jalankan runCopyRegression dan selesaikan otorisasi pertama Google untuk Sheets/Drive. Fungsi menolak container selain salinan, membuat pupil/data uji NIS999990001, memeriksa simpan/alert/koreksi/dokumen/portal, lalu membersihkan data dan memindahkan dokumen uji ke Trash. Kode runner: tests/copy-regression.gs. Pengguna melaporkan PASS untuk runner sebelum optimasi 9 Oktober. Runner diperluas sesudah optimasi masih perlu dijalankan ulang.

## Sebelum produksi
Jangan deploy frontend sendirian: transport/endpoint baru harus dipasangkan dengan backend baru. Setelah test copy lulus, review perubahan dan dapatkan izin deploy produksi. Tetapkan SPREADSHEET_ID ke database produksi, FILE_FOLDER_PREFIX kosong di backend produksi. Spreadsheet perlu akses Restricted; frontend tidak lagi bergantung GViz publik. Dokumen baru private, Guru BK perlu akun Google yang berhak untuk membuka preview Drive.

Batas model yang dipertahankan: hari libur selain weekend belum dimodelkan; tidak ada status batch 'belum diinput' sehingga HADIR pada rekap merupakan default bila tidak ada log absen. Tidak ada migrasi/hapus massal data produksi atau perubahan sharing data lama.

## 9 Oktober: optimasi presensi
Backend deployment TEST diperbarui pada URL AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q. Baca tab siswa hanya tingkat terpilih, reuse handle spreadsheet per eksekusi, penulisan hanya rentang log/alert berubah dan posisi log dipertahankan. Regresi termasuk differential writes, TypeScript dan static build lulus. Belum mengukur latency authenticated end-to-end atau mengulang runner salinan setelah optimasi. Produksi belum diperbarui.

## Paket pengujian
TEST-PLAN.md memuat seluruh cakupan dan 18 skenario UI; TEST-RESULTS.md memisahkan PASS lokal dari pengujian live/UI yang belum dijalankan. tests/browser-read-timing.js mengukur baca dari browser tanpa membocorkan token; tests/live-read-check.cjs memeriksa endpoint admin tanpa sesi. Label surat dokter diperbaiki menjadi satu hari.

## Eksekusi pengujian 9 Oktober
Regresi lokal, TypeScript, static build lulus. Runner Google terbaru dijalankan lewat Brave dan diverifikasi langsung: PASS26 checks di21:40:44 dan Eksekusi selesai21:40:45. Cleanup hanya deleteRow NIS milik tes; PASS dicetak setelah cleanup. Browser memuat tiga kelas, mengunduh XLSX dan PNG mingguan XI AK. Audit12kerentanan masih terbuka. Batas pengujian dan risiko partial writes dicatat di TEST-RESULTS.md; paket belum dinyatakan seluruhnya PASS.
