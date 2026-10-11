# Optimasi simpan presensi TEST

Alur: roster -> ubah status/bukti -> simpan -> konfirmasi backend. Simpan ulang tetap masuk backend untuk memvalidasi data terbaru dan memperbaiki alert tertunda. Baris absen yang identik mempertahankan waktu simpan terakhir yang mengubah data; koreksi dan unggahan baru tetap memperbaruinya.

Schema tetap: LogPresensi (id:string, tanggal:date, nis:string, nama:string, kelas:string, status:string, dokter:boolean, bukti:string, waktu:timestamp). Roster dan schema alert tidak berubah.

Komponen UI tetap: Table, Select, Button, Dialog, Input, Checkbox; semuanya sudah tersedia. Tidak ada komponen/dependency baru.

Validasi: unit regresi timestamp/no-op/koreksi dan alert retry; TypeScript/static TEST build; perbandingan baseline/kandidat berulang melalui URL GAS TEST dengan fixture 30 siswa yang sama. Cleanup harus mengembalikan hash sheet awal. Produksi tidak disentuh. Perubahan diterima sebagai percepatan hanya bila pengukuran setara mendukungnya.
