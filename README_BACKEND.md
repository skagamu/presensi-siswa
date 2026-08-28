# Instruksi Pemasangan Backend Google Apps Script (GAS)

1. Buka File Google Spreadsheet Anda (`DB_PRESENSI_SISWA_BK`).
2. Pastikan sudah ada tab sheet persis bernama: 
   - `LogPresensi`
   - `PeringatanKasus`
   - `PenyelesaianKasus`
3. Buka menu **Extensions (Ekstensi) > Apps Script**.
4. Hapus semua kode bawaan yang ada di editor, lalu copy-paste seluruh isi dari file `Backend_GAS_Code.gs`.
5. Simpan (Save) proyek tersebut.
6. Klik **Deploy > New deployment**.
7. Klik icon roda gigi di sebelah "Select type", pilih **Web app**.
8. Konfigurasi Web App:
   - Execute as: **Me (Email-Mu)**
   - Who has access: **Anyone**
9. Klik **Deploy**. (Jika diminta otorisasi akun Google / peringatan aplikasi tidak aman, klik Advanced > Go to (unsafe) lalu Allow).
10. Akan muncul **Web app URL** (berawalan `https://script.google.com/macros/s/....`).
11. Jika URL tersebut *berbeda* dengan yang kamu berikan sebelumnya, salin URL baru tersebut dan paste ke file `src/lib/api.ts` di folder projek Next.js ini.
