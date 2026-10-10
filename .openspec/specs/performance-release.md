# Profiling, ketahanan, dan paket rilis

## Alur
Ukur UI/frame, HTTP total, GAS total, open spreadsheet, lookup tab, dan baca range. Profil hanya setelah sesi BK tervalidasi, tanpa token/identitas dalam log. Optimasi berdasarkan baseline; cache harus tidak melewati auth, namespace database/tahun ajaran/parameter, TTL singkat, explicit refresh bypass, dan invalidasi pada sukses maupun partial write. Uji save/retry/failure serta request serentak hanya NIS sintetis salinan. Review diff/dependency, commit lokal, kemudian siapkan paired frontend/backend, backup dan rollback; produksi membutuhkan approval akhir.

## Skema
Skema Siswa_X/XI/XII, LogPresensi, BankKasus, PeringatanKasus, PenyelesaianKasus, Users tetap. Metrik hanya metadata response authenticated. Cache/revision di layanan Cache/Script Properties, tidak ada kolom sheet tambahan.

## Komponen
Table/Select/Button/Dialog dan overlay yang sudah tersedia; tidak menambah library UI.

## Validasi
Tes cache auth/invalidation/eviction/fresh/manual-edit TTL; kesetaraan data; fault injection pada writes; live multikelas; tsc/static build/lint; profile ulang roster sama. Backup wajib verified tanpa mutasi produksi sebelum proposal deploy.

Cache direktori TTL 30 detik, ukuran <95KB, auth sebelum lookup. Key memuat database, revisi, tahun ajaran dan seluruh filter. Revisi berubah di finally mutasi saat lock masih dimiliki, termasuk partial write; gagal invalidasi menghasilkan error dan lock tetap dilepas. Pembacaan yang selesai setelah mutasi hanya mengisi key revisi lama. Tombol Segarkan meminta fresh=true; edit manual Sheets dapat menunggu TTL atau refresh eksplisit. GET client hanya menggabungkan request bersamaan, tanpa menyimpan hasil setelah selesai. Detail mengirim tingkat untuk membaca satu tab roster.
