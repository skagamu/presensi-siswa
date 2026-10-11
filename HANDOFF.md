# Handoff Presensi Siswa BK — 11 Oktober 2026

## Status gauntlet terbaru (menggantikan status lama di bawah)
Commit lokal `0541b3e` menangani 404 GAS secara terbatas dan race timeout/fresh-read. GAS TEST aktif v27, source bersih tanpa endpoint QA sementara. Lokal: 9/9 suite, TypeScript, static build TEST lulus; lint 0 error/13 warning. Live TEST: gauntlet 15 checks, regression 26, formats 7, retry, concurrency tiga kelas, dan lock barrier saat client timeout PASS; fixture dibersihkan. Smoke transport v27 20/20 tidak menemukan 404, tetapi akar historis 404 belum terpastikan. Produksi/GitHub tidak disentuh.
Untuk rilis nanti, jalankan [Checklist verifikasi produksi](PRODUCTION-RELEASE-CHECKLIST.md) dan perbarui pasangan artifact frontend/backend. Jangan pakai bundle build TEST sebagai frontend produksi. Rincian hasil dan batas: [GAUNTLET-PROGRESS.md](GAUNTLET-PROGRESS.md).

## Perbaikan worktree lanjutan (riwayat)
- Endpoint frontend sekarang tidak memiliki fallback URL. Tanpa `NEXT_PUBLIC_GAS_API_URL`, request berhenti dengan pesan jelas dan static build ditolak. GitHub Pages membaca URL dari repository variable dengan nama yang sama; pemeriksaan GitHub menemukan variable itu belum disetel, jadi isi dengan endpoint produksi yang benar sebelum merge ke `main`.
- Dashboard akhir pekan tidak lagi menampilkan nol kehadiran/absen seolah-olah presensi sekolah berjalan; kartu menampilkan “—” dan memberi pesan bahwa presensi hanya dicatat Senin–Jumat.
- Presensi kini memuat roster+log tanggal lewat satu request; pemilihan kelas tidak meminta ulang. Backend memberi cache 30 detik yang terikat database/revisi dan invalidasi mutasi, serta metrik waktu lock/baca/tulis saat save.
- Backend TEST deployment v17 berisi rekonsiliasi alert satu lintasan. Runner langsung `route()` PASS sebelum/sesudah edit, tetapi satu sampel sesudah edit lebih lambat pada semua aksi, termasuk cache hit; variansi waktu GAS kemungkinan berpengaruh dan dampak algoritme belum terbukti. GET frontend retry sekali 750 ms hanya best-effort untuk 404 ContentService. Produksi tidak disentuh.

Dokumen ini adalah acuan status terbaru. REPAIR-STATUS.md, TEST-PLAN.md, dan beberapa bagian TEST-RESULTS.md mencatat sejarah; keputusan terbaru di sini mengesampingkan informasi lama tentang portal/kode wali dan tes yang dahulu tertunda.

## Folder dan Git
- Folder kerja aplikasi aktif: `/Users/burhanyudha/.codex/worktrees/presensi-repairs/Presensi Siswa BK`.
- Repository: https://github.com/skagamu/presensi-siswa.git
- Branch: `codex/presensi-repairs`.
- BASELINE: `fdd13e6f66a3b3af94b23bb25c57c4b074db1cec`; commit perbaikan lokal tercatat di `git log` setelah paket review final dibuat.
- Commit-commit perbaikan sebelumnya ada di branch lokal `codex/presensi-repairs`; perubahan terbaru yang sedang divalidasi masih uncommitted. Belum dipush atau dideploy produksi.
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

`dev:test` dan `build:test` secara eksplisit menunjuk endpoint TEST. Alternatif: salin `.env.example` ke `.env.local`, lalu `npm run dev -- --port 3001`. Variabel NEXT_PUBLIC dibaca saat dev/build; restart server setelah mengganti backend. API tidak punya endpoint fallback: request gagal jelas bila variabel tidak disetel. Build mewajibkan `NEXT_PUBLIC_GAS_API_URL` agar bundle statis tidak diam-diam memakai backend yang salah.
Workflow GitHub Pages mengambil URL dari repository variable `NEXT_PUBLIC_GAS_API_URL`; isi dengan endpoint produksi sebelum merge ke `main`. Jika kosong, build berhenti aman dan deployment tidak berjalan.

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
- Versi Web App TEST aktif: **23**, perbaikan gauntlet tervalidasi, tanpa endpoint QA sementara. Runner editor terbaru ada di HEAD Apps Script TEST; retry GET tetap best-effort.
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
- Pembaruan 11 Okt: GAS TEST Web App v16 berisi endpoint gabungan presensi/cache. `clasp run` menjawab `NOT_FOUND`; runner dijalankan dari editor Apps Script. Produksi versi 29 tetap tidak disentuh.
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

- Profil GAS TEST sebelum optimasi rekonsiliasi (11 Okt 01:41 WIB): summary 1.106 dtk fresh (3 baca Sheets, 543 ms baca) vs 126 ms cache (0 baca); detail 1.068 dtk (4 baca, 625 ms) vs 132 ms cache; presensi gabungan 779 ms fresh (2 baca, 414 ms) vs 126 ms cache. Save sintetis 2.542 dtk route (2.407 dtk GAS), termasuk 63 ms tunggu lock, 112 ms baca Sheets, 302 ms baca alert, dan 489 ms sinkronisasi alert. Latensi simpan tetap fokus optimasi berikutnya; hasil belum mencakup HTTP/browser.

- Setelah hasil profil tersebut, algoritme rekonsiliasi alert diubah dari beberapa filter/pencarian seluruh daftar berulang menjadi satu lintasan dengan indeks level/alert selesai. `npm test` 7/7, typecheck, sintaks GAS, dan diff check lulus. Project TEST dipush dan Web App diperbarui ke v17; endpoint anonim merespons HTTP 200 `UNAUTHORIZED`. Profil pascaoptimasi sudah dijalankan: angka satu sampel lebih lambat dari baseline pada semua jenis request, termasuk cache hit, sehingga dampak optimasi belum terbukti dan perlu pengukuran berulang.

- Profil sesudah optimasi (11 Okt 01:45 WIB): summary fresh 2.897 ms/cache 440 ms; detail fresh 1.961/cache 342 ms; halaman presensi fresh 1.216/cache 387 ms; save 3.401 ms route/2.862 ms GAS. Dibanding sampel 01:41, semua request memburuk, termasuk cache hits tanpa baca Sheets; save +34%, alert read 462 ms, sync 710 ms. Sampel kedua pascaedit (01:47 WIB) juga melambat: summary fresh/cache 2.454/346 ms, detail 2.715/353 ms, presensi 1.346/397 ms, save 4.133 ms (3.831 GAS; baca alert 839 ms, sync 1.174 ms). Cache hits tanpa baca Sheets pun bertahan di 346–397 ms, jadi variasi runtime/layanan tampak kuat; dua sampel belum mengisolasi efek algoritme. Performa algoritme satu lintasan tetap belum terbukti; tunggu sampel ketiga sebelum menerima atau membatalkan optimasi.

- Sampel live kedua pascaoptimasi (11 Okt 01:47 WIB) konsisten lambat lintas endpoint: cache hits 344–395 ms; save 4.133 ms route / 3.831 ms GAS, alert read 839 ms, sync 1.174 ms. Variasi cache hit yang tidak membaca Sheets mendukung dugaan runtime/layanan GAS sedang lambat, tetapi sampel kecil dan sinkronisasi alert juga lebih lama; tidak cukup bukti untuk atribusi tunggal.

- Sampel ketiga pascaoptimasi (11 Okt 01:49 WIB): summary 1.494/122 ms fresh/cache; detail 1.085/134 ms; presensi 680/116 ms; save 2.408 ms route/2.293 ms GAS (alertRead 411 ms, alertSync 553 ms). Median tiga sampel pascaedit: summary fresh/cache 2.454/346 ms; detail 1.961/342 ms; presensi 1.216/387 ms; save 3.401 ms route (GAS 2.862 ms). Rentang besar: save 2.408–4.133 s; cache presensi 116–397 ms. Sebelum edit hanya ada satu baseline save 2.542 s dan cache presensi 126 ms, jadi perbandingan berpasangan belum cukup untuk menilai algoritme.

Patch akhir gauntlet: rekonsiliasi fresh setelah respons save gagal, termasuk refresh gagal yang harus tetap memblokir Save. Lihat GAUNTLET-PROGRESS.md untuk batas timeout/write masih berjalan.
