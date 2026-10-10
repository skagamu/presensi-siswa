# Perbaikan integritas data, keamanan dan performa

## Aturan disetujui
- Sakit bersurat dan tanpa surat: satu hari absen.
- Alert kumulatif per tahun ajaran. Asumsi batas awal 1 Juli–30 Juni; hitung kelipatan 3, level maksimum 4.
- Bukti penyelesaian boleh format yang didukung (PDF, Word, Excel, JPG/PNG), wajib dokumen valid sebelum penutupan.
- Hari sekolah Senin–Jumat.
- Pengujian eksternal hanya spreadsheet salinan 16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ. Belum ada izin deploy produksi.

## Alur
Login server-valid -> daftar siswa kelas -> baca log tanggal terpilih -> input/koreksi -> batch tunggal dan lock -> update log -> rekonsiliasi alert tahun ajaran -> penyelesaian dengan upload tervalidasi -> arsip. Laporan mengambil tanggal periode penuh dan menghitung numerator/denominator dari cakupan yang sama.

## Skema Sheets
Siswa_X/XI/XII: no:number, kelas:string, nis:string, nama:string, nisn:string, agama:string, L/P:string. LogPresensi: id_presensi:string, tanggal:date ISO, nis:string, nama:string, kelas:string, status_presensi:enum, ada_surat_dokter:boolean, link_bukti_izin:url, waktu_simpan:timestamp. PeringatanKasus: id_peringatan:string, nis:string, nama:string, kelas:string, tingkat_kumulatif:number, total_hari_absen:number, status_peringatan:enum, waktu_dibuat:timestamp. PenyelesaianKasus: id_penyelesaian:string, id_peringatan:string, nis:string, nama:string, kelas:string, link_pdf_drive:url, catatan_konseling:string, ditangani_oleh:string, waktu_selesai:timestamp. BankKasus: id_kasus:string, tanggal:date, nis:string, nama:string, kelas:string, jenis_pelanggaran:string, waktu_simpan:timestamp. Users: user_id:string, username:string, password:string/hash, nama_lengkap:string, role:string.

## Komponen
Gunakan komponen yang tersedia: Input, Button, Select, Table, Dialog, Badge, Checkbox, Textarea, Card, Sonner. Tidak diperlukan komponen baru.

## Umpan balik presensi dan detail siswa
- Sabtu/Minggu: daftar siswa diganti pesan hari tersebut tidak dapat input absen dan arahan memilih tanggal Senin–Jumat; simpan tetap nonaktif. Hari sekolah mengikuti alur roster dan sinkronisasi yang ada.
- Klik detail siswa: Dialog menutupi seluruh layar selama request detail berlangsung, mengunci klik, fokus keyboard, scroll, dan Escape. Setelah sukses tampilkan detail; setelah gagal tutup overlay dan tampilkan pesan error.
- Skema kolom Sheets tetap menggunakan skema di atas; tidak ada kolom tambahan.

## Validasi
Regresi Node assert/VM untuk backend dan export; tsc --noEmit; next build; lint; pengujian salinan melalui backend test terpisah sesudah otorisasi Google bila diperlukan. Tidak melakukan migrasi massal data asli.

## Optimasi presensi 9 Oktober
Baca hanya tab tingkat terpilih; gunakan satu handle spreadsheet per eksekusi GAS; simpan hanya rentang baris log/alert yang berubah dengan menjaga lock dan rekonsiliasi tahun ajaran. Skema dan komponen UI tetap sama. Ukur layanan Sheets lewat regresi; waktu jaringan aktual belum diukur.

## Ketahanan simpan dan retry
- Penyelesaian menganggap `id_peringatan` sebagai kunci idempotensi: retry mencari arsip terlebih dahulu, tidak mengunggah atau mengarsipkan ulang, dan merekonsiliasi status alert.
- Upload bukti baru menyertakan ID dan URL Drive. Jika commit sheet gagal, file staging hanya dipindahkan ke Trash setelah pengecekan bahwa URL tidak dirujuk oleh log/arsip.
- Jika pemeriksaan referensi sheet gagal, cleanup dilewati dan dicatat agar sistem tidak menghapus file yang mungkin sudah direferensikan.
- Kegagalan setelah arsip penyelesaian tercatat dipulihkan lewat retry; arsip/file dipertahankan sampai status alert direkonsiliasi.


## Penghapusan portal orang tua
Portal dikelola di repo lain. Hapus route portal, link login, pengecualian auth/layout, helper API, serta endpoint publik/kode wali dari aplikasi BK. Skema Sheets tetap; data siswa/presensi tidak dihapus. Komponen BK tetap memakai Button, Dialog, Table, Select yang tersedia. Validasi endpoint portal ditolak, sesi BK tetap wajib, TypeScript dan static export lulus.
