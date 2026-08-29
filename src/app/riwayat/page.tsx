"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileCheck, Search, X, RefreshCw, ExternalLink, Calendar, User, Eye, FileText } from "lucide-react";

interface RiwayatKasus {
  tanggal: string;
  nis: string;
  nama: string;
  kelas: string;
  tindakan: string;
  linkPdf?: string;
  guruBK: string;
  waktuSelesai: string;
}

export default function RiwayatPage() {
  const [historyList, setHistoryList] = useState<RiwayatKasus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKelas, setSelectedKelas] = useState<string>("SEMUA");
  const [selectedGuru, setSelectedGuru] = useState<string>("SEMUA");

  // Modal Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=PenyelesaianKasus&_v=${Date.now()}`;
      const res = await fetch(url);
      const text = await res.text();
      const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
      if (match && match[1]) {
        const json = JSON.parse(match[1]);
        const rows = json.table.rows || [];
        const parsed: RiwayatKasus[] = [];
        rows.forEach((r: any) => {
          const c = r.c;
          if (c && c[1]) {
            parsed.push({
              tanggal: c[1]?.f || c[1]?.v || "",
              nis: String(c[2]?.v || "").trim(),
              nama: String(c[3]?.v || "").trim(),
              kelas: String(c[4]?.v || "").trim(),
              tindakan: String(c[5]?.v || "").trim(),
              linkPdf: c[6]?.v ? String(c[6].v).trim() : undefined,
              guruBK: String(c[7]?.v || "").trim(),
              waktuSelesai: c[8]?.f || c[8]?.v || "",
            });
          }
        });
        parsed.reverse();
        setHistoryList(parsed);
      }
    } catch (err) {
      console.error("Gagal load data penyelesaian:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const listKelas = useMemo(() => {
    const setK = new Set<string>();
    historyList.forEach((h) => {
      if (h.kelas) setK.add(h.kelas);
    });
    return Array.from(setK).sort();
  }, [historyList]);

  const listGuru = useMemo(() => {
    const setG = new Set<string>();
    historyList.forEach((h) => {
      if (h.guruBK) setG.add(h.guruBK);
    });
    return Array.from(setG).sort();
  }, [historyList]);

  const filteredList = useMemo(() => {
    return historyList.filter((item) => {
      const matchKelas = selectedKelas === "SEMUA" || item.kelas === selectedKelas;
      const matchGuru = selectedGuru === "SEMUA" || item.guruBK === selectedGuru;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        item.nama.toLowerCase().includes(q) ||
        item.nis.includes(q) ||
        item.tindakan.toLowerCase().includes(q) ||
        item.kelas.toLowerCase().includes(q);

      return matchKelas && matchGuru && matchSearch;
    });
  }, [historyList, selectedKelas, selectedGuru, searchQuery]);

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
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-emerald-600" />
            Riwayat Penanganan
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Arsip dokumen dan catatan tindakan kasus siswa yang telah diselesaikan oleh Guru BK.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          disabled={isLoading}
          className="border-gray-300 text-gray-700 hover:bg-gray-100 self-start sm:self-auto h-9"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Cari nama, NIS, tindakan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-gray-50/50 border-gray-200 rounded-lg h-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={selectedKelas} onValueChange={setSelectedKelas}>
            <SelectTrigger className="w-[140px] text-xs h-9 bg-gray-50/50 border-gray-200">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Kelas</SelectItem>
              {listKelas.map((k) => (
                <SelectItem key={k} value={k}>
                  Kelas {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGuru} onValueChange={setSelectedGuru}>
            <SelectTrigger className="w-[160px] text-xs h-9 bg-gray-50/50 border-gray-200">
              <SelectValue placeholder="Semua Guru BK" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Guru BK</SelectItem>
              {listGuru.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* MOBILE VIEW */}
        <div className="block md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">Memuat riwayat...</div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">Tidak ada riwayat ditemukan.</div>
          ) : (
            filteredList.map((h, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {h.tanggal}
                  </span>
                  <Badge variant="secondary" className="font-bold text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200">
                    {h.kelas}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{h.nama}</h4>
                  <p className="text-xs text-gray-500 font-mono">NIS: {h.nis}</p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Tindakan / Solusi</span>
                  <p className="font-medium text-gray-800">{h.tindakan}</p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="w-3 h-3" /> {h.guruBK}
                  </span>
                  {h.linkPdf && h.linkPdf.startsWith("http") ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPreview(h.linkPdf!, `Dokumen Kasus - ${h.nama} (${h.tanggal})`)}
                        className="h-7 px-2.5 text-xs font-semibold gap-1 text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </Button>
                      <a
                        href={h.linkPdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Tanpa Dokumen</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-28 pl-6 text-xs font-semibold">Tanggal</TableHead>
                <TableHead className="w-28 text-xs font-semibold">NIS</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Nama Siswa</TableHead>
                <TableHead className="w-24 text-center text-xs font-semibold">Kelas</TableHead>
                <TableHead className="min-w-[220px] text-xs font-semibold">Tindakan Penyelesaian</TableHead>
                <TableHead className="w-36 text-center text-xs font-semibold">Dokumen</TableHead>
                <TableHead className="w-36 text-xs font-semibold">Guru BK</TableHead>
                <TableHead className="w-36 text-right pr-6 text-xs font-semibold">Waktu Selesai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-gray-500 text-xs">
                    Memuat riwayat penyelesaian kasus...
                  </TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-gray-500 text-xs">
                    Tidak ada arsip riwayat penanganan kasus.
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((h, i) => (
                  <TableRow key={i} className="hover:bg-gray-50/80">
                    <TableCell className="pl-6 font-mono text-xs text-gray-600">{h.tanggal}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">{h.nis}</TableCell>
                    <TableCell className="font-bold text-xs text-gray-900">{h.nama}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold text-xs bg-gray-100 text-gray-800">
                        {h.kelas}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-800 font-medium">{h.tindakan}</TableCell>
                    <TableCell className="text-center">
                      {h.linkPdf && h.linkPdf.startsWith("http") ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPreview(h.linkPdf!, `Dokumen Kasus - ${h.nama} (${h.tanggal})`)}
                            className="h-7 px-2 text-xs font-semibold gap-1 text-blue-700 bg-blue-50/50 border-blue-200 hover:bg-blue-100"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview
                          </Button>
                          <a
                            href={h.linkPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-blue-600 inline-flex items-center"
                            title="Buka Langsung di Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Tanpa Berkas</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-700 font-medium">{h.guruBK}</TableCell>
                    <TableCell className="text-right pr-6 text-xs font-medium text-gray-500">{String(h.waktuSelesai).substring(0, 16)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* MODAL PREVIEW DOKUMEN */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden flex flex-col bg-slate-900 border-slate-800 rounded-2xl [&>button]:hidden">
          {/* Modal Header */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold truncate pr-4">
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">{previewTitle || "Preview Berkas Bukti"}</span>
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

          {/* Modal Footer Close Button */}
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
    </div>
  );
}
