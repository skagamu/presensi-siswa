# Presensi Siswa BK

Aplikasi internal Guru BK berbasis Next.js static export, Google Apps Script, Google Sheets dan Drive. Produksi memakai GitHub Pages; development saat ini memakai backend TEST spreadsheet salinan.

**Lanjutkan sesi/harness dari HANDOFF.md.** Prompt siap-tempel: PROMPT-SESI-BARU.md. Handoff 10 Oktober 2026 merupakan acuan terbaru atas laporan historis.

```bash
npm ci
npm run dev:test
```

Buka http://localhost:3001/presensi-siswa. Server TEST mungkin sudah aktif; cek port sebelum menjalankan proses kedua.

```bash
npm test
npm run typecheck
npm run lint
npm run build:test
```

.env.example hanya berisi URL TEST dan dapat disalin menjadi .env.local. Jangan menyalin token/password/OAuth ke repository. Baca HANDOFF.md sebelum push GAS: konfigurasi clasp_backend/.clasp.json mengarah ke script lama/produksi; target TEST tersedia di handoff/gas-test.

Portal orang tua tidak termasuk aplikasi ini; dikelola di repo terpisah. Hasil browser terakhir ada di UI-VERIFICATION-2026-10-10.md. Pemuatan data/detil masih memerlukan optimasi; produksi belum diperbarui.
