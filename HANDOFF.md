# Handoff Presensi Siswa BK — 10 Oktober 2026

Dokumen ini adalah acuan status terbaru. REPAIR-STATUS.md, TEST-PLAN.md, dan beberapa bagian TEST-RESULTS.md mencatat sejarah; keputusan terbaru di sini mengesampingkan informasi lama tentang portal/kode wali dan tes yang dahulu tertunda.

## Folder dan Git
- Folder kerja aplikasi aktif: `/Users/burhanyudha/.codex/worktrees/presensi-repairs/Presensi Siswa BK`.
- Repository: https://github.com/skagamu/presensi-siswa.git
- Branch: `codex/presensi-repairs`.
- BASELINE: `fdd13e6f66a3b3af94b23bb25c57c4b074db1cec`; commit perbaikan lokal tercatat di `git log` setelah paket review final dibuat.
- Perbaikan disimpan di commit lokal terbaru pada branch `codex/presensi-repairs`; belum dipush atau dideploy produksi.
- Worktree `.git` mengarah ke repository induk di folder lain; jangan menyalin `.git` sendirian untuk memindahkan proyek ke komputer lain. Snapshot source tidak bergantung pada path Git induk.
- Folder Google Drive bukan source aktif localhost. Sebelumnya asisten keliru menambahkan spinner dengan delay buatan 120ms di sana; jangan menggabungkan patch itu. Overlay yang benar di worktree mengikuti request Google yang sebenarnya. Folder Documents belum diaudit atau disinkronkan.

## Aplikasi dan arsitektur
Aplikasi internal Guru BK untuk presensi harian, alert ketidakhadiran, bank kasus, penyelesaian/arsip kasus, rekap, serta ekspor Excel/gambar/DOCX. Next.js 16.4.0, React 18.3, TypeScript, Tailwind/shadcn. Static export (`output: export`), basePath `/presensi-siswa`, hosting produksi GitHub Pages melalui GitHub Actions. Google Apps Script REST API memakai Google Sheets dan Drive.

Baca AGENTS.md dan panduan Next di node_modules/next/dist/docs sebelum mengubah fitur. Ambil solusi terkecil yang menyelesaikan kebutuhan; pertahankan validasi/error handling.

## Menjalankan di mesin ini
```bash
cd '/Users/burhanyudha/.codex/worktrees/presensi-repairs/Presensi Siswa BK'
npm run dev:test
```
Buka http://localhost:3001/presensi-siswa. Server pada port itu masih aktif pada saat handoff; jangan membuat proses kedua di port yang sama. Pastikan proses pemilik port/cwd sebelum menghentikan atau mengganti server. Untuk pindah mesin/harness, gunakan source snapshot, Node >=20.9, `npm ci`, lalu `npm run dev:test`. `.npmrc` berisi `legacy-peer-deps=true` untuk dependency yang ada.

`dev:test` dan `build:test` secara eksplisit menunjuk endpoint TEST. Alternatif: salin `.env.example` ke `.env.local`, lalu `npm run dev -- --port 3001`. Variabel NEXT_PUBLIC dibaca saat dev/build; restart server setelah mengganti backend. Jangan mengandalkan `npm run dev` tanpa env karena API memiliki URL fallback berbeda.

```bash
npm test
npm run typecheck
npm run lint
npm run build:test
```
Jangan menjalankan next start untuk static export; dev memakai next dev. Untuk preview hasil ekspor gunakan static server dengan path `/presensi-siswa` yang sesuai. Jika route baru dihapus lalu typecheck membaca validator Next lama, regenerasi build dahulu.

## Backend TEST dan batas deployment
- Spreadsheet salinan: `16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ`.
- Apps Script TEST: `1-NpiLFzPdn5d-NkuXVcv1A8Aijaux4eueJYT5gymCuPJM92zaKZ84fkH`.
- Editor: https://script.google.com/home/projects/1-NpiLFzPdn5d-NkuXVcv1A8Aijaux4eueJYT5gymCuPJM92zaKZ84fkH/edit
- Deployment ID: `AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q`.
- Versi TEST aktif: **13**, perbaikan target spreadsheet aman, lampiran presensi, dan retry kasus.
- Endpoint: https://script.google.com/macros/s/AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q/exec
- Source backend: `clasp_backend/Kode.js`. **clasp_backend/.clasp.json mengarah ke script lama/produksi**, jangan push dari direktori itu untuk pekerjaan TEST.
- Konfigurasi staging TEST permanen: `handoff/gas-test/.clasp.json` dan `appsscript.json`. Source backend/runner tidak diduplikasi di sana. Buat staging lalu salin versi terbaru:
```bash
# Jalankan dari root proyek; jangan timpa staging milik pekerjaan lain.
TASK_ROOT="$PWD"
TEST_STAGE=$(mktemp -d /tmp/presensi-test-handoff.XXXXXX)
cp handoff/gas-test/.clasp.json handoff/gas-test/appsscript.json "$TEST_STAGE/"
cp clasp_backend/Kode.js "$TEST_STAGE/Kode.js"
cp tests/copy-regression.gs "$TEST_STAGE/ManualTest.js"
cd "$TEST_STAGE"
"$TASK_ROOT/node_modules/.bin/clasp" deployments
# Sesudah cocokkan script ID TEST, untuk update TEST yang dibutuhkan:
# "$TASK_ROOT/node_modules/.bin/clasp" push --force
# "$TASK_ROOT/node_modules/.bin/clasp" deploy --deploymentId AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q --description 'TEST perubahan yang diverifikasi'
```
`SPREADSHEET_ID` dan `FILE_FOLDER_PREFIX` berada di Script Properties TEST. Jangan hapus properties/sesi atau menimpa dengan database asli. Runner memeriksa container salinan, memakai NIS uji sendiri, dan membersihkan data uji. Jangan menjalankan runner ke produksi.

Pengguna mengizinkan ubah/hapus data uji di salinan dan concurrency Google. Produksi belum mendapat izin deploy. Frontend/backend produksi harus dirilis sebagai pasangan setelah validasi dan izin; jangan deploy frontend yang memakai kontrak API baru sendirian.

## Login dan kredensial
Sesi BK diperlukan. Browser mesin ini memiliki sesi aktif saat handoff; sesi baru/mesin lain mungkin perlu login pengguna. Token/password/OAuth tidak disertakan dalam handoff. Clasp sudah login di mesin ini; bila pindah mesin gunakan `npx @google/clasp login` (bukan `npx clasp login`). Jangan membuat akun/password dummy atau memindahkan berkas OAuth/token ke repo.

## Keputusan bisnis terbaru
- Sakit dengan/tanpa surat dokter dihitung satu hari.
- Alert kumulatif dalam tahun ajaran, asumsi 1 Juli–30 Juni.
- Hari sekolah Senin–Jumat. Sabtu/Minggu mengganti roster dengan pesan tidak dapat input; simpan nonaktif.
- Bukti mendukung PDF/Word/Excel/JPG/PNG, batas 10MB, signature divalidasi backend.
- Detail siswa menampilkan overlay penuh yang memblokir pointer, keyboard/Tab/Escape selama request; tampilkan detail/error setelah selesai, tanpa delay buatan.
- **Portal orang tua dihapus dari repo BK** karena pengguna memiliki repo lain. Route/link/auth bypass/helper/endpoints/kode wali telah dihapus. Jangan membuatnya kembali.

## Perbaikan yang sudah ada
Session server, hash password, expiry/logout/throttle; endpoint setup publik dihapus; presensi satu request per kelas dengan lock/upsert dan koreksi HADIR; bukti lama dipertahankan, file staging dibersihkan bila commit gagal; idempotensi penyelesaian kasus/retry; alert unik dan rekonsiliasi tahun ajaran. Direktori memakai ringkasan ringan/detail lazy per siswa. Rekap dan ekspor memakai cakupan tanggal/denominator/filter konsisten, WIB, dan ExcelJS lazy load. Respons kedaluwarsa tidak menimpa pilihan terbaru; DOCX escape XML. Tidak ada perubahan sharing massal/produksi.

## Bukti verifikasi dan batasnya
- Pembaruan 10 Okt 12:40 WIB: Google TEST regression PASS 23, retry sesudah respons hilang PASS tanpa duplikasi, konkurensi 3 kelas/3 sesi/6 request PASS (3 log akhir), dan format bukti PASS 7. QA runner sementara sudah dihapus; TEST kembali ke backend bersih v12. Produksi tetap versi 29.
- Pembaruan 10 Okt 16:45 WIB: GAS TEST deployment v13 berisi source perbaikan dan runner `runCopyRegression`, `runCopyConcurrencyRegression`, dan lainnya. `clasp run` gagal dengan `NOT_FOUND`, jadi runner live v13 belum dijalankan; jalankan dari editor Apps Script TEST. Local regressions, typecheck, lint, dan static build lulus. Produksi tetap versi 29.
- Profil UI roster nyata 467 siswa: summary dingin 4.063ms/5 pembacaan Sheets; detail dingin 3.895ms/4 pembacaan; detail hangat 1.499ms/0 pembacaan; paint dingin 4.267ms dan hangat 1.910ms. Latensi dingin masih terasa; hanya satu siswa/satu sesi.
- Backup baca-saja produksi terverifikasi 16 sheet, SHA-256 ada di TEST-RESULTS.md, di folder privat Documents; source GAS production v29 tersimpan di sampingnya. Tidak ada write produksi.
- Validasi final: 7/7 suite Node, typecheck, static build 10 rute lulus; lint 0 error/14 warning.
- Dependency audit: production 0 temuan; development 10 temuan (8 high/2 moderate); Next.js menyatakan React 18 deprecated.
- Google concurrency live PASS: tiga kelas/sesi bersamaan; detail di TEST-RESULTS.md.
- Dokumen DOCX sintetis berhasil dirender/QA satu halaman.
- TEST v6: endpoint portal lama ditolak; URL portal lokal HTTP 404.
- Overlay live PASS: fullscreen, focus trap, Escape dan klik navigasi tertahan; dapat menutup detail sesudah request selesai.
- Roster nyata, tanpa save data: direktori 467 entri (termasuk siswa uji lama); X AK 6, XI AK 9, XI BD 15 tampil.
- Pengukuran terbaru roster 467 siswa: directory dingin 4,063 detik; detail dingin 3,895; detail hangat 1,499; overlay terukur. Satu sampel, bukan p95/SLA. **Performa dingin masih terasa lambat.**
- Rincian: UI-VERIFICATION-2026-10-10.md, TEST-RESULTS.md. Screenshot overlay sebelumnya hanya file lokal /tmp/presensi-overlay-verifikasi.png dan tidak diperlukan untuk menjalankan proyek.
- Audit dependency terbaru: production runtime 0 vulnerability; dev tools 10 temuan (8 high/2 moderate).
- Tidak ada status persisten batch belum diinput; HADIR di rekap merupakan default jika tidak ada log absen. Hari libur selain weekend belum dimodelkan.

## Status tersisa
1. Perubahan siap dan tervalidasi sudah di-commit lokal. Belum push/merge atau deploy produksi.
2. Paket produksi static+GAS, backup verifikasi XLSX, dan rollback ada di `/Users/burhanyudha/Documents/Presensi Release 2026-10-10/`. Tinjau `reviewable/README.md` dan `reviewable/ROLLBACK.md`.
3. Performa cold load masih 3.9–4.1 detik pada satu sampel live; cache warm detail ~1.5 detik. Perlu dipantau sesudah rilis, tidak ada janji SLA.
4. Offline diuji dengan fault fetch dalam unit test, bukan dengan memutus jaringan di browser. Audit menyisakan 10 temuan di toolchain development; runtime produksi bersih.
5. Rilis produksi harus pasangan frontend/backend, dengan izin akhir pengguna. Tidak ada perubahan spreadsheet atau deployment produksi dari pekerjaan ini.
6. Sebelum GAS dikirim ke produksi, pastikan Script Property `SPREADSHEET_ID` sudah diisi dengan ID sheet produksi yang benar; backend sekarang gagal tertutup bila properti ini kosong.

Tes yang sudah lulus tidak perlu dijalankan ulang kecuali file terkait berubah. Tidak ada persentase kelulusan tunggal: gerbang yang diminta sudah lulus, sementara latensi dingin dan batas simulasi offline tercatat di atas.
