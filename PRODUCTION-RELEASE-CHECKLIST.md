# Checklist verifikasi produksi — Presensi Siswa BK

Gunakan dokumen ini pada hari rilis. Tandai `PASS`, `FAIL`, atau `BLOCKED`, isi waktu dan bukti singkat. Jangan menjalankan tes yang membuat/mengubah/menghapus data bisnis di spreadsheet produksi. Semua skenario tulis, retry paksa, fault injection, concurrency, dan cleanup harus tetap di spreadsheet TEST.

## Konteks rilis

- Commit frontend/backend: `________________`
- Branch/PR dan persetujuan: `________________`
- Build frontend (artifact/Actions run): `________________`
- Versi GAS produksi sebelum → sesudah: `________________`
- URL Web App produksi (cukup catat label/versi, jangan tempel token): `________________`
- Spreadsheet produksi yang dikonfirmasi pemilik: `________________`
- Operator dan waktu (WIB): `________________`
- Backup sebelum rilis dan SHA-256: `________________`
- Rollback frontend/backend disiapkan oleh: `________________`

## Status saat dicek — 11 Oktober 2026

- **Backend sudah cutover; Pages perlu dirilis segera.** Kandidat GAS v30 sudah dipasang pada seluruh 19 deployment versi tetap. PR #1 masih Draft pada awal cutover; branch `codex/presensi-repairs` berisi commit source `15f0ca6`. Validasi lokal: 9/9 suite Node, TypeScript, lint 0 error/13 warning, dan static build dengan URL API produksi lulus. Dua critic Gauntlet independen memilih kandidat atas baseline.
- Pages memakai URL deployment v29 yang sama; deployment itu sekarang menjalankan source v30. `.clasp.json` menunjuk project produksi yang dikonfirmasi dan `NEXT_PUBLIC_GAS_API_URL` cocok. Jangan mengganti URL Pages karena ID deployment v29 dipertahankan.
- **Script Properties produksi:** `SPREADSHEET_ID` cocok dengan spreadsheet produksi; `AUTH_SALT` belum ada. Kandidat membuat salt dan memigrasikan password lama saat login pertama yang berhasil. Jangan rollback source ke v29 setelah password pertama di-hash kecuali nilai password sheet `Users` dipulihkan dari snapshot.
- **Script Properties TEST diperiksa pada clone:** `SPREADSHEET_ID` cocok dengan spreadsheet TEST, `FILE_FOLDER_PREFIX` memakai `TEST_PRESENSI_`, dan `AUTH_SALT` sudah ada. Clone masih menyimpan hasil QA serta dua property sesi; verifikasi tidak menghapusnya agar sesi TEST yang mungkin sedang dipakai tidak terputus.
- **Model akses yang dipilih pemilik:** spreadsheet disetel `Dibatasi`, Web App GAS tetap dapat dipanggil akun Google, dan pemilik meminta pengaturan akses ini dibiarkan. Pemeriksaan ekspor tanpa cookie mendapat redirect lalu status 200 XLSX (hanya satu-byte range diminta; isi tidak dibaca). Ini berarti pembacaan langsung mungkin tetap terbuka; pemilik menerima pilihan akses tersebut. Hak edit langsung di Sheets tetap dibatasi oleh dialog berbagi.
- **Inventaris deployment GAS:** 19 deployment berversi dan satu `@HEAD`; seluruh Web App tetap `ANYONE_ANONYMOUS` dan berjalan sebagai pemilik sesuai pilihan pemilik. Peta deployment/versi pra-cutover disimpan privat. Versi immutable v30 berisi kandidat, lalu semua 19 ID deployment lama diarahkan ke v30 tanpa mengganti URL; `@HEAD` mengikuti source yang dipush.
- **Smoke autentikasi produksi:** 38/38 permintaan anonim (GET `getSiswa` dan POST kosong ke `saveAttendance` pada masing-masing 19 URL) berakhir HTTP 200 dengan kode `UNAUTHORIZED`. Tidak ada data siswa dibaca atau data bisnis ditulis. Source kandidat tidak memuat `setupDatabase` maupun `injectMassiveDummy`. Login terautentikasi dan UI Pages produksi belum diverifikasi; rilis belum boleh disebut selesai sebelum owner melakukan login dan pemeriksaan baca-saja.
- Backup privat sebelum cutover dibuat baca-saja pada 11 Oktober 2026 pukul 11:38 WIB: XLSX produksi dan source GAS v29, folder 0700/file 0600. SHA-256 XLSX `0e16c316a24519fdd7f8f0f5ac72b2f076a9147543da23a32a17b8d13a57e238`. Peta deployment pra-cutover dan hasil smoke tersimpan di folder yang sama. Tidak ada data produksi yang ditulis atau dihapus.
- Workflow PR menjalankan install, typecheck, regresi, lint, dan static build, sementara job deploy dilewati untuk event pull request. Run terbaru `38111680877` lulus; lint masih memiliki 13 warning.
- Paket kandidat tersimpan di `~/Documents/Presensi Release 2026-10-11/candidate` dan `presensi-release-candidate.zip`; source GAS cocok dengan kandidat dan checksum/arsip tervalidasi. Build ulang menghasilkan ID build Next.js berbeda walau commit sumber sama.
- Simulasi rollback deployment pada GAS clone lulus: deployment sementara v28 menampilkan marker QA, lalu diarahkan kembali ke v27 dan marker hilang; endpoint kembali menolak akses anonim dengan `UNAUTHORIZED`. Deployment v27 utama tidak diubah, deployment sementara dihapus, dan `@HEAD` dipulihkan ke source v27. Nomor versi v28 tetap ada di histori Apps Script karena versi immutable, tetapi tidak memiliki deployment. Ini menguji rollback versi/deployment, **bukan** migrasi hash password.
- Uji menyeluruh di GAS clone dengan akun sintetis lulus: login pada kandidat hash mengubah password `Users` menjadi `sha256:`; source lama v29 menolak hash; memulihkan nilai password dari snapshot sintetis membuat source lama menerima login lagi. Baris dan sesi sintetis dibersihkan, dua deployment uji dihapus, deployment utama TEST v27 tetap aktif, dan `@HEAD` dikembalikan persis ke snapshot v27. Versi GAS v29/v30 QA tetap immutable di histori tanpa deployment. Ini membuktikan rollback kode saja tidak cukup: saat rollback setelah migrasi, pulihkan juga snapshot kolom password `Users`.

## A. Sebelum rilis

- [x] **Branch, commit, dan CI** — kandidat source `15f0ca6` ada di PR #1; run CI lama `38111680877` lulus install, typecheck, regresi, lint, serta static build. CI akan berjalan lagi untuk pembaruan checklist.
- [x] **GitHub Pages build target** — `vars.NEXT_PUBLIC_GAS_API_URL` sama dengan deployment GAS v29 yang kini menjalankan v30; static build lokal dengan target itu lulus. Merge/deploy Pages masih perlu dilakukan.
- [x] **Paket rilis** — static export, source GAS, manifest, checklist, dan SHA-256 dibuat ulang dari kandidat; arsip tervalidasi dan tidak menyertakan `.clasp.json`.
- [x] **GAS target dan property** — Script ID produksi, spreadsheet target, serta `SPREADSHEET_ID` property cocok. Backend v30 memakai property spreadsheet.
- [x] **Inventaris URL lama** — semua 19 URL deployment versi tetap dicatat pada backup privat dan diarahkan ke v30; URL/deployment ID dipertahankan.
- [x] **Gerbang anonim** — GET/POST anonim diuji pada seluruh 19 URL; 38/38 respons aplikasi `UNAUTHORIZED`, tanpa data bisnis berubah.
- [x] **Urutan cutover backend** — backup baca-saja, push source, pembuatan v30, pembaruan 19 deployment, dan smoke selesai. Pages harus segera dirilis agar frontend memakai login/token kandidat. Bila rollback setelah password di-hash, pulihkan kolom `Users` dari snapshot juga.
- [ ] **Tidak ada harness uji** — source produksi tidak memuat `runTestSuite`, `getQaResult`, fault injection, NIS sintetis, atau `test_delay_ms`.
- [x] **Backup saat cutover** — snapshot baca-saja spreadsheet produksi dan source GAS v29 dibuat pukul 11:38 WIB; ukuran/hash tercatat pada manifest privat.
- [x] **Rollback deployment GAS** — pemetaan deployment ke versi sebelumnya telah dicoba pada clone TEST; deployment sementara dihapus dan deployment utama tetap di v27.
- [x] **Rollback data/auth** — alur migrasi/pemulihan diuji di clone TEST; spreadsheet snapshot pra-cutover produksi dan peta versi GAS lama tersimpan privat. Rollback kode saja tidak mengembalikan password `Users` yang sudah di-hash.
- [x] **Gerbang CI kandidat** — GitHub Actions PR lulus `npm ci`, `npm run typecheck`, `npm test`, `npm run lint`, dan build static dengan URL produksi. Catat warning yang tersisa sebelum merge.
- [x] **Gerbang TEST kandidat** — `clasp_backend/Kode.js` identik dengan source TEST `@HEAD`/deployment v27. Gauntlet/regresi kandidat terdahulu lulus; smoke live terbaru menolak GET dan POST tanpa sesi, login TEST berhasil membaca roster, lalu logout. Tidak ada identitas siswa dicetak dan tidak ada data bisnis ditulis.

**Jangan klaim rilis selesai** sampai Pages kandidat berhasil deploy dan owner memverifikasi login serta pembacaan read-only. Spreadsheet sharing tetap mengikuti pilihan pemilik. Jangan lakukan tes tulis di produksi.

## B. Sesudah backend GAS dipasang — pemeriksaan aman tanpa menulis data bisnis

- [ ] Deployment GAS menunjukkan versi/URL yang dicatat pada konteks rilis; tidak ada error deployment.
- [ ] GET anonim read-only mengikuti redirect dan menerima respons aplikasi `UNAUTHORIZED`. HTTP 200 pada ContentService sendiri bukan bukti autentikasi berhasil.
- [ ] Dari UI produksi, pengguna BK yang berwenang dapat login; halaman Dashboard, Data Siswa (ringkasan/detail), Presensi, Rekap, Riwayat, Bank Kasus, dan Daftar Kasus terbuka tanpa error.
- [ ] Baca roster/detail dan rekap untuk tanggal/kelas yang sudah diketahui. Cocokkan beberapa sampel terhadap spreadsheet tanpa mengubah sel; jangan salin NIS/nama ke laporan.
- [ ] Presensi tanggal Senin–Jumat menampilkan roster dan status yang sudah tersimpan. Memilih Sabtu/Minggu menutup roster, menampilkan pesan yang tepat, dan tombol simpan nonaktif.
- [ ] Saat membuka detail siswa, overlay menahan klik/keyboard sampai detail selesai atau gagal; navigasi kembali normal sesudahnya.
- [ ] Ekspor XLSX/DOCX dari data yang memang boleh dilihat terbuka dan periodenya sesuai filter. Jangan ekspor/share data untuk keperluan tes.
- [ ] Logout mengakhiri sesi; membuka halaman terlindungi kembali meminta login.
- [ ] Periksa DevTools Network/Console pada pembacaan read-only: tidak ada `[BK_API]` 404/403 berulang atau error autentikasi; GET berakhir pada host ContentService yang diharapkan. Jangan simpan/share URL penuh, query, token, body, nama, atau NIS.
- [ ] Catat waktu 3 pembacaan aman (misalnya ringkasan, detail, presensi) dan bedakan cold/warm. Ini pemantauan rilis, bukan load test atau SLA.

## C. Canary penggunaan nyata

- [ ] Jangan membuat absensi sintetis di produksi. Tunggu pencatatan presensi bisnis pertama yang memang perlu dilakukan petugas.
- [ ] Amati respons UI dan waktu simpan; sesudah sukses, baca ulang tanggal/kelas tersebut dan pastikan hasil konsisten dengan tindakan petugas.
- [ ] Bila request timeout atau respons hilang: **jangan langsung mengulang**. Gunakan **Periksa status**, tunggu pembacaan fresh selesai, cocokkan data dengan spreadsheet, baru putuskan tindakan lanjutan bersama petugas.
- [ ] Pastikan tidak ada duplikasi log/alert setelah tindakan bisnis; koreksi hanya bila petugas memang meminta koreksi.
- [ ] Tulis hasil dan waktu respons tanpa data identitas siswa.

Skenario save paksa, response-loss, abort jaringan, retry, koreksi, bukti file, dan concurrency sudah diuji pada TEST. Jangan mengulangnya dengan data produksi. Bila smoke read-only gagal, hentikan canary dan rollback kode; jangan mencoba memperbaiki data langsung.

## D. Keputusan pascarilis

- [ ] Semua butir A dan B lulus; canary C tidak menunjukkan error atau perbedaan data.
- [ ] Tidak ada 404 yang ditemukan selama pembacaan smoke. Jika muncul, simpan hanya action, HTTP status, hostname, `redirected`, waktu, serta waktu Apps Script Executions; jangan sertakan URL/query/token.
- [ ] Monitor aktivitas normal pada hari sekolah berikutnya dan eskalasi 404/timeout berulang. Jangan klaim akar masalah 404 selesai hanya karena smoke test berhasil.
- [ ] Catat keputusan: `LANJUT / ROLLBACK / TAHAN`, pemilik keputusan, waktu, dan alasan: `________________`.

## Bukti TEST yang tidak perlu diulang di produksi

Rujuk [hasil test terkini](TEST-RESULTS.md) dan [catatan Gauntlet](GAUNTLET-PROGRESS.md): unit/regresi lokal, validasi aturan absensi dan alert, format/signature bukti, response-loss dan retry, beberapa kelas/pengguna bersamaan, fresh-read menunggu ScriptLock setelah timeout, typecheck/build/lint, serta pembersihan fixture. Bukti ini memvalidasi kandidat pada lingkungan TEST; checklist produksi di atas hanya memeriksa konfigurasi, akses, pembacaan, UI, dan canary bisnis yang memang diperlukan.
