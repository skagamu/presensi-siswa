# Gauntlet Presensi Siswa BK — 11 Oktober 2026

Mengikuti [RoboNuggets gauntlet-loop](https://github.com/robonuggets/gauntlet-loop), commit 9b1975a. Teknik Matt Shumer, skill Jay E, CC BY 4.0. Pengguna memilih baseline worktree sebelum putaran builder. Snapshot asli dan hash: `/tmp/presensi-gauntlet-baseline-20261011`; arsip source permanen dan SHA-256 ada di `/Users/burhanyudha/Documents/Presensi Gauntlet 2026-10-11`.

## Perbandingan
Builder dan critic terpisah. Critic pertama menolak kandidat arsip karena duplikat aktif masih dapat tersisa; builder memperbaiki urutan. Setelah putaran berikutnya, critic backend/frontend memilih kandidat. Judge baru menerima dua implementasi anonim A/B, tidak membaca mapping atau sejarah pembuat: memilih A. Mapping setelah putusan: A = kandidat, B = baseline. Tes identik gagal pada baseline dan lulus pada kandidat; tidak ada branch aplikasi khusus untuk mengakali tes.

## Temuan yang diperbaiki
- Presensi memakai log lama setelah save/pindah kelas, menyebabkan status dan bukti tertimpa saat save berikutnya.
- Bank Kasus menghapus draft yang diubah selama save sebelumnya.
- Submit penyelesaian ganda sebelum pembacaan file selesai, pada Semua Alert dan Dashboard.
- Pembacaan bukti Presensi yang selesai setelah Batal/reopen mengubah draft lama atau menimpa pilihan baru.
- Top 3 Dashboard mengulang siswa; sekarang memilih satu alert prioritas per NIS dengan tie-break deterministik.
- Status legacy, tanggal invalid, dan HADIR terbaru tidak konsisten dalam hitungan alert.
- Boolean dokter legacy FALSE berubah menjadi true saat resave; input string boolean kini ditolak.
- Arsip resolusi menjadi orphan sesudah status write gagal lalu koreksi; arsip kini dipertahankan dan retry idempotent. Duplikat aktif level yang sudah selesai tidak muncul lagi pada query antrean.
- Profil gasMs dibuat sebelum invalidasi selesai; sekarang sesudah finally. alertSync inklusif, tidak ditambahkan lagi dengan alertRead/Write.
- Cleanup lampiran tanpa kandidat masih membaca dua sheet; kini tidak membaca referensi bila file kosong. Bacaan cleanup nyata dihitung lewat repository.

## Bukti
- 8/8 suite Node, TypeScript, static build TEST (10 rute), sintaks GAS, diff check lulus. Lint 0 error/13 warning lama; Next memberi peringatan dukungan React 18 akan dihapus pada Next 17.
- Google TEST via URL, dengan login TEST: gauntlet 15 checks dan regresi utama 26 checks PASS; gauntlet diulang sesudah optimasi cleanup dan tetap PASS.
- Retry biasa PASS tanpa duplikasi; 3 kelas/3 sesi/6 request menghasilkan tepat 3 log (22.302 ms). Simulasi kegagalan respons sesudah commit PASS: retry tidak mengganti ID/menggandakan log; koreksi HADIR menyisakan nol log. Ini fault injection server, bukan pemutusan jaringan nyata.
- Browser nyata: login; direktori 467 entri; detail dengan overlay dan fokus dialog; weekend menutup roster; Jumat X AK 6 siswa; save IZIN+PDF sintetis, pindah A/B/A, save ulang, database tepat satu log IZIN dan bukti. Bank Kasus semua kontrol disabled saat save, satu kasus tersimpan. Top3 terdiri dari tiga siswa berbeda.
- Dua fixture UI dibersihkan; 10 pemeriksaan GET memastikan siswa/log/kasus/alert/arsip sintetis kosong. Sesi API tambahan di-logout; file token sementara dihapus.
- TEST akhir v23 tanpa endpoint QA sementara; getQaResult dan runTestSuite terautentikasi ditolak dengan Action tidak dikenali. GET admin anonim ditolak UNAUTHORIZED. Produksi dan GitHub belum diubah.

## Kecepatan dan batas
CPU pada dataset identik 500 siswa/11.000 log/2.000 alert: baseline median 14,19 ms, kandidat 11,03 ms; critic terpisah juga mengukur 13,54 vs10,82 ms. Hasil valid-data identik. Ini CPU lokal, bukan waktu layanan Google.
Browser sebelum optimasi cleanup kosong: summary 3.808 ms HTTP/2.104 ms GAS; detail 3.066/1.487; presensi 3.120–4.478 HTTP; save PDF 7.187/5.271; save ulang 5.253/3.609; Bank Kasus 4.194/2.166. Sampel terbatas, bukan p95.
Profil akhir mengukur full summary 468 entri (467 roster + 1 sintetis), reset handle spreadsheet per logical request, dan gasMs mencakup finally: summary 1.640 ms fresh/129 cache; detail sintetis 1.393/138; presensi 678/125; save sintetis 1.512 ms route/1.511 GAS, 3 bacaan Sheets. Metrik dan cakupan berubah dari profil lama sehingga tidak boleh dipakai sebagai klaim persentase percepatan UI.
404 ContentService belum dinyatakan selesai: run ini berhasil, tetapi kegagalan sebelumnya masih diketahui dan retry GET tetap best-effort. Tidak ada tes browser offline nyata atau load ratusan pengguna. Tidak ada bukti seluruh aplikasi bebas semua kemungkinan bug. Paket produksi 10 Oktober belum mencakup perubahan ini dan perlu diperbarui sebelum proposal rilis.

## Putaran akhir: respons save hilang
Critic mereproduksi status lama kembali setelah server sudah commit tetapi respons gagal, lalu pengguna berpindah kelas. Frontend kini meminta data otoritatif dengan `fresh=true` saat pindah kelas setelah kegagalan save. Jika refresh ikut gagal, loaded key dihapus dan tombol Simpan tetap disabled dengan pesan error; refresh berhasil memulihkan status dan tautan bukti server. Retry langsung di kelas yang sama tetap mempertahankan draft. Tes regresi mencakup commit IZIN+bukti, respons gagal, refresh gagal, refresh ulang berhasil, lalu save tanpa upload ulang.
Perbandingan buta A/B di atas mendahului patch akhir ini; patch akhir diperiksa critic frontend secara terpisah. Fresh GET hanya menjamin rekonsiliasi write yang sudah commit; timeout ketika write masih berjalan dapat berlomba dengan GET dan belum diuji sebagai jaminan transaksi menyeluruh.

## Putaran transport 404 dan timeout write — 11 Oktober 2026

### Analisis dan urutan Gauntlet
1. Pisahkan 404 deployment URL langsung dari 404 sesudah ContentService redirect; catat status/host/redirect tanpa token atau query sensitif. Jangan retry semua error.
2. Pertahankan retry GET satu kali hanya untuk 404 final pada URL sekali-pakai `script.googleusercontent.com`; POST tetap single-attempt.
3. Setelah save berstatus ambigu, bekukan perubahan roster dan simpan payload untuk retry yang sama. Rekonsiliasi memakai GET fresh yang menunggu ScriptLock write; gagal lock berarti gagal tertutup, bukan memakai snapshot stale.
4. Uji kasus identik pada baseline dan kandidat, lanjutkan build/lint/typecheck, lalu uji HTTP di spreadsheet TEST dengan NIS sintetis.
5. Bersihkan data uji dan endpoint sementara, pulihkan deployment TEST bersih, dan uji lagi bahwa endpoint QA tidak dapat dipanggil. Produksi tidak masuk eksperimen.

### Mengapa 404 belum punya akar penyebab definitif
Riwayat runner menyimpan `GET GAS gagal HTTP 404` (v16), tetapi tidak merekam apakah status berasal dari URL `/exec` atau dari URL akhir sesudah redirect. Apps Script ContentService memang mengalihkan output ke URL `script.googleusercontent.com` sekali-pakai; ini membuat 404 target redirect yang usang/gagal diikuti menjadi kandidat penyebab, tetapi bukti lama tidak cukup untuk memastikan itulah kejadian yang terjadi. Retry GET generik sebelumnya juga tidak mencegahnya. Dokumentasi resmi: [Apps Script Content Service](https://developers.google.com/apps-script/guides/content).

### Perubahan dan verifikasi
- Frontend GET memakai `cache: no-store`, mencatat action/status/host/redirect/durasi secara tersanitasi, dan hanya mengulang sekali bila respons sudah redirect dan host akhirnya `script.googleusercontent.com` dengan HTTP 404. Deployment URL langsung 404, 403, network error, serta semua POST tidak diulang.
- Backend fresh GET `getAttendancePageData` sekarang mengambil ScriptLock yang sama dengan write. Frontend membekukan perubahan status/bukti ketika save timeout, menyediakan pemeriksaan fresh, dan retry menggunakan payload identik.
- Baseline-vs-kandidat: tes API/lock/keadaan ambigu yang sama gagal pada baseline dan lulus kandidat. Kandidat akhir: `npm test` 9/9, typecheck lulus, static build TEST 10 rute lulus, syntax GAS/runner dan diff check lulus. Lint 0 error, 13 warning lama. Next.js memperingatkan dukungan React 18 akan dihapus pada Next 17.
- GAS TEST: backend sumber bersih dengan lock barrier aktif di Web App v27. Uji v26 sementara menunggu lock sebelum save selama 4 detik; client fetch timeout pada 700 ms, server melanjutkan dan commit satu baris SAKIT, GET fresh menunggu 4.554 ms pada lock (7.170 ms total) dan mengembalikan tepat satu baris. Uji ini membuktikan server request berlanjut setelah client timeout untuk kasus lock yang sudah diambil.
- Regresi live di v24: gauntlet 15 checks, regression 26 checks, format 7, retry tanpa duplikasi, 3 kelas/3 pengguna/6 request menghasilkan tepat 3 log, serta profil GAS/Sheets PASS. Profil sampel: summary fresh/cache 1.641/134 ms; detail 1.827/129 ms; attendance page 975/120 ms; save 2.214 ms route. Bukan benchmark p95 atau klaim percepatan.
- GET anonim ke deployment bersih v27: 20/20 menghasilkan HTTP 200, redirect ke `script.googleusercontent.com`, payload aplikasi `UNAUTHORIZED`. Ini smoke test transport terbatas; 404 historis tidak terulang dalam sampel ini, tidak membuktikan tidak akan terjadi lagi.
- Cleanup live PASS: dua pupil sintetis dihapus, 10 cek memastikan tak ada roster/log/kasus/alert/arsip uji, token API logout dan file sementara dihapus. Deployment akhir v27 tanpa hook QA; `getQaResult`/`runTestSuite` terautentikasi kembali menjawab `Action tidak dikenali.`

### Batas dan keputusan
Retry bersyarat adalah pemulihan sementara, bukan penghilangan gangguan 404. Jika 404 berulang, ambil diagnostik `[BK_API]` (hanya host/status/redirect) dan Apps Script Executions; jika direct `/exec` konsisten 404, periksa deployment/akses/URL, bukan retry. Untuk menghilangkan ketergantungan redirect ContentService, tahap arsitektur berikutnya ialah API stabil (mis. Cloud Run/Functions) dengan CORS, autentikasi, dan secret yang dirancang tersendiri.

Fresh GET menunggu penulis GAS yang sudah mengambil ScriptLock; penulis di luar script (edit manual Sheet atau integrasi lain) tidak termasuk. Uji live memberi jeda di dalam handler setelah lock diperoleh, lalu memastikan commit sesudah client timeout. Belum disimulasikan pembatalan jaringan nyata di browser atau beban banyak ratusan pengguna. Produksi/GitHub tidak diubah.

## Revalidasi rilis — 11 Oktober 2026

- Bar tetap pilihan pengguna: versi worktree harus mempertahankan semua perilaku yang lulus dan menang dari baseline pada tes bug/ukuran setara. Dua critic independen (frontend dan backend/rilis) memberi verdict kandidat menang atas `main`; keduanya tidak mengubah source.
- Re-run lokal: `npm test` 9/9 suite; `npm run typecheck` lulus; `npm run lint` 0 error/13 warning; build static dengan URL Pages produksi lulus 10 rute. CI PR #1 run `38111680877` lulus build; deploy dilewati karena PR masih Draft. `git diff --check origin/main...HEAD` lulus sebelum pembaruan checklist ini.
- Build menargetkan `NEXT_PUBLIC_GAS_API_URL` yang tersimpan di GitHub; nilai cocok dengan deployment GAS v29. Kandidat tetap di PR #1 Draft, commit source `15f0ca6`.
- Backup produksi baca-saja dibuat ulang ke folder privat pada 11:38 WIB: spreadsheet XLSX 966.847 byte, SHA-256 `0e16c316a24519fdd7f8f0f5ac72b2f076a9147543da23a32a17b8d13a57e238`, dan source GAS deployment v29 beserta manifest. File/folder berizin 0600/0700; isi sheet tidak dibaca ke laporan. Script Properties menunjukkan `SPREADSHEET_ID` ada dan cocok, `AUTH_SALT` belum ada.
- Audit API deployment produksi menemukan 19 deployment versi Web App anonim dan satu `@HEAD`. Backup map privat menyimpan semua ID/versi pra-cutover. Source kandidat di-push dan dibuat menjadi versi v30, lalu semua 19 deployment tetap diperbarui ke v30 untuk mempertahankan URL; tidak ada deployment yang dihapus. Smoke GET/POST anonim di tiap URL menghasilkan 38/38 `UNAUTHORIZED`, tanpa baca roster atau penulisan data bisnis.
- Repository publik lain yang diperiksa: `presensi-ortu` membaca spreadsheet lewat GViz langsung dan tidak memakai URL GAS itu; tiga repo presensi lain yang terlihat juga tidak mereferensikan deployment GAS project ini. Ini mengurangi risiko integrasi lama yang diketahui, bukan bukti bahwa tak ada konsumen privat.
- GAS produksi kini menjalankan kandidat v30. PR #1 sudah merge ke `main` dan Pages deploy `38112923925` sukses; halaman live membuka login. Owner belum melakukan login produksi dan pembacaan roster read-only. 404 ContentService tidak muncul pada 38 smoke cutover ini, tetapi akar gangguan intermiten sebelumnya belum terbukti selesai.

## Gauntlet final TEST — 11 Oktober 2026

Bar: kandidat mempertahankan perilaku worktree baseline dan menang lewat defect test serta ukuran langsung yang setara. Dua critic mereproduksi kasus ID kosong dan balasan sesi lama; builder memperbaiki sumber bersama serta fixture. Critic buta baru menjalankan file A/B dengan tes sama: A lulus seluruh 3 file, B gagal seluruh 3 file; A dipilih berdasarkan parity kasus, isolasi sesi, dan tidak adanya HTTP ulang saat detail masih valid. Pengujian cache mencakup TTL, refresh, stale response, dan kegagalan yang tidak boleh dicache.

GAS hanya di TEST v33; source produksi/Pages tidak dikirim ulang. Sebelum deploy TEST, source remote dicocokkan byte-for-byte dengan baseline v32 dan disalin sebagai rollback. Ukuran aplikasi langsung: HTTP/GAS di [BK_PERF], UI melalui [BK_UI], sehingga waktu pengamat tidak masuk timer. Ringkasan 467 siswa tetap utuh. Dua masalah nyata telah diperbaiki tanpa migrasi kolom/data.

12 GET terautentikasi (summary/detail, 3 cold + 3 warm per jenis) pada TEST v33 lulus HTTP200 dan parity hasil. Tidak ada 404/timeout pada sampel ini. Sesi uji CLI di-logout. Batas 404 tetap pemulihan aman yang dapat diuji, bukan janji layanan Google tidak akan gagal lagi. Tidak perlu mengulang fault injection writer di produksi; barrier write/read tidak berubah dari uji TEST live yang sudah tercatat.

A/B browser desktop selesai: baseline warm event-ke-render [2174,1811,2233]ms, kandidat [324,192,195]ms. Median2174→195ms (-91,0%) untuk buka ulang dalam30s; baseline3HTTP, kandidat0HTTP. Data/viewport1280x900/GASv33 sama. Kandidat dikembalikan ke source aktif sesudah baseline lokal sementara. Satu request setelah TTL habis membuktikan expiry; refresh eksplisit juga mengambil data baru dan membuang cache. Pembukaan dingin tetap3–5s pada sampel; ini batas arsitektur/performa yang masih ada, bukan hasil benchmark alat AX. Tidak mengklaim 404 upstream hilang.
