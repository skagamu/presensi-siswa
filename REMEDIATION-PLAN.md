# Urutan Perbaikan dan Mekanisme Verifikasi

Konteks: branch `codex/presensi-repairs`, backend GAS uji dan spreadsheet salinan. Produksi tetap tidak disentuh. Urutan ini mengurangi risiko kehilangan/ketidakcocokan data sebelum memperluas pengujian.

## Prinsip gerbang

Satu tahap selesai hanya setelah perubahan kode, regresi yang sengaja memicu kegagalan, `npm test`, `npx tsc --noEmit`, `npx next build`, dan bila menyentuh GAS: `runCopyRegression` di salinan menghasilkan PASS dan eksekusi berakhir tanpa error. Catat bukti/durasi di `TEST-RESULTS.md`. Jika gerbang gagal, perbaiki tahap tersebut sebelum lanjut.

Semua pengujian yang menulis data memakai NIS sintetis unik, tanggal tetap yang jatuh Senin–Jumat, folder Drive berawalan `TEST_PRESENSI_`, dan `finally` yang hanya menghapus baris dengan NIS/ID eksekusi tersebut. Jangan gunakan siswa nyata sebagai fixture, jangan jalankan dua runner yang sama bersamaan, dan jangan cetak token/kode wali.

## 1. Buat penulisan kasus bisa dipulihkan

**Risiko sekarang:** `resolveCase` menambah baris PenyelesaianKasus lalu mengubah PeringatanKasus menjadi SELESAI. Jika langkah kedua gagal, riwayat menunjukkan selesai tetapi alert masih aktif. Ulangan dapat menambah arsip duplikat.

**Perubahan:** jadikan arsip penyelesaian dengan `id_peringatan` sebagai kunci idempotensi. Di bawah ScriptLock, `resolveCase` mencari arsip yang ada terlebih dahulu. Jika sudah ada, jangan unggah ulang atau menambah arsip; lanjutkan rekonsiliasi status alert. Jika belum, unggah bukti, tambah arsip sekali, lalu ubah alert. Bila penambahan arsip gagal, pindahkan file yang baru diunggah ke Trash. Bila perubahan alert gagal setelah arsip berhasil, kembalikan respons yang menjelaskan arsip sudah tercatat dan biarkan retry menyelesaikan status alert tanpa membuat arsip baru.

**Tes wajib:** injeksikan kegagalan sebelum append arsip, setelah append arsip sebelum update alert, dan pada retry. Pastikan maksimum satu arsip per alert, status akhirnya SELESAI, file tidak terduplikasi; bila write arsip gagal, tidak ada file orphan (atau kegagalan cleanup tercatat jelas).

**Gerbang:** regresi lokal merah sebelum perbaikan dan hijau setelahnya; runner salinan lulus termasuk mode retry/failure.

## 2. Rapikan siklus upload bukti presensi

**Risiko sekarang:** sejumlah file dapat terunggah sebelum penulisan log/alert. Jika file berikutnya atau Sheets gagal, Drive menyimpan file tanpa baris yang merujuknya.

**Perubahan:** kumpulkan ID file baru selama satu permintaan save. Jangan mengubah link bukti lama. Bila validasi atau commit Sheets gagal sebelum data tersimpan, trash hanya file yang dibuat oleh request tersebut. Bila log sudah tersimpan tetapi rekonsiliasi alert gagal, jangan hapus file/log yang sudah menjadi sumber data; retry save harus idempotent lalu menyelesaikan alert.

**Tes wajib:** dua siswa dengan upload valid lalu upload gagal; kegagalan setValues; kegagalan reconcile setelah log commit; simpan ulang. Pastikan file lama tetap ada, hanya file milik request gagal yang dibersihkan, log tidak ganda, alert dapat dipulihkan.

**Gerbang:** verifikasi jumlah file di folder tes sebelum/sesudah dan data sheet berdasarkan ID NIS tes.

## 3. Audit dan perbarui dependensi berdasarkan paparan

**Risiko sekarang:** audit terakhir menunjukkan 12 temuan (8 high, 4 moderate), tetapi angka severity saja belum menunjukkan apakah kode rentan dipakai di browser produksi atau hanya alat dev.

**Mekanisme:** simpan `npm audit --json`; untuk setiap advisory catat paket langsung/transitif, rentang versi, apakah ada di bundle/runtime browser atau hanya dev/build, fix yang tersedia, dan breaking change. Dahulukan paket yang masuk runtime/deployed bundle; update sekecil mungkin tanpa `--force`. Setelah tiap kelompok update, periksa diff lockfile, `npm ci`, tes/typecheck/build, dan ulang audit. Jika hanya dapat ditutup lewat major upgrade, buat perubahan major terpisah dengan alasan dan tes kompatibilitas.

**Gerbang:** tidak ada advisory high/critical pada dependency production yang dapat diperbaiki tanpa upgrade breaking; sisanya didokumentasikan dengan jalur migrasi dan alasan. Jumlah audit baru dicatat dari hasil aktual, jangan menjanjikan nol bila belum tercapai.

## 4. Jalankan tes Google kegagalan dan concurrency

Setelah tahap1–3, jalankan runner bound Apps Script pada copy. Tambah dua eksekusi serentak untuk NIS sintetis berbeda dan hari yang sama. Jalankan dua retry untuk alert yang sama. Periksa jumlah log, alert, arsip, serta file di folder tes sebelum menyatakan PASS.

Skenario konkurensi terbatas pada Apps Script/Sheets; ini bukan load test penuh. Catat durasi per action dan completion log, bukan hanya pesan PASS.

## 5. Uji UI dan waktu nyata

Di localhost yang menunjuk endpoint TEST:
- uji X AK, XI AK, XI BD: load status tersimpan, ganti tanggal/kelas cepat, save dan reload;
- uji akhir pekan diblokir tanpa write;
- ukur 3 cold dan 3 warm load/save lewat DevTools Network, catat detik, kelas, jumlah siswa, tanggal, ukuran lampiran. Hapus token dan data identitas dari bukti;
- putus jaringan pada read/save, sambungkan lagi, pastikan UI tidak melaporkan sukses palsu dan retry tidak menggandakan log;
- uji PDF, DOCX, XLSX, JPG, PNG valid; format spoof dan file >10MB ditolak;
- buka portal wali tanpa sesi BK dengan kode uji yang benar/salah; pastikan tidak membocorkan tautan bukti;
- buka hasil DOCX di Word/Preview; ekspor XLSX dibaca kembali dan gambar diperiksa;
- uji viewport HP, tanggal WIB, lalu kembalikan ukuran browser.

Catatan privasi: spreadsheet berisi data siswa. Jangan masukkan NIS/kode asli ke laporan atau tangkapan layar; gunakan data sintetis untuk alur wali dan unggah.

## 6. Tutup lint dan tinjau rilis

Bereskan warning lint yang relevan tanpa menonaktifkan aturan umum. Jalankan seluruh gerbang lagi. Review diff backend+frontend berpasangan dan deploy hanya setelah instruksi eksplisit. Produksi memerlukan backend dan frontend yang sepadan; jangan deploy satu sisi saja.

## Status

- [x] 1. Pemulihan/idempotensi penyelesaian kasus (implementasi lokal; 2 skenario fault injection lulus)
- [x] 2. Cleanup file saat save gagal (implementasi lokal; failure write + upload kedua gagal lulus)
- [x] 3. Klasifikasi dan patch advisory dependency produksi (override `exceljs -> uuid@11.1.1`; audit production 0 temuan; audit penuh 10 temuan dev: 8 high, 2 moderate)
- [x] 4. Failure injection dan concurrency di Google copy (runner fungsi PASS 26, Drive PASS 7, concurrency live PASS dua request serentak dengan satu log akhir; cleanup selesai)
- [ ] 5. Tes UI, format bukti, offline retry, pengukuran latency (Drive MIME 5 tipe, mock retry, DOCX OpenXML dirender visual lewat LibreOffice dan XLSX roundtrip lulus. Fixture 30 siswa sintetis dibersihkan; localhost mengalihkan ke login sehingga tes UI/latensi, offline browser, dan verifikasi Word masih tertunda)
- [ ] 6. Lint dan review rilis (npm test/typecheck/build lulus 10 Oktober; lint 32 warning tanpa error; audit runtime bersih. Tinjauan warning dan review diff rilis masih tersisa)

## Catatan 9 Oktober

- Perubahan GAS lokal belum dikirim ke project Apps Script. Version 3 sempat dibuat di project TEST ketika menyiapkan update; deployment TEST aktif dikembalikan ke version 2. Version 3 tidak dipakai. Produksi tidak disentuh.
- Empat skenario failure-injection terisolasi pada VM lokal lulus: arsip gagal -> file baru ke Trash; status alert gagal -> retry menyelesaikan tanpa arsip/upload ganda; gagal tulis log -> upload sementara dibersihkan.
- `npm run typecheck` dan `npm run build` lulus. `npm run lint` exit 0 dengan 32 warning.
- Full `npm test` gagal pada `tests/backend.test.cjs` untuk tes stateful/fixture historis, termasuk beberapa yang bukan perubahan baru. Tes terkait ekspor, portal publik, presensi fetch, laporan dan siswa lulus.
- `npm audit`: 12 temuan total (8 high, 4 moderate); production-only 2 moderate dari `exceljs -> uuid@8.3.2`. npm tidak menawarkan update minor kompatibel; perbaikan yang disarankan adalah downgrade ExcelJS ke major 3. Versi mayor tidak diubah.
- HTTP runner Google menjawab `UNAUTHORIZED`; tidak melakukan bypass login. Regression copy harus dijalankan manual di editor Apps Script pada salinan.
- Server lokal `/presensi` tetap merespons HTTP 200; log dev sebelumnya mencatat warning nested `<button>` pada UI.
