"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, Clock, BookOpen, AlertTriangle } from "lucide-react";
import { getLogPresensi, LogPresensi } from "@/lib/api";

const STATUS_CONFIG = {
  HADIR: { label: "Hadir", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle, iconColor: "text-green-500" },
  SAKIT: { label: "Sakit", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock, iconColor: "text-blue-500" },
  IZIN:  { label: "Izin",  color: "bg-amber-100 text-amber-800 border-amber-200", icon: BookOpen, iconColor: "text-amber-500" },
  ALPHA: { label: "Alpha", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle, iconColor: "text-red-500" },
} as const;

export default function PortalOrtuPage() {
  const [nis, setNis] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // yyyy-mm
  const [logs, setLogs] = useState<LogPresensi[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCari = async (e: React.FormEvent) => {
    e.preventDefault();
    const nisClean = nis.trim();
    if (!nisClean) return toast.error("Masukkan NIS siswa.");

    setIsLoading(true);
    setLogs(null);
    try {
      const res = await getLogPresensi({ nis: nisClean, date: month });
      if (res.status === "success" && res.data) {
        if (res.data.length === 0) {
          toast.info("Tidak ada data presensi ditemukan untuk bulan ini.");
        }
        setLogs(res.data);
      } else {
        toast.error("Gagal mengambil data: " + (res.message || ""));
      }
    } catch (err) {
      toast.error("Koneksi gagal. Coba beberapa saat lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const summary = logs ? logs.reduce(
    (acc, l) => { acc[l.status_presensi] = (acc[l.status_presensi] || 0) + 1; return acc; },
    {} as Record<string, number>
  ) : null;

  const siswaInfo = logs && logs.length > 0 ? logs[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-950 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">BK</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-950 leading-none">Portal Orang Tua</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">SMK Gajah Mungkur 1 Wuryantoro</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* INTRO CARD */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-blue-900 mb-1">Cek Presensi Putra/Putri Anda</h2>
          <p className="text-xs text-blue-700 leading-relaxed">
            Masukkan Nomor Induk Siswa (NIS) dan pilih bulan untuk melihat rekap kehadiran. Data diperbarui secara real-time dari sistem presensi sekolah.
          </p>
        </div>

        {/* FORM PENCARIAN */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <form onSubmit={handleCari} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nomor Induk Siswa (NIS)</label>
              <Input
                value={nis}
                onChange={e => setNis(e.target.value)}
                placeholder="Contoh: 1234567890"
                className="h-11 text-sm font-medium"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Bulan</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold gap-2" disabled={isLoading}>
              <Search className="w-4 h-4" />
              {isLoading ? "Mencari..." : "Cari Data Presensi"}
            </Button>
          </form>
        </div>

        {/* HASIL */}
        {logs !== null && (
          <>
            {/* INFO SISWA */}
            {siswaInfo && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                    {siswaInfo.nama.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{siswaInfo.nama}</div>
                    <div className="text-xs text-gray-500 mt-0.5">NIS: {siswaInfo.nis} · Kelas {siswaInfo.kelas}</div>
                  </div>
                </div>
              </div>
            )}

            {/* RINGKASAN STATISTIK */}
            {summary && (
              <div className="grid grid-cols-4 gap-2">
                {(["HADIR", "SAKIT", "IZIN", "ALPHA"] as const).map(status => {
                  const cfg = STATUS_CONFIG[status];
                  const count = summary[status] || 0;
                  return (
                    <div key={status} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
                      <div className={`text-[10px] font-semibold mb-1 ${cfg.iconColor}`}>{cfg.label}</div>
                      <div className={`text-2xl font-black ${status === "HADIR" ? "text-green-600" : status === "SAKIT" ? "text-blue-600" : status === "IZIN" ? "text-amber-600" : "text-red-600"}`}>
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PERINGATAN ALPHA */}
            {summary && (summary["ALPHA"] || 0) >= 3 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-red-900">Perhatian!</div>
                  <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                    Tercatat {summary["ALPHA"]} hari alpha bulan ini. Siswa berpotensi mendapatkan peringatan BK. Harap hubungi pihak sekolah untuk klarifikasi.
                  </p>
                </div>
              </div>
            )}

            {/* TABEL DETAIL */}
            {logs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
                <p className="text-sm text-gray-500">Tidak ada data presensi untuk periode ini.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Detail Presensi Harian</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{logs.length} hari tercatat</p>
                </div>
                {/* Mobile */}
                <div className="md:hidden divide-y divide-gray-100">
                  {logs.map(log => {
                    const cfg = STATUS_CONFIG[log.status_presensi] || STATUS_CONFIG.HADIR;
                    return (
                      <div key={log.id_presensi} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{log.tanggal}</div>
                          {log.ada_surat_dokter && (
                            <div className="text-[10px] text-blue-600 font-medium mt-0.5">✓ Ada Surat Dokter</div>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-xs font-bold ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                {/* Desktop */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold pl-4">Tanggal</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                        <TableHead className="text-xs font-semibold">Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map(log => {
                        const cfg = STATUS_CONFIG[log.status_presensi] || STATUS_CONFIG.HADIR;
                        return (
                          <TableRow key={log.id_presensi} className="hover:bg-gray-50/50">
                            <TableCell className="pl-4 font-mono text-sm text-gray-700">{log.tanggal}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`text-xs font-bold ${cfg.color}`}>
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {log.ada_surat_dokter && <span className="text-blue-600 font-medium">✓ Ada Surat Dokter</span>}
                              {log.link_bukti_izin && log.link_bukti_izin.startsWith("http") && (
                                <a href={log.link_bukti_izin} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 underline text-[11px]">Lihat Bukti</a>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}

        {/* FOOTER */}
        <div className="text-center pt-4 pb-8">
          <p className="text-[11px] text-gray-400">
            Data presensi dikelola oleh Guru BK SMK Gajah Mungkur 1 Wuryantoro.<br />
            Pertanyaan? Hubungi sekolah di jam kerja.
          </p>
        </div>
      </div>
    </div>
  );
}
