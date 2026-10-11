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

- **Belum siap merge/deploy.** Branch `codex/presensi-repairs` sudah dipush; PR #1 masih Draft. CI PR lulus pada commit `8f84d37` (run `38108625245`). Kandidat TEST sudah cocok dengan source backend rilis; cutover Pages/GAS produksi masih belum dilakukan.
- Pages live memakai deployment GAS v29 pada Script ID `1yd9...`, sama dengan target yang dikonfirmasi. `.clasp.json` repo juga menunjuk project ini. Repository variable `NEXT_PUBLIC_GAS_API_URL` sudah diisi dengan endpoint tersebut; kandidat static build lokal dengan URL itu lulus.
- **Script Properties produksi:** `SPREADSHEET_ID` kini sudah diisi dengan spreadsheet produksi yang diberikan pemilik, diverifikasi pada Setelan Project script `1yd9...`. Backend aktif v29 masih memakai ID hard-coded; kandidat repo memakai property ini. Kandidat belum dideploy ke produksi.
- **Script Properties TEST diperiksa pada clone:** `SPREADSHEET_ID` cocok dengan spreadsheet TEST, `FILE_FOLDER_PREFIX` memakai `TEST_PRESENSI_`, dan `AUTH_SALT` sudah ada. Clone masih menyimpan hasil QA serta dua property sesi; verifikasi tidak menghapusnya agar sesi TEST yang mungkin sedang dipakai tidak terputus.
- **Model akses yang dipilih pemilik:** Spreadsheet disetel `Dibatasi`; Web App GAS tetap dapat diakses akun Google. GET ekspor tanpa cookie/login Google masih diarahkan ke host Sheets lalu menjawab 200 XLSX (hanya header/range kosong yang dicek; isi tidak dibaca). Jadi pembatasan di dialog berbagi belum terbukti menutup ekspor anonim.
- Source GAS produksi v29 juga meneruskan `getSiswa`, `saveAttendance`, `resolveCase`, dan `saveBankKasus` tanpa validasi sesi aplikasi. Karena GAS berjalan sebagai pemilik, siapa pun yang dapat memanggil Web App dapat mencoba baca/tulis sebagai pemilik. Kandidat backend mewajibkan sesi untuk semua action selain login. Jangan tandai gerbang akses selesai sampai kandidat terpasang dan smoke GET/POST tanpa sesi di produksi menghasilkan `UNAUTHORIZED`.
- Backup privat bertanggal 11 Oktober berisi XLSX produksi dan source GAS aktif. Manifest lokal mencatat SHA-256 dan batas backup; Script Properties serta file Drive belum dicadangkan.
- Workflow PR kini menjalankan install, typecheck, regresi, lint, dan static build, sementara job deploy dilewati untuk event pull request. Run PR `38108625245` lulus; warning Node 20, penggunaan `<img>`, dan hook/effect tercatat.
- Paket `Presensi Release 2026-10-10/reviewable` masih memakai source commit `a6597d3`; artifact frontend/backend perlu dibangun ulang dari commit PR terbaru.
- Simulasi rollback deployment pada GAS clone lulus: deployment sementara v28 menampilkan marker QA, lalu diarahkan kembali ke v27 dan marker hilang; endpoint kembali menolak akses anonim dengan `UNAUTHORIZED`. Deployment v27 utama tidak diubah, deployment sementara dihapus, dan `@HEAD` dipulihkan ke source v27. Nomor versi v28 tetap ada di histori Apps Script karena versi immutable, tetapi tidak memiliki deployment. Ini menguji rollback versi/deployment, **bukan** migrasi hash password.
- Uji menyeluruh di GAS clone dengan akun sintetis lulus: login pada kandidat hash mengubah password `Users` menjadi `sha256:`; source lama v29 menolak hash; memulihkan nilai password dari snapshot sintetis membuat source lama menerima login lagi. Baris dan sesi sintetis dibersihkan, dua deployment uji dihapus, deployment utama TEST v27 tetap aktif, dan `@HEAD` dikembalikan persis ke snapshot v27. Versi GAS v29/v30 QA tetap immutable di histori tanpa deployment. Ini membuktikan rollback kode saja tidak cukup: saat rollback setelah migrasi, pulihkan juga snapshot kolom password `Users`.

## A. Sebelum rilis

- [x] **Branch, commit, dan CI** — commit `8f84d37` bersih, ada di PR #1, dan run `38108625245` lulus install, typecheck, regresi, lint, serta static build. PR masih Draft.
- [x] **GitHub Pages build target** — `vars.NEXT_PUBLIC_GAS_API_URL` sama dengan deployment GAS produksi v29; static build dengan target itu lulus. Merge tetap belum dilakukan.
- [x] **GAS target dan property** — Script ID produksi `1yd9...`, deployment v29, spreadsheet target, serta `SPREADSHEET_ID` property cocok. Property sudah terpasang; backend v29 belum menggunakannya sampai source kandidat dideploy.
- [ ] **Gerbang akses aplikasi** — model yang dipilih (Spreadsheet Restricted, Web App dapat dipanggil akun Google) hanya aman untuk tulis setelah backend kandidat aktif. v29 produksi belum mensyaratkan sesi untuk baca/tulis; setelah deployment kandidat, GET dan POST tanpa sesi harus `UNAUTHORIZED`. Ekspor spreadsheet anonim juga masih menjawab 200 dan perlu ditutup/diverifikasi.
- [ ] **Urutan cutover** — frontend `main` saat ini membaca beberapa tab lewat GViz publik. Agar tidak memutus layar lama, siapkan cutover singkat: deploy GAS kandidat ke deployment v29 yang sama, cek login lama/read-only; merge PR agar Pages beralih ke GAS; segera ubah sharing sheet ke Restricted; refresh dan verifikasi aplikasi baru. Pengguna dengan sesi lama mungkin perlu login ulang.
- [ ] **Tidak ada harness uji** — source produksi tidak memuat `runTestSuite`, `getQaResult`, fault injection, NIS sintetis, atau `test_delay_ms`.
- [x] **Backup saat ini** — snapshot baca-saja spreadsheet produksi dan source GAS aktif dibuat 11 Oktober; ukuran/hash tercatat pada manifest dan folder privat berizin terbatas. Buat ulang bila ada perubahan sebelum cutover.
- [x] **Rollback deployment GAS** — pemetaan deployment ke versi sebelumnya telah dicoba pada clone TEST; deployment sementara dihapus dan deployment utama tetap di v27.
- [x] **Rollback data/auth pada clone** — alur migrasi password dan pemulihan snapshot `Users` lulus dengan akun sintetis. Sebelum cutover, tetap siapkan snapshot produksi `Users`, artifact Pages sebelumnya, dan versi GAS produksi sebelumnya; rollback kode saja tidak mengembalikan data yang sudah ditulis.
- [x] **Gerbang CI kandidat** — GitHub Actions PR lulus `npm ci`, `npm run typecheck`, `npm test`, `npm run lint`, dan build static dengan URL produksi. Catat warning yang tersisa sebelum merge.
- [x] **Gerbang TEST kandidat** — `clasp_backend/Kode.js` identik dengan source TEST `@HEAD`/deployment v27. Gauntlet/regresi kandidat terdahulu lulus; smoke live terbaru menolak GET dan POST tanpa sesi, login TEST berhasil membaca roster, lalu logout. Tidak ada identitas siswa dicetak dan tidak ada data bisnis ditulis.

**Stop rilis** bila endpoint, script ID, spreadsheet target, pasangan versi, backup, urutan cutover, atau rollback belum dapat dipastikan. Penutupan akses publik perlu dilakukan segera setelah Pages memakai backend baru; hingga itu, ekspor anonim tetap bisa mengungkap isi spreadsheet.

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
