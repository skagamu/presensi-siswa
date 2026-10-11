# Gauntlet: koreksi dan validasi dibanding baseline worktree

## Alur dan acuan
Baseline bernama `/tmp/presensi-gauntlet-baseline-20261011`, snapshot kode sebelum putaran builder, hash per file tersimpan di manifest.json. Acuan dipilih pengguna. Pertahankan perilaku yang sudah lulus, tambahkan reproduksi temuan critic; kandidat menang hanya bila reproduksi gagal pada baseline dan lulus pada kandidat tanpa regresi. Pengukuran kecepatan perlu dataset/jalur yang sama dan metrik tidak tumpang tindih. Critic independen memeriksa keluaran nyata; bukti live yang belum ada tetap pending.

## Skema Sheets
Tidak menambah kolom. Siswa_X/XI/XII: id/kelas/nis/nama; LogPresensi: id/tanggal/nis/nama/kelas/status/ada_surat/link/timestamp; PeringatanKasus: id/nis/nama/kelas/level/count/status/timestamp; PenyelesaianKasus: id/alert/nis/nama/kelas/link/catatan/petugas/timestamp.

## UI
Gunakan Table, Button, Input, Textarea, Checkbox, Dialog yang sudah tersedia. Pengisian Bank Kasus diblokir selama save agar draft tidak hilang. Log presensi lokal harus diperbarui dari hasil save sebelum pindah kelas.

## Gerbang
Reproduksi baseline; regresi kandidat; critic; TypeScript dan static build TEST; pemeriksaan UI/HTTP TEST bila sesi tersedia. Produksi tetap memerlukan persetujuan akhir.

Backend: normalisasi status legacy, penolakan tanggal invalid, precedence HADIR terakhir, preservasi arsip resolusi saat partial write/koreksi, boolean dokter tervalidasi. Profil gasMs diterbitkan sesudah finally invalidasi/lock release; alertSync inklusif bukan penjumlahan dengan alertRead/Write.

Putaran tambahan: Dashboard uploadguard/Top3 unik; proof generation membatalkan completion stale pada cancel/reopen; antrean aktif menekan duplikat level sudah selesai tanpa menghapus history. Cleanup kosong melewati reference scans. Profil summary seluruh roster, reset handle per invoke, studentCount dicatat. Hasil akhir dan batas di GAUNTLET-PROGRESS.md.

- Save ambigu setelah commit: pindah kelas memuat ulang dengan fresh=true; refresh gagal tidak mengaktifkan simpan data lama. Retry langsung mempertahankan draft.
- Putaran 404/timeout: kandidat membatasi retry GET pada final 404 di host redirect ContentService, mengunci fresh read presensi pada ScriptLock write, serta membekukan edit saat hasil save belum pasti. Kriteria menang: tes kandidat lulus, tes reproduksi transport gagal pada baseline, dan bukti Google TEST menunjukkan GET fresh menunggu write yang masih berlangsung.
- Uji live timeout menyisipkan jeda hanya di staging sementara yang dijaga ID GAS TEST + ID spreadsheet TEST + NIS fixture. Setelah selesai, hapus dua siswa sintetis, verifikasi tak ada record terkait, redeploy backend bersih, lalu buktikan endpoint QA ditolak.
