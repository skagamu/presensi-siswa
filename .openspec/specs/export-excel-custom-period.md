# Export Excel rentang kustom

## Ringkasan dan alur pengguna

Di halaman Rekap, pengguna memilih rentang kustom maksimal 365 hari kalender, tingkat, kelas, dan status. Rentang kerja menghitung hari Senin–Jumat saja. Ekspor Excel kustom mengikuti format rekap matriks: satu sheet dengan identitas siswa di kolom tetap, tanggal sekolah sebagai kolom, jumlah ketidakhadiran, serta persentase hadir dan tidak hadir. Sabtu dan Minggu tidak menjadi kolom.

## Data spreadsheet

Fitur ini hanya membaca data rekap yang telah dimuat dari Apps Script/Google Sheets. Tidak ada kolom, sheet, atau migrasi spreadsheet yang dibutuhkan.

## Workbook

- Satu sheet `Rekap Presensi`: judul beku memuat tingkat, periode, dan legenda kode status (H=Hadir, S=Sakit, I=Izin, A=Alpha); baris kedua memuat nama hari; baris ketiga memuat tanggal. Kolom identitas dan ringkasan memakai header gabungan vertikal seperti workbook contoh.
- Kolom A–D (No, Kelas, NIS, Nama) dan tiga baris header dibekukan agar identitas dan tanggal tetap terlihat saat menggulir.
- Workbook dibuka dari tanggal pertama pada zoom 75%, mengikuti tampilan referensi.
- Kolom tanggal berisi status harian Senin–Jumat. Kolom terakhir memakai formula untuk Sakit, Izin, Alpha, Total, persentase tidak hadir dan persentase hadir.

## Komponen UI

Memakai kontrol tanggal, tingkat, kelas, status, dan tombol Excel yang telah ada di halaman Rekap. Tidak ada komponen atau dependency baru.

## Batas dan validasi

Rentang maksimum 365 hari kalender; endpoint mingguan tetap dibatasi 60 hari. Tes memeriksa cap rentang, kalender Senin–Jumat, struktur workbook matriks satu tahun, formula, freeze panes, dan kompatibilitas XLSX harian/mingguan yang sudah ada.
