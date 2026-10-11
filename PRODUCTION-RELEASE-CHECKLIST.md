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

## A. Sebelum rilis

- [ ] **Branch dan commit** — tinjau seluruh diff, commit terpilih sama dengan yang sudah diuji; working tree bersih.
- [ ] **Pasangan frontend/backend** — catat kedua versi yang kompatibel. Frontend harus dibangun dengan `NEXT_PUBLIC_GAS_API_URL` produksi; jangan memakai `build:test`.
- [ ] **GitHub Pages** — pastikan secret/variable `NEXT_PUBLIC_GAS_API_URL` di repository menunjuk endpoint produksi yang benar. Push/merge ke `main` memicu workflow deploy otomatis; tinjau Actions sebelum merge.
- [ ] **GAS** — pastikan project/script ID dan Script Property `SPREADSHEET_ID` menunjuk produksi yang benar; deployment memakai Web App yang benar dan akses/execute-as sesuai konfigurasi yang disetujui.
- [ ] **Tidak ada harness uji** — source produksi tidak memuat `runTestSuite`, `getQaResult`, fault injection, NIS sintetis, atau `test_delay_ms`.
- [ ] **Backup baru** — buat snapshot baca-saja spreadsheet produksi dan source GAS aktif; verifikasi file dapat dibaca, ukuran/hash tercatat, serta lokasi privat dan izin akses terbatas. Jangan menganggap backup lama sebagai backup rilis ini.
- [ ] **Rollback** — simpan artifact Pages sebelumnya dan catat versi GAS produksi sebelumnya. Uji langkah rollback pada salinan; pahami bahwa rollback kode tidak membatalkan data yang sudah ditulis.
- [ ] **Gerbang CI kandidat** — GitHub Actions lulus `npm ci`, `npm run typecheck`, `npm test`, `npm run lint`, dan build static menggunakan URL produksi. Warning lint/Next yang disetujui dicatat; tidak ada error.
- [ ] **Gerbang TEST kandidat** — hasil Gauntlet dan regresi TEST yang dirujuk di [GAUNTLET-PROGRESS.md](GAUNTLET-PROGRESS.md) masih sesuai commit rilis; tidak ada perubahan kode sesudah validasi.

**Stop rilis** bila endpoint, script ID, spreadsheet target, pasangan versi, backup, atau rollback belum dapat dipastikan.

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
