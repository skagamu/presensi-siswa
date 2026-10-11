# Gauntlet final TEST — 11 Oktober 2026

## Overview dan alur
Baseline adalah worktree sebelum iterasi ini. Kandidat mempertahankan fungsi lulus, memperbaiki ketidaksamaan summary/detail kasus serta respons sesi lama, dan menyediakan bukti timing langsung dari aplikasi. Batas selesai: regresi/build/typecheck lulus; critic memilih kandidat atas baseline; roster TEST sama; HTTP/GAS dan klik-ke-paint diukur dari log aplikasi; kegagalan 404 memiliki pemulihan terbatas serta error yang aman; hasil timeout/write yang masih berjalan diverifikasi dari bukti TEST. Produksi tidak menjadi target tes tulis atau deployment iterasi ini.

## Skema Sheets
Tidak ada migrasi. Siswa_X/XI/XII: A no:number, B kelas:string, C nis:string, D nama:string. BankKasus: A id_kasus:string, B tanggal:date, C nis:string, D nama:string, E kelas:string, F jenis_pelanggaran:string, G waktu_simpan:timestamp. Ringkasan hanya menghitung baris dengan ID seperti detail. LogPresensi dan schema lain dipertahankan.

## Komponen
Gunakan Button/Table/Dialog/Select/Input yang ada. Tidak ada komponen atau dependency baru. Instrumentasi development hanya mencatat durasi/action/count, tanpa identitas atau token.

## Eksekusi dan gerbang
1. Simpan baseline; critics mereproduksi defect, builder memperbaiki dengan regression test.
2. Typecheck, regresi, static build dan review diff. Push GAS hanya ke Script ID TEST yang sudah disetujui, simpan versi sebelumnya untuk rollback.
3. Browser TEST terautentikasi: roster, summary/detail, cold/warm HTTP/GAS/paint, overlay, recovery. Gunakan log aplikasi, bukan waktu alat observasi.
4. Kritikus membandingkan artefak A/B tanpa label, pastikan candidate wins lewat defect test dan tidak ada regresi.
5. Rekonsiliasi dokumen status dan paket kandidat; commit lokal. Rilis produksi merupakan tahap terpisah setelah hasil ditinjau.

404 layanan Google tidak bisa dijamin tidak akan muncul lagi oleh tes finite. Gerbang yang dapat diuji adalah klasifikasi/pemulihan aman, keterlihatan kegagalan, dan integritas mutasi saat respons hilang.

## Cache detail
Detail berhasil disimpan hanya dalam instance halaman selama 30 detik (sama dengan TTL backend). Klik ulang memakai hasil itu; Segarkan Data membuang seluruh cache dan halaman lain/unmount membuang instance. Respons stale/gagal tidak boleh mengisi cache. Tidak disimpan di localStorage. Perubahan dari pengguna lain dapat tertunda maksimal 30 detik pada klik ulang; refresh manual langsung memintas cache lokal.
