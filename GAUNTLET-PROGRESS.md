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
