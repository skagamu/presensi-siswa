# Paket uji versi salinan — 9 Oktober 2026

Aplikasi: http://localhost:3001/presensi-siswa/login
Backend: https://script.google.com/macros/s/AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q/exec
Spreadsheet: https://docs.google.com/spreadsheets/d/16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ/edit
Semua perubahan data selama pengujian hanya pada salinan. Jangan mengganti endpoint dengan produksi.

## 1. Otomatis lokal
Jalankan dari folder ini:
```sh
npm test
npx tsc --noEmit
npx next build
npm run lint
npm audit
node tests/benchmark.cjs
node tests/live-read-check.cjs
```
Build dapat mengganggu server dev karena keduanya memakai `.next`; restart server dev setelah build. Audit boleh menghasilkan exit nonzero: catat advisory tersisa, bukan anggap lulus. Benchmark hanya CPU lokal, bukan Google/network.

Cakupan regresi: autentikasi, sesi 12 jam/expiry/logout/cache eviction/throttle/password hash; validasi siswa/tanggal/status; satu hari sakit bersurat; deduplikasi hari/alert; tahun ajaran/weekend; lampiran sekali/preservasi/size/signature/gagal unggah; aktor konseling dari sesi; privasi wali; summary/detail; mapping log/arsip; respons lama; default HADIR setelah sinkron berhasil; WIB; ekspor XLSX/DOCX dan batas persentase; penulisan differential. Mock Google tidak membuktikan izin Drive, kuota, lock aktual atau jaringan.

## 2. Otomatis pada Sheets/Drive asli salinan
Buka proyek TEST https://script.google.com/home/projects/1-NpiLFzPdn5d-NkuXVcv1A8Aijaux4eueJYT5gymCuPJM92zaKZ84fkH/edit (gunakan tautan yang benar pada REPAIR-STATUS.md bila tautan ini tidak terbuka).
Pilih file ManualTest.gs lalu fungsi runCopyRegression, klik Jalankan. Runner menolak spreadsheet selain salinan, membuat NIS sintetis unik berawalan 999 pada X UJI, kemudian menghapus data siswa uji tersebut dan memindahkan dokumen uji ke Trash dalam finally. Jangan menjalankannya bersamaan dengan pengeditan presensi oleh pengguna lain.

Hasil wajib: `status: PASS`, jumlah checks dari assertion yang benar-benar dilakukan dan daftar timings. Mencakup akses tanpa sesi ditolak, filter tingkat/kelas, weekend ditolak, enam sakit menghasilkan dua alert, save ulang tidak duplikat, koreksi HADIR menjadi lima log/satu alert, bukti wajib, penyelesaian + arsip, wali sah/salah, filter log, rekap rentang, detail dan ringkasan siswa. Durasi timings adalah backend di editor; belum termasuk HTTP/browser.

PASS yang dilaporkan pengguna sebelum optimasi 9 Oktober berlaku untuk runner sebelumnya. Runner perlu dijalankan ulang setelah optimasi.

## 3. Uji lewat layar aplikasi
Gunakan satu siswa pada salinan dan catat NIS/tanggal sebelum mengubahnya. Simpan kondisi awal (status dan lampiran) agar bisa dikembalikan. Jangan menghapus lampiran atau menyelesaikan alert siswa nyata hanya demi tes; pakai siswa uji khusus untuk kasus tersebut.

| ID | Langkah | Hasil yang harus terlihat |
|---|---|---|
| UI01 | Login dengan akun salinan; logout; buka ulang halaman terlindungi | Login berhasil; setelah logout diminta login |
| UI02 | Pilih X AK, XI AK, XI BD dan tanggal yang sudah kamu isi | Status tersimpan tepat, jumlah siswa/kelas tepat |
| UI03 | Pada siswa uji, ubah SAKIT/IZIN/ALPHA; simpan; refresh | Status dan ringkasan tetap sama setelah refresh |
| UI04 | Simpan kembali tanpa mengubah status | Tidak menambah log/alert ganda |
| UI05 | Koreksi siswa uji menjadi HADIR; simpan; refresh | Log absen hilang, jumlah alert disesuaikan |
| UI06 | Pilih Sabtu/Minggu | Simpan diblokir, tidak ada tulisan baru |
| UI07 | Ganti kelas/tanggal cepat sebelum load selesai | Respons lama tidak mengganti kelas terakhir; simpan baru aktif setelah sinkron |
| UI08 | Unggah PDF/foto/Word/Excel valid; simpan; buka ulang | Bukti tersedia, simpan ulang tidak mengunggah duplikat |
| UI09 | File >10MB atau ekstensi palsu | Ditolak; kasus belum ditutup |
| UI10 | Sakit dengan surat dokter | Dihitung 1 hari; label modal juga menyebut 1 hari |
| UI11 | Detail siswa lalu ambil kode wali; buka portal di tab logout | Tanpa login BK dapat melihat hanya siswa sesuai NIS+kode; kode salah ditolak; bukti private tidak terbuka publik |
| UI12 | Rekap harian, mingguan lintas bulan, bulanan; filter kelas | Jumlah cocok dengan log, Senin–Jumat, persentase 0–100%, periode/filter konsisten |
| UI13 | Ekspor Excel/gambar/DOCX, nama mengandung &, < atau > | Berkas terbuka; angka/periode cocok; teks tidak rusak |
| UI14 | Bank kasus siswa uji; dashboard; daftar kasus; riwayat | Identitas, tanggal, tautan dan catatan berada pada kolom yang tepat |
| UI15 | Selesaikan alert siswa uji tanpa bukti lalu dengan bukti valid | Tanpa bukti gagal; valid tercatat di riwayat dan status SELESAI |
| UI16 | Putus jaringan saat load/simpan; sambungkan lagi | Error terlihat, tidak mengklaim berhasil; baca ulang sebelum mengulangi save |
| UI17 | Layar HP dan desktop; keyboard untuk filter/dialog | Tidak terpotong; dialog/label/tombol dapat digunakan |
| UI18 | Refresh menjelang/pergantian hari WIB; buka PWA jika tersedia | Tanggal WIB; tidak mengklaim offline; cache aplikasi lain tidak dihapus |

Lock bersamaan dan Google quota belum diuji: dua tab menyimpan siswa uji berbeda pada waktu berdekatan, baca ulang kedua hasil; catat jika ada data hilang atau timeout. Tidak melakukan load test terhadap data pengguna.

## 4. Ukur kelambatan
Setelah login, buka DevTools Console pada localhost:3001. Salin isi tests/browser-read-timing.js; jalankan. Script hanya membaca, tidak mencetak token atau rekaman siswa; menghasilkan tiga putaran untuk tingkat X/XI dan kelas X AK/XI AK/XI BD pada tanggal WIB hari ini. Sesuaikan kelas/tanggal di script bila nama di sheet berbeda; nol log tidak berarti gagal jika semuanya hadir.

Untuk save, pakai siswa uji: buka DevTools Network, aktifkan Preserve log, ukur POST saveAttendance hingga response JSON diterima, tiga putaran (tanpa bukti, simpan ulang, dengan bukti). Catat detik, ukuran file dan PASS/FAIL. Hindari membagikan screenshot URL penuh/body karena bisa memuat token dan data siswa.

Patokan sementara: load kelas <=5 detik dan save tanpa bukti <=8 detik; ini target evaluasi, bukan SLA yang sudah terbukti. Catat cold/first load dan warm berikutnya terpisah; timeout 60 detik adalah kegagalan. Upload harus dilaporkan terpisah berdasarkan ukuran file.

## 5. Catat hasil
Isi TEST-RESULTS.md: tanggal, skenario, PASS/FAIL/BELUM, bukti, durasi. Semua skenario UI/live tetap BELUM sampai benar-benar dilakukan. Jika gagal, simpan pesan error tanpa token/password/data siswa lalu perbaiki dan ulang hanya skenario terkait.
