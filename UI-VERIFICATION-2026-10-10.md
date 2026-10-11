# Verifikasi UI live — 10 Oktober 2026

Lingkungan: localhost:3001 dari worktree presensi-repairs, backend Google TEST v6, spreadsheet salinan 16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ. Browser in-app dengan sesi BK aktif, viewport normal sekitar 510 × 980. Data roster nyata; direktori berisi 467 entri termasuk kelas uji yang sudah ada. Tidak membuat fixture, menyimpan absensi, atau mengubah spreadsheet.

## Overlay detail: PASS
- Overlay menutupi seluruh viewport; screenshot lokal /tmp/presensi-overlay-verifikasi.png.
- Tab: fokus tetap di dialog.
- Escape selama request: overlay tetap terbuka.
- Klik area navigasi di belakang overlay: tetap loading dan URL tetap /siswa.
- Setelah request selesai: overlay diganti detail yang sesuai, modal dapat ditutup dan halaman dapat dipakai kembali.
- Overlay terlihat pada pengamatan pertama setelah klik (~0,7 detik termasuk overhead kontrol browser; bukan waktu render yang diinstrumentasi).

## Waktu sampai UI siap
Pengukuran wall-clock dalam satu rangkaian kontrol browser, dari aksi hingga accessibility tree menunjukkan kontrol siap. Termasuk overhead input dan observasi otomasi; bukan profil jaringan atau pengukuran performance.now pada frame. Sampel kecil tidak menetapkan SLA/p95 atau beban banyak pengguna.

| Skenario | Sampel (detik) | Median |
|---|---|---|
| Refresh direktori 467 entri | 7,374 / 5,964 / 7,238 | 7,238 |
| Detail satu siswa nyata (3 kali) | 5,280 / 5,107 / 5,279 | 5,279 |
| Presensi X AK, setelah tanggal sekolah diubah | 3,044 | — |
| Berpindah tingkat ke XI, kelas XI AK | 5,565 | — |
| Berpindah kelas XI AK → XI BD | 2,413 | — |

Roster presensi: 6 siswa X AK, 9 XI AK, 15 XI BD terlihat; tombol simpan aktif setelah sinkronisasi. Tanggal 2026-10-09. Tombol simpan tidak diklik. Pengukuran X AK memakai roster tingkat yang sudah dimuat; perpindahan ke XI mencakup pengambilan roster tingkat serta log kelas; XI BD hanya pindah kelas.

Sampel antar-call dengan jeda penalaran, transisi animasi modal, dan percobaan pengisian tanggal melalui locator yang belum mengubah state React dikecualikan dari tabel. Tanggal akhirnya dipilih lewat keyboard native dan diverifikasi UI sebelum pengukuran.

## Kesimpulan
Interaksi overlay dan pemuatan roster nyata: PASS. Latensi telah diverifikasi; pemuatan direktori/detail masih terasa lambat (sekitar 5–7 detik), sehingga belum dinyatakan memenuhi target performa. Waktu menyimpan absensi, kondisi error jaringan live, desktop lebar, dan banyak pengguna tidak diuji dalam sesi ini.

## Pengukuran ulang setelah perbaikan cache — 12:40 WIB

Backend TEST v12 dan source frontend terbaru, sesi TEST aktif, roster tetap 467 entri. Summary awal memuat 467 siswa. Wall-clock dan profil authenticated:

| Aksi | HTTP total | GAS | Baca Sheets | Cache |
|---|---:|---:|---:|---|
| Direktori summary dingin | 4,063 ms | 2,524 ms | 5 pembacaan / 1,208 ms | miss |
| Detail dingin, roster yang sama | 3,895 ms | 2,154 ms | 4 pembacaan / 1,533 ms | miss |
| Detail yang sama dibuka kembali | 1,499 ms | 137 ms | 0 | hit |

Pengukuran paint detail masing-masing 4,267 ms dan 1,910 ms. Response profile hanya berisi durasi/jumlah operasi, tanpa identitas/token. Cache detail memakai TTL 30 detik; tombol refresh melewati cache. UI langsung menutup interaksi dengan overlay selagi request dingin berlangsung. Latensi cold masih nyata dan metrik ini satu run, bukan p95/SLA.

Versi backend TEST yang aktif dipulihkan ke source bersih 12 setelah runner QA sementara dihapus. Produksi tidak ditulis.
