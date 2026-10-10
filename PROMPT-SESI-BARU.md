Lanjutkan proyek Presensi Siswa BK dari folder:
/Users/burhanyudha/.codex/worktrees/presensi-repairs/Presensi Siswa BK

Baca AGENTS.md, HANDOFF.md, dan UI-VERIFICATION-2026-10-10.md terlebih dahulu. HANDOFF.md adalah status terbaru; dokumen lain berisi sejarah. Verifikasi cwd, branch codex/presensi-repairs, perubahan lokal/untracked, server port 3001, dan endpoint TEST sebelum mengedit. Banyak perbaikan belum di-commit; jangan reset/clean atau berasumsi clone GitHub berisi semua perubahan. Jangan memakai folder Google Drive/Documents atau menggabungkan patch delay 120ms dari salinan yang salah.

Jalankan/lanjutkan dengan npm run dev:test. Semua pekerjaan eksternal memakai spreadsheet salinan dan script TEST yang ID-nya ada di HANDOFF.md. File clasp_backend/.clasp.json bukan target TEST; gunakan konfigurasi handoff/gas-test. Produksi belum diizinkan deploy. Portal orang tua telah dihapus karena berada di repo lain; jangan buat lagi.

Tugas selanjutnya: perbaiki latensi yang masih lambat dengan profiling terlebih dahulu. Baseline browser nyata: direktori 467 siswa ~6–7,4 detik; detail ~5,1–5,3 detik; presensi X AK 3,0 detik, pindah tingkat XI AK 5,6 detik, pindah kelas XI BD 2,4 detik. Overlay fullscreen sudah lulus browser (focus trap, blokir klik/Tab/Escape) dan harus dipertahankan. Sampel mengandung overhead otomasi; pisahkan jaringan/GAS/Sheets/render sebelum optimasi. Data lama/response race dan save sebelum sinkronisasi tidak boleh muncul. Waktu simpan, offline live, serta load banyak pengguna belum terukur.

Aturan: sakit bersurat tetap satu hari; alert tahun ajaran; sekolah Senin–Jumat; Sabtu/Minggu hanya pesan pengganti roster; bukti format umum divalidasi backend. Gunakan perubahan minimum dengan gaya ponytail. npm test, npm run typecheck, npm run lint, dan npm run build:test tersedia. Tes, build, dan verifikasi fungsi terbaru lulus; performa belum selesai. Pertahankan seluruh edit yang ada dan laporkan bukti serta batas hasil, bukan persentase asumsi.

Jika memakai snapshot di komputer lain, folder root adalah lokasi ekstraksi snapshot; npm ci terlebih dahulu. Kredensial/sesi browser/clasp tidak disertakan; login normal menggunakan akun pengguna bila diperlukan. Jangan mengambil kredensial dari source/log atau membuat password dummy.
