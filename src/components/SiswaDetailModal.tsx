"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export interface LogPresensiItem {
  tanggal: string;
  status: string;
  adaSurat: boolean;
}

export interface KasusItem {
  tanggal: string;
  pelanggaran: string;
}

export interface PenyelesaianItem {
  tanggal: string;
  tindakan: string;
  guru: string;
}

export interface SiswaDetailData {
  nis: string;
  nama: string;
  kelas: string;
  tingkat?: string;
  totalAlpha: number;
  totalSakit: number;
  totalIzin: number;
  totalPelanggaran: number;
  logs: LogPresensiItem[];
  kasus: KasusItem[];
  penyelesaian: PenyelesaianItem[];
}

interface SiswaDetailModalProps {
  siswa: SiswaDetailData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SiswaDetailModal({ siswa, isOpen, onClose }: SiswaDetailModalProps) {
  if (!siswa) return null;

  const totalAbsen = siswa.totalAlpha + siswa.totalSakit + siswa.totalIzin;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white">
        <DialogHeader className="space-y-2 border-b border-gray-100 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-950 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-700" />
                {siswa.nama}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500 mt-1">
                NIS: <span className="font-mono font-semibold text-gray-800">{siswa.nis}</span> • Kelas:{" "}
                <Badge variant="outline" className="font-bold text-gray-900 border-gray-300">
                  {siswa.kelas}
                </Badge>
              </DialogDescription>
            </div>
          </div>

          {/* SUMMARY BADGES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="bg-red-50 border border-red-200 rounded-md p-2 text-center">
              <span className="text-[10px] uppercase font-bold text-red-600">Alpha</span>
              <p className="text-lg font-black text-red-950">{siswa.totalAlpha}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-600">Sakit</span>
              <p className="text-lg font-black text-amber-950">{siswa.totalSakit}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-600">Izin</span>
              <p className="text-lg font-black text-blue-950">{siswa.totalIzin}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-md p-2 text-center">
              <span className="text-[10px] uppercase font-bold text-orange-600">Pelanggaran</span>
              <p className="text-lg font-black text-orange-950">{siswa.totalPelanggaran}</p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="presensi" className="w-full pt-2">
          <TabsList className="grid grid-cols-3 w-full bg-gray-100 p-1">
            <TabsTrigger value="presensi" className="text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Presensi ({siswa.logs.length})
            </TabsTrigger>
            <TabsTrigger value="kasus" className="text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
              Pelanggaran ({siswa.kasus.length})
            </TabsTrigger>
            <TabsTrigger value="tindakan" className="text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Penyelesaian ({siswa.penyelesaian.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: LOG PRESENSI */}
          <TabsContent value="presensi" className="mt-3">
            {siswa.logs.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">Tidak ada riwayat ketidakhadiran tercatat.</div>
            ) : (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold w-32">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold w-28">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siswa.logs.map((log, i) => (
                      <TableRow key={i} className="text-xs">
                        <TableCell className="font-mono text-gray-600">{log.tanggal}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              log.status === "ALPHA"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : log.status === "SAKIT"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {log.adaSurat ? "Ada Surat Dokter / Bukti" : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: PELANGGARAN BANK KASUS */}
          <TabsContent value="kasus" className="mt-3">
            {siswa.kasus.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">Tidak ada catatan pelanggaran kedisiplinan.</div>
            ) : (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold w-32">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold">Jenis Pelanggaran</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siswa.kasus.map((item, i) => (
                      <TableRow key={i} className="text-xs">
                        <TableCell className="font-mono text-gray-600">{item.tanggal}</TableCell>
                        <TableCell className="font-medium text-gray-900">{item.pelanggaran}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: PENYELESAIAN KASUS */}
          <TabsContent value="tindakan" className="mt-3">
            {siswa.penyelesaian.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">Belum ada riwayat penanganan/tutup kasus.</div>
            ) : (
              <div className="space-y-2">
                {siswa.penyelesaian.map((item, i) => (
                  <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs space-y-1">
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.tanggal}
                      </span>
                      <span className="font-medium text-gray-700">Oleh: {item.guru}</span>
                    </div>
                    <p className="text-gray-900 font-semibold">{item.tindakan}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
