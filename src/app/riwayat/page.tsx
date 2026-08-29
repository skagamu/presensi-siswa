"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, FileText, RefreshCw, Eye, ExternalLink } from "lucide-react";

export default function RiwayatPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

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

  const fetchHistory = async () => {
    setIsFetching(true);
    try {
      const gvizUrlHistory = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=PenyelesaianKasus&_v=${new Date().getTime()}`;
      const resHistory = await fetch(gvizUrlHistory);
      const textHistory = await resHistory.text();
      const jsonMatchHistory = textHistory.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
      if (jsonMatchHistory && jsonMatchHistory[1]) {
        const json = JSON.parse(jsonMatchHistory[1]);
        const rows = json.table.rows;
        let historyData: any[] = [];
        rows.forEach((row: any) => {
          const c = row.c;
          if(c && c[0]) {
             historyData.push({
               idPenyelesaian: c[0].v, idPeringatan: c[1]?.v, nis: c[2]?.v, nama: c[3]?.v, kelas: c[4]?.v, 
               linkPdf: c[5]?.v, catatan: c[6]?.v, guru: c[7]?.v, waktuSelesai: c[8]?.f || c[8]?.v
             });
          }
        });
        setHistory(historyData.reverse()); 
      }
    } catch (err) {
      console.error("Gagal menarik data.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Riwayat Kasus Selesai</h1>
          <p className="text-muted-foreground mt-1 text-sm">Arsip penanganan kasus dan bukti fisik dokumen.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isFetching} className="gap-2 hidden md:flex h-9 rounded-md border-gray-200 bg-white shadow-sm">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col">
        {/* HEADER DIV */}
        <div className="bg-white border-b border-gray-200 p-4 sm:px-6 sm:py-5 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold leading-none flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500"/> Arsip Penyelesaian Kasus</h3>
            <p className="text-sm text-gray-500 mt-1">Menampilkan {history.length} kasus yang berhasil ditutup.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isFetching} className="md:hidden h-8 w-8 p-0 border-gray-200">
             <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* MOBILE CONTENT */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100 min-h-[320px]">
          {isFetching ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Mencari data arsip...</div>
          ) : history.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Belum ada kasus yang diselesaikan.</div>
          ) : (
            history.map((h) => (
              <div key={h.idPenyelesaian} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-950 leading-snug">{h.nama}</div>
                    <div className="mt-1 text-[11px] text-gray-500">{h.kelas}</div>
                  </div>
                  <div className="shrink-0 text-[11px] font-medium text-gray-500">{String(h.waktuSelesai).substring(0, 16)}</div>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">{h.catatan}</div>
                {h.linkPdf && String(h.linkPdf).startsWith("http") ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPreview(h.linkPdf, `Bukti Kasus - ${h.nama} (${h.kelas})`)}
                      className="flex-1 h-9 items-center justify-center gap-1.5 text-xs font-semibold rounded-md border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview Berkas
                    </Button>
                    <a
                      href={h.linkPdf}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 px-3 items-center justify-center gap-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Drive
                    </a>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Tidak ada berkas</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block flex-1 overflow-x-auto min-h-[400px]">
          <Table className="text-sm">
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center border-r border-gray-200 font-semibold">No</TableHead>
                <TableHead className="min-w-[180px] border-r border-gray-200 font-semibold">Identitas Siswa</TableHead>
                <TableHead className="min-w-[250px] border-r border-gray-200 font-semibold">Catatan Tindakan</TableHead>
                <TableHead className="text-center w-[180px] border-r border-gray-200 font-semibold">Bukti Fisik</TableHead>
                <TableHead className="text-right pr-6 w-[150px] font-semibold">Waktu Penutupan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground">Mencari data arsip...</TableCell></TableRow>
              ) : history.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground">Belum ada kasus yang diselesaikan.</TableCell></TableRow>
              ) : (
                history.map((h, idx) => (
                  <TableRow key={h.idPenyelesaian} className="hover:bg-gray-50/50">
                    <TableCell className="text-center text-muted-foreground font-medium border-r border-gray-200">{idx + 1}</TableCell>
                    <TableCell className="border-r border-gray-200">
                       <div className="font-semibold text-gray-900">{h.nama}</div>
                       <div className="text-[11px] text-gray-500 mt-0.5">{h.kelas}</div>
                    </TableCell>
                    <TableCell className="border-r border-gray-200">
                       <div className="text-xs text-gray-700 font-medium">"{h.catatan}"</div>
                       <div className="text-[10px] text-gray-400 mt-1">Ditangani: {h.guru}</div>
                    </TableCell>
                    <TableCell className="text-center border-r border-gray-200">
                       {h.linkPdf && String(h.linkPdf).startsWith("http") ? (
                         <div className="flex items-center justify-center gap-1.5">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleOpenPreview(h.linkPdf, `Bukti Kasus - ${h.nama} (${h.kelas})`)}
                             className="h-8 px-2.5 text-xs font-semibold rounded-md border border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 transition-colors gap-1.5"
                           >
                             <Eye className="w-3.5 h-3.5"/> Preview
                           </Button>
                           <a
                             href={h.linkPdf}
                             target="_blank"
                             rel="noreferrer"
                             title="Buka langsung di Google Drive"
                             className="inline-flex items-center justify-center h-8 px-2 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                           >
                             <ExternalLink className="w-3.5 h-3.5"/>
                           </a>
                         </div>
                       ) : (
                         <span className="text-xs text-gray-400 italic">-</span>
                       )}
                    </TableCell>
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
        <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden flex flex-col bg-gray-900 border-gray-800">
          <div className="px-4 py-3 bg-gray-950 border-b border-gray-800 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold truncate pr-4">
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">{previewTitle || "Preview Berkas Bukti"}</span>
            </div>
            {previewUrl && (
              <a
                href={previewUrl.replace("/preview", "/view")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0 mr-6"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
              </a>
            )}
          </div>
          <div className="flex-1 w-full h-full bg-gray-100 relative">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full border-none"
                title="Dokumen Bukti"
                allow="autoplay"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
