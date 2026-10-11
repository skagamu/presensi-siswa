# Hasil pengujian — diperbarui 11 Oktober 2026

## Perubahan performa — 11 Oktober 2026

- Frontend Presensi kini memuat roster tingkat dan log tanggal dalam satu GET gabungan; pindah kelas hanya memfilter data yang sudah dimuat.
- GET gabungan memakai cache 30 detik, dicek setelah autentikasi, terpisah per spreadsheet/revisi/tingkat/tanggal, dan invalidasi setelah operasi tulis. Tanggal akhir pekan melewati pembacaan log.
- Profil save mencatat antrean lock, baca/tulis log presensi, sinkronisasi alert, serta baca/tulis alert. Logger frontend development menyertakan waktu HTTP dan metrik GAS tanpa token atau identitas.
- Web App TEST aktif v17 dengan optimasi rekonsiliasi alert. Retry runner v16 750 ms tetap gagal HTTP 404 pada GET gabungan; retry browser tetap best-effort dan POST tidak retry otomatis.
- Validasi lokal terbaru: `npm test` 7/7, `npm run typecheck`, `npm run build:test` (10 rute), lint file API, dan pemeriksaan sintaks runner lulus. Profil GAS langsung sudah dijalankan sebelum/sesudah optimasi; satu sampel pascaedit lebih lambat pada semua aksi, hasil browser/E2E dan peningkatan aktual belum terbukti.
- Produksi tidak disentuh. Perubahan worktree terbaru belum di-commit.

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
- Pembaruan 10 Oktober 21:44 WIB: runner utama pada project Apps Script TEST (`1-NpiLFz...84fkH`) dan spreadsheet salinan (`16-zovx...7YRQ`) **PASS 26 checks**, eksekusi selesai, 32.259 detik. Percobaan pertama menemukan assertion runner yang terlalu mengharuskan apostrof tersimpan sebagai karakter; assertion diperbaiki agar memeriksa nilai literal dan memastikan sel tidak berisi formula. Enam save sakit 1.996–3.251 detik; save ulang 2.760 detik; koreksi HADIR 2.684 detik; save bank kasus 1.217 detik dan retry 1.231 detik; detail direktori 1.718 detik; ringkasan 1.048 detik. Pengukuran ini memanggil route GAS langsung di runner, bukan waktu browser/network deployment. Runner menuntaskan `finally` cleanup sebelum melaporkan PASS; spreadsheet yang diverifikasi adalah salinan TEST, produksi tidak disentuh.
- Pembaruan 10 Oktober 23:00 WIB: localhost dashboard dari worktree menampilkan 467 siswa dan metrik akhir pekan “—”. Server `:3001` terbukti berjalan dari worktree; chunk frontend berisi URL deployment TEST. Saat route Presensi dibuka ulang, sesi lokal tidak tersedia dan aplikasi mengalihkan ke login. GET anonim pada URL deployment TEST **PASS** dengan `UNAUTHORIZED` (1.742 detik). Tes autentikasi browser dan runner URL terotentikasi (`runCopyConcurrencyRegression`/profil) belum selesai: Apps Script UI berpindah dari kontrol saat navigasi, sedangkan `clasp run` gagal `NOT_FOUND`. Jangan klaim hasil runner internal sebagai E2E URL.
- Pembaruan 10 Oktober 23:10 WIB: tes terotentikasi melalui URL deployment TEST v14 **PASS**. `runCopyConcurrencyRegression`: 2 save bersamaan menghasilkan 1 log akhir dan 20 percobaan login bersamaan dibatasi menjadi 10; `runCopyRetryRegression`: POST ulang tidak menggandakan log dan koreksi HADIR menghapus log; `runCopyMultiClassRegression`: 3 kelas/3 sesi/6 request menghasilkan tepat 3 log; seluruh runner menjalankan cleanup pada data sintetis. `runCopyPerformanceProfile` memakai satu siswa sintetis: summary baru 2.713 dtk HTTP / 1.399 dtk GAS / 647 ms baca Sheets / 3 baca; summary cache 1.105 dtk HTTP / 72 ms GAS / 0 baca; detail baru 3.031 dtk HTTP / 1.631 dtk GAS / 1.119 ms baca / 4 baca; detail cache 1.586 dtk HTTP / 271 ms GAS / 0 baca. Retry runner dibatasi klaimnya ke pengiriman ulang berurutan; fault kehilangan respons setelah commit tidak diuji lewat endpoint ini. UI browser terautentikasi tetap belum diuji karena sesi localhost mengarah ke login.
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
# 11 Oktober 2026 — ContentService 404 dan retry baca

- Runner `runCopyPerformanceProfile` TEST v15 gagal di GET `getAttendancePageData` (ManualTest.gs:245), setelah mulai dan masuk tahap profiling presensi. `finally` runner menghapus baris siswa sintetis dan sesi sebelum keluar; request simpan belum dijalankan.
- Deployment TEST terkonfirmasi v15, dan URL `/exec` tetap aktif (GET tanpa sesi menjawab 200 `UNAUTHORIZED`; aksi profil tanpa sesi juga menjawab 200 `UNAUTHORIZED`). Ini belum membuktikan request berautentikasi berhasil.
- Firecrawl menemukan [Google Issue Tracker #541915738](https://issuetracker.google.com/issues/541915738): laporan intermiten sejak Agustus 2026 bahwa ContentService dapat mengembalikan 302 lalu URL echo `script.googleusercontent.com` menjawab 404 walau eksekusi GAS selesai. Laporan 21 Sep dan 8 Okt menyebut gejala berlanjut; retry GET ke URL `/exec` baru setelah jeda pernah memulihkan request. Ini temuan infrastruktur yang konsisten dengan log, bukan bukti bahwa Google sudah mengonfirmasi atau memperbaiki insiden.
- Mitigasi: `gasGet` frontend dan GET profil runner mencoba lagi sekali setelah 750 ms hanya bila status 404. Tidak ada retry otomatis untuk POST karena respons dapat hilang setelah mutasi terjadi.
- GAS TEST diperbarui ke deployment **v16** (`TEST retry GAS ContentService 404 reads`). Validasi sesudah perubahan: `npm test` 7/7, `npm run typecheck`, `npm run build:test`, lint `src/lib/api.ts`, pemeriksaan sintaks runner, dan `git diff --check` lulus.
- Source HEAD TEST sekarang memiliki runner `runCopyPerformanceProfile` yang memanggil `route()` langsung untuk mengisolasi waktu GAS/Sheets dari redirect ContentService. Sudah di-push ke project Apps Script TEST tanpa membuat deployment baru; Web App tetap v16. Hasil live PASS dilaporkan 11 Okt 01:41 WIB dan rinciannya di bawah. Ini tidak mengukur HTTP/browser dan tidak menyelesaikan 404 delivery.


## Pembaruan setelah screenshot runner 404 — 11 Oktober 2026

- `runCopyPerformanceProfile` deployment v16 juga gagal `GET GAS gagal HTTP 404` pada `fetchRead`; retry sekali sesudah 750 ms tidak mengatasi gangguan. Karena itu, retry client bukan solusi yang terjamin.
- Runner TEST diubah agar pemanggilan profil memakai `route()` langsung (bypass HTTP redirect) dan mencatat `routeMs` beserta profil internal GAS/Sheets. Runner tetap membuat/menghapus siswa sintetis dan membersihkan log/alert di `finally`.
- Versi runner baru sudah di-push ke Apps Script TEST HEAD. Deployment Web App masih v16; `clasp deployments` sesudah push mengonfirmasi deployment TEST tetap v16. Produksi tidak disentuh.
- Validasi lokal: sintaks runner dan `npm test` (7/7) lulus; `git diff --check` lulus. Profil route tidak mengukur delivery HTTP atau latensi browser.
- Tindak lanjut untuk 404 yang dialami pengguna: retry GET sekali tetap dapat dipakai sebagai pemulihan sementara. Solusi yang menghilangkan ketergantungan pada redirect ContentService memerlukan penggantian host API (misalnya Cloud Run/Functions) dan penyesuaian CORS/auth; perubahan infrastruktur itu belum dilakukan.

- Hasil live `runCopyPerformanceProfile` (Apps Script TEST HEAD, 11 Okt 01:41 WIB): summary 1.106 ms fresh (3 baca Sheets, 543 ms) vs 126 ms cache (0 baca); detail 1.068 ms fresh (4 baca, 625 ms) vs 132 ms cache; presensi gabungan 779 ms fresh (2 baca, 414 ms) vs 126 ms cache. Cache mengurangi waktu request sekitar 88–84% pada sampel ini. Save sintetis 2.542 ms total route / 2.407 ms GAS: tunggu lock 63 ms, baca Sheets 112 ms, baca alert 302 ms, sinkronisasi alert 489 ms, tulis presensi 4 ms dan alert 1 ms. Koreksi interpretasi: sinkronisasi alert 489 ms (~20% GAS) sudah mencakup baca alert 302 ms, sehingga keduanya tidak boleh dijumlahkan, namun sisa waktu belum dijelaskan metrik komponen. Profil hanya satu run serial pada siswa sintetis di spreadsheet TEST; bukan latensi HTTP/browser atau jaminan performa produksi.


## Optimasi simpan alert — 11 Oktober 2026

- Baseline runner live sebelum edit: simpan 2.542 ms route (2.407 ms GAS); baca alert 302 ms dan rekonsiliasi alert 489 ms.
- Rekonsiliasi kini membentuk indeks alert selesai/aktif per NIS-level dan memproses baris alert sekali; menghapus pemindaian berulang pada daftar hasil untuk setiap siswa/level. Aturan akademik, prioritas maksimum, deduplikasi, dan alert yang sudah selesai dipertahankan.
- Regresi backend lokal mencakup ambang tahun ajaran, koreksi HADIR, alert selesai duplikat, retry setelah write alert gagal, dan sinkronisasi kumulatif; 7/7 suite tes, typecheck, sintaks GAS, dan `git diff --check` lulus.
- Source dipush ke project Apps Script TEST dan deployment diperbarui ke v17. GET tanpa sesi merespons HTTP 200 `UNAUTHORIZED`. Produksi tidak disentuh.
- Profil pascaoptimasi (11 Okt 01:45 WIB): summary 2.897 ms fresh/440 cache; detail 1.961/342; presensi gabungan 1.216/387; save 3.401 ms route/2.862 ms GAS. Semua nilai lebih tinggi dari sampel 01:41, termasuk cache hits tanpa baca Sheets; save naik 34%, alertRead 462 ms, alertSync 710 ms. Satu sampel per jenis tidak membedakan variansi runtime Google dari dampak kode. Optimasi belum terbukti bermanfaat dan belum layak diklaim sebagai penurunan latensi; ukur ulang beberapa kali dengan runner sama sebelum memutuskan mempertahankan atau membatalkan perubahan.
- Pengukuran tersebut hanya route GAS langsung, bukan HTTP/browser atau beban seluruh roster.

- Sampel live kedua pascaoptimasi (11 Okt 01:47 WIB): summary 2.454 ms fresh/346 cache; detail 2.715/353; presensi gabungan 1.346/397; save 4.133 ms route/3.831 ms GAS. Save: lock 183 ms, baca log 244 ms, baca alert 839 ms, sync 1.174 ms, write presensi 13 ms, write alert 1 ms. Cache hits tanpa baca Sheets ikut 344–397 ms, memperkuat dugaan runtime/layanan melambat. Dua sampel belum cukup memisahkan variasi GAS dari dampak algoritme; profil ketiga masih dibutuhkan untuk median.

- Sampel ketiga live pascaoptimasi (11 Okt 01:49 WIB): summary fresh/cache 1.494/122 ms; detail 1.085/134 ms; presensi gabungan 680/116 ms; save 2.408 ms route/2.293 ms GAS (lock 89 ms, baca log 174 ms, alertRead 411 ms, alertSync 553 ms).
- Median tiga sampel pascaoptimasi: summary fresh/cache 2.454/346 ms; detail 1.961/342 ms; presensi fresh/cache 1.216/387 ms; save 3.401 ms route dan 2.862 ms GAS. Rentang save 2.408–4.133 ms, sedangkan cache presensi 116–397 ms. Satu baseline praedit: save 2.542 ms route, cache presensi 126 ms. Karena sebelum edit hanya satu pengukuran dan latensi v17 berfluktuasi, data ini tidak cukup untuk menyimpulkan algoritme mempercepat atau memperlambat. Klaim kinerja optimasi: belum terbukti.


## Gauntlet — bukti akhir 11 Oktober 2026

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
