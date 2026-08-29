"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Calendar, AlertTriangle, CheckCircle, Clock, ExternalLink, FileText, Eye, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface LogPresensiItem {
  tanggal: string;
  status: string;
  adaSurat: boolean;
  linkBukti?: string;
}

export interface KasusItem {
  tanggal: string;
  pelanggaran: string;
}

export interface PenyelesaianItem {
  tanggal: string;
  tindakan: string;
  guru: string;
  linkPdf?: string;
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  if (!siswa) return null;

  const totalAbsen = siswa.totalAlpha + siswa.totalSakit + siswa.totalIzin;

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("drive.google.com/file/d/")) {
      return url.replace(/\/view.*$/, "/preview");
    }
    return url;
  };

  const handleOpenPreview = (url: string, title: string) => {
    setPreviewUrl(getEmbedUrl(url));
    setPreviewTitle(title);
  };

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
              <div className="py-8 text-center text-xs text-gray-500">Tidak ada riwayat presensi/absen tercatat.</div>
            ) : (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold w-28">Tanggal</TableHead>
                      <TableHead className="text-xs font-semibold w-24">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Keterangan / Dokumen</TableHead>
                      <TableHead className="text-xs font-semibold w-28 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siswa.logs.map((item, i) => {
                      const isAlpha = item.status === "ALPHA" || item.status === "A";
                      const isSakit = item.status === "SAKIT" || item.status === "S";
                      const isIzin = item.status === "IZIN" || item.status === "I";

                      return (
                        <TableRow key={i} className="text-xs">
                          <TableCell className="font-mono text-gray-600">{item.tanggal}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                isAlpha
                                  ? "bg-red-50 text-red-700 border-red-200 font-bold"
                                  : isSakit
                                  ? "bg-amber-50 text-amber-700 border-amber-200 font-bold"
                                  : isIzin
                                  ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                                  : "bg-gray-50 text-gray-700"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {isSakit && (
                              <span className={item.adaSurat ? "text-emerald-700 font-medium" : "text-amber-700"}>
                                {item.adaSurat ? "✓ Ber-surat Dokter" : "Tanpa Surat Dokter"}
                              </span>
                            )}
                            {isIzin && (
                              <span className={item.adaSurat ? "text-emerald-700 font-medium" : "text-blue-700"}>
                                {item.adaSurat ? "✓ Ada Surat Izin" : "Izin Lisan/Pesan"}
                              </span>
                            )}
                            {isAlpha && <span className="text-red-600 font-medium">Tanpa Keterangan</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.linkBukti && item.linkBukti.startsWith("http") ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPreview(item.linkBukti!, `Bukti Presensi - ${siswa.nama} (${item.tanggal})`)}
                                  className="h-6 px-2 text-[11px] font-semibold gap-1 text-orange-700 bg-orange-50/50 border-orange-200 hover:bg-orange-100"
                                >
                                  <Eye className="w-3 h-3" /> Preview
                                </Button>
                                <a
                                  href={item.linkBukti}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-gray-500 hover:text-orange-600 inline-flex items-center"
                                  title="Buka Tab Baru"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px] italic">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                    {item.linkPdf && item.linkPdf.startsWith("http") && (
                      <div className="pt-1 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPreview(item.linkPdf!, `Bukti Kasus - ${item.tindakan}`)}
                          className="h-6 px-2 text-[11px] font-semibold gap-1 text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100"
                        >
                          <Eye className="w-3 h-3" /> Preview Berkas
                        </Button>
                        <a
                          href={item.linkPdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-gray-500 hover:text-blue-600 flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-3 h-3" /> Buka di Drive
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      
        {/* MODAL PREVIEW BUKTI */}
        <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
          <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden flex flex-col bg-slate-900 border-slate-800 rounded-2xl [&>button]:hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2 text-xs font-semibold truncate pr-4">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{previewTitle || "Preview Berkas"}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {previewUrl && (
                  <a
                    href={previewUrl.replace("/preview", "/view")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold px-2 py-1 rounded bg-blue-950/50 border border-blue-800/60"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition active:scale-95 border border-slate-700"
                  title="Tutup Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Iframe Body */}
            <div className="flex-1 w-full h-full bg-slate-100 relative">
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-none"
                  title="Dokumen Bukti"
                  allow="autoplay"
                />
              )}
            </div>

            {/* Modal Footer Close Button (Sesuai Desain Ortu) */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <X className="w-4 h-4" /> Tutup Pratinjau
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
