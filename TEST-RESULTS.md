# Hasil pengujian — 10 Oktober 2026

## Pembaruan live terkini — 10 Oktober 2026, 12:40 WIB

- **Regresi Google TEST:** 23 pemeriksaan PASS; mencakup simpan, koreksi, duplikasi, resolver dan pembersihan data sintetis. Durasi 42,4 detik; simpan di Spreadsheet cenderung 2,8–5,1 detik.
- **Retry sesudah respons hilang:** PASS; server sudah menyimpan sebelum respons disimulasikan hilang, retry menghasilkan 0 duplikasi, koreksi HADIR menghapus catatan absen. 17,8 detik.
- **Konkurensi:** PASS; 3 akun/sesi sintetis untuk X/XI/XII, 6 permintaan save simultan, hasil akhir 3 log unik. 23,3 detik. Seluruh sesi/siswa/log uji dibersihkan.
- **Bukti:** PASS 7 pemeriksaan untuk PDF, DOCX, XLSX, JPG, PNG serta validasi spoof/ukuran.
- **Profil di UI localhost pada roster 467 siswa:** direktori dingin 4.063 ms (5 pembacaan Sheets), detail dingin 3.895 ms (4 pembacaan Sheets), detail yang sama saat cache hangat 1.499 ms dan 0 pembacaan. Paint detail dingin 4.267 ms, hangat 1.910 ms. Ini satu sesi/satu siswa, tanpa kondisi jaringan terkontrol; bukan SLA/p95.
- Baseline terdahulu untuk siswa yang sama sekitar 5.165 ms pada detail dingin; perubahan memang mengurangi pembacaan roster dari tiga tingkat menjadi satu dan memakai cache detail 30 detik. Data edit manual Sheets bisa tertunda sampai TTL atau tombol refresh.
- **Runner QA sementara sudah dihapus.** GAS TEST aktif dipulihkan ke backend bersih versi 12. Tidak ada endpoint atau fault injection QA di source aktif. Produksi tetap di deployment v29 dan tidak disentuh.
- Backup baca-saja Spreadsheet produksi berhasil: XLSX 966.718 byte, 16 sheet, SHA-256 `5337562251f1be0e7b881d2e0a8f2b9c332f6e3e0fb6d71181955de2dfdeba86`, akses file 0600/folder 0700 di `~/Documents/Presensi Release 2026-10-10/private-backup/production-before-release.xlsx`. Source Apps Script produksi v29 ikut tersimpan pada folder privat sibling `gas-v29/`.
- Lokal setelah final cleanup: `npm test` 7/7, `npm run typecheck` 0, `next build` static 10 routes lulus. Lint 0 error, 14 warning (11 set-state-in-effect, 2 img, 1 exhaustive-deps). `npm audit --omit=dev` 0 temuan; audit penuh masih 10 temuan dev (8 high, 2 moderate), termasuk clasp/Next lint/Tailwind toolchain. React 18 mendapat peringatan deprecated dari Next 16.
- Keterbatasan: offline diuji lewat mock penolakan fetch/recovery UI, bukan memutus jaringan browser fisik; render DOCX sudah tervalidasi sebelumnya dengan fixture sintetis, tidak mengulang render setelah perubahan karena generator DOCX tidak berubah.

## Hasil lokal terbaru

| Pemeriksaan | Status | Bukti |
|---|---|---|
| Regresi aplikasi | PASS | `npm test`: 7/7 file lulus, termasuk 33 pemeriksaan backend, validasi lima format bukti dan 4 skenario fault-injection lokal |
| TypeScript | PASS | `npm run typecheck` exit 0 |
| Static export | PASS | `next build` exit 0, 10 rute statis; deployment paket dibangun dengan endpoint produksi v29; Next.js memberi peringatan React 18 deprecated |
| Lint | PASS dengan warning | ESLint exit 0, 0 error dan 14 warning |
| Audit dependency | Runtime production bersih | Override `exceljs -> uuid@11.1.1`; `npm audit --omit=dev`: 0 temuan. Audit lengkap tersisa 10 temuan dev (8 high, 2 moderate), 0 critical. |

Test backend yang sebelumnya gagal ternyata memiliki fixture/assertion yang salah: dua fault-injection tidak menyiapkan alert aktif, assertion deduplikasi mengharapkan nol padahal seharusnya satu, simpan ulang mengharapkan hari unik bertambah, dan tes koreksi HADIR menulis tanggal baru. Fixture/ekspektasi diperbaiki; logika produk tidak diubah.

## Bukti salinan Google dan browser

- Hari ini runner `runCopyRegression()` dijalankan langsung di editor Apps Script project yang terikat ke salinan (`16-zovx...7YRQ`): **PASS 26 checks**, log `Eksekusi selesai`, durasi 52.693 detik. `getSiswa` 582 ms; save hari sekolah 3.978–4.991 detik; save ulang 2.959 detik; koreksi HADIR 4.758 detik; penyelesaian PDF 2.878 detik; detail direktori 1.952–2.111 ms. Penolakan Sabtu 216 ms dan resolve tanpa lampiran 516 ms. Runner selesai menjalankan `finally` cleanup sebelum mencetak PASS.
- Runner Drive tambahan hari ini **PASS 7 checks**: PDF/DOCX/XLSX/JPG/PNG berhasil dibuat dengan MIME yang diharapkan, file spoof ditolak, ukuran >10 MB ditolak. File uji berawalan `CODEX_FORMAT_` dipindah ke Trash pada cleanup. Office yang diuji hanya byte signature, bukan dokumen utuh yang dibuka di Word/Excel.
- Pemeriksaan endpoint tanpa sesi hari ini mengikuti redirect GAS, lalu menjawab `UNAUTHORIZED` dalam sekitar 1.96 detik. Ini hanya memastikan penolakan akses; bukan uji latensi tindakan berautentikasi.
- Pada 9 Oktober, uji UI sebelumnya mencatat data XI BD (15 siswa), XI AK (9), dan X AK (6); pengukuran save via runner Google 3.285–4.891 detik, `getSiswa` 1.104 detik. Sampel dan kondisi kelas tidak setara untuk klaim perbandingan sebelum/sesudah.
- Server localhost `:3001` sekarang diarahkan ke endpoint TEST dan memberi HTTP 200. Halaman presensi menunjukkan roster kosong untuk X AK; tidak ada save UI. Penyebabnya belum dipastikan (data roster vs sesi API), sehingga pengukuran kelas nyata belum sah.
- Koreksi 10 Oktober 09:02 WIB: `runCopyConcurrencyRegression()` berhasil dijalankan dari editor TEST. **PASS**: dua request `saveAttendance` serentak sukses, satu log akhir tercatat (`IZIN`), eksekusi selesai. `finally` membersihkan siswa/log sintetis. Produksi tidak disentuh.
- Fixture UI 30 siswa sintetis (6 X AK, 9 XI AK, 15 XI BD) berhasil disiapkan, lalu dibersihkan (**CLEANED 30**). Setelah reload, localhost mengalihkan ke login; tanpa sesi lokal aktif, pengukuran UI/latensi tidak dilakukan.
- Riwayat awal sesi: TEST v2. Status deployment terkini ada pada pembaruan live di atas (TEST v12).

## Riwayat verifikasi sebelum pembaruan terkini

Catatan di bawah merekam kondisi saat itu; pembaruan live paling atas adalah status terkini.

## Verifikasi tambahan dan yang masih tertunda (riwayat)

- Tes backend lokal menerima PDF, DOCX, XLSX, JPG, dan PNG berdasarkan signature serta menolak spoof/ukuran >10 MB. Uji Drive nyata juga membuat kelima tipe dengan header sintetis dan memeriksa MIME. Generator DOCX menghasilkan OpenXML valid; contoh sintetis dirender ke PDF satu halaman memakai LibreOffice dan dicek visual: tabel riwayat, header, dan tanda tangan muat tanpa clipping. Microsoft Word sendiri belum dibuka.
- Tes UI lokal sekarang mencakup load offline, pemulihan setelah koneksi kembali, dan retry save dengan payload sama. Itu mock komponen, bukan simulasi offline di browser nyata.
- `npm test`, `npm run typecheck`, dan `npm run build` lulus lagi setelah penambahan tes.
- Pengukuran UI/latensi dengan roster masih tertunda karena localhost mengalihkan ke login setelah reload. Fixture sintetis sudah dibersihkan; perlu sesi TEST aktif sebelum mengukur.
- Concurrency Google lulus satu skenario dua request simultan pada endpoint TEST; ini bukan load test volume tinggi dan belum mencakup beban banyak kelas.
- XLSX dibuat dan dibaca kembali lewat ExcelJS; gambar rekap dan render Office belum dicek secara visual. Lint terakhir: 32 warning; belum ada error. Audit dev menyisakan 10 temuan yang tidak masuk bundle production.

Gunakan hanya NIS sintetis dan folder Drive `TEST_PRESENSI_` untuk uji tulis. Jangan masukkan identitas atau kode wali siswa ke laporan.

## 10 Oktober: portal orang tua tanpa kredensial
- Alur jurusan → tingkat → kelas → siswa → detail presensi; tidak meminta NIS/kode wali. Tombol kode wali di modal BK dihapus.
- Endpoint publik daftar hanya nama/kelas/NIS internal/tingkat/jurusan; detail hanya tanggal/status, bulan tervalidasi. Data sensitif tidak disertakan.
- 8/8 file tes Node lulus; TypeScript, static build, lint file terkait lulus. Tes onboarding mencakup filter dan pembatalan respons lama.
- Backend TEST deployment yang sama diperbarui ke version 5 pada script salinan 1-NpiLFzPdn5d-NkuXVcv1A8Aijaux4eueJYT5gymCuPJM92zaKZ84fkH. Live GET roster 467 siswa, detail tanpa kredensial, pembatasan field, bulan tidak valid, serta endpoint BK tanpa sesi telah diverifikasi.
- Browser localhost portal menampilkan pilihan jurusan. Seluruh tahap UI diuji lewat harness komponen; klik end-to-end browser belum dijalankan. Produksi belum diperbarui.

## 10 Oktober: portal orang tua dihapus sesuai arahan terbaru
- Portal dipindahkan lingkupnya ke repo terpisah milik pengguna; route lokal, link login, pengecualian auth/layout, helper API, controller publik, dan fungsi kode wali dihapus dari repo BK.
- 7/7 file tes lulus, termasuk auth BK dan penolakan endpoint portal lama. TypeScript, static build (tanpa portal), dan lint file terkait lulus.
- Backend TEST diperbarui ke versi 6; GET publik getParentStudents/getParentAttendance menolak tanpa mengembalikan data. URL portal localhost mengembalikan HTTP 404.
- Data siswa/presensi tidak dihapus. Repo portal lain dan produksi belum diubah.

## 10 Oktober: verifikasi overlay dan latensi roster nyata
Overlay live PASS untuk layar penuh, fokus Tab, Escape, blokir klik navigasi, dan pembukaan/penutupan detail. Direktori 467 entri: 5,964–7,374 detik; detail: 5,107–5,280 detik. Presensi X AK 3,044 detik, pindah tingkat XI AK 5,565 detik, pindah kelas XI BD 2,413 detik. Seluruh roster tampil dan kontrol siap. Tidak ada save absensi. Waktu mencakup overhead observasi browser; performa masih lambat. Rincian dan batas pengukuran: UI-VERIFICATION-2026-10-10.md.
