# Profiling, ketahanan, dan paket rilis

## Alur
Presensi memakai satu endpoint untuk roster tingkat dan log tanggal terpilih, sehingga pemilihan kelas tidak meminta ulang data. Hasil gabungan memakai cache 30 detik setelah autentikasi; cache terikat database/revisi/filter, bypass `fresh=true`, dan berubah setelah mutasi. Profil POST mencatat waktu antre lock, baca/tulis log, sinkronisasi alert, dan baca/tulis alert. Profil hanya setelah sesi BK tervalidasi, tanpa token/identitas dalam log. Uji save/retry/failure serta request serentak hanya NIS sintetis salinan. Review diff/dependency, commit lokal, kemudian siapkan paired frontend/backend, backup dan rollback; produksi membutuhkan approval akhir.

## Skema
Skema Siswa_X/XI/XII, LogPresensi, BankKasus, PeringatanKasus, PenyelesaianKasus, Users tetap. Metrik hanya metadata response authenticated. Cache/revision di layanan Cache/Script Properties, tidak ada kolom sheet tambahan.

## Komponen
Table/Select/Button/Dialog dan overlay yang sudah tersedia; tidak menambah library UI.

## Validasi
Tes cache auth/invalidation/fresh/TTL; kesetaraan data; weekend tanpa baca log; fault injection pada writes; live multikelas; tsc/static build/lint; profile ulang roster sama dan save sintetis. Backup wajib verified tanpa mutasi produksi sebelum proposal deploy.

Cache direktori TTL 30 detik, ukuran <95KB, auth sebelum lookup. Key memuat database, revisi, tahun ajaran dan seluruh filter. Revisi berubah di finally mutasi saat lock masih dimiliki, termasuk partial write; gagal invalidasi menghasilkan error dan lock tetap dilepas. Pembacaan yang selesai setelah mutasi hanya mengisi key revisi lama. Tombol Segarkan meminta fresh=true; edit manual Sheets dapat menunggu TTL atau refresh eksplisit. GET client hanya menggabungkan request bersamaan, tanpa menyimpan hasil setelah selesai. Detail mengirim tingkat untuk membaca satu tab roster.
