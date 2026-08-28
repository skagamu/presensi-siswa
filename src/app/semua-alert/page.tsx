"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, ArrowRight, Printer, UploadCloud } from "lucide-react";
import { fetchGasApi } from "@/lib/api";

interface AlertData { idPeringatan: string; nis: string; nama: string; kelas: string; tingkatKumulatif: number; totalHariAbsen: number; status: string; waktuDibuat: string; }

export default function SemuaAlertPage() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  const fetchAlerts = async () => {
    setIsFetching(true);
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=PeringatanKasus&_v=${new Date().getTime()}`;
      const res = await fetch(gvizUrl, { mode: 'cors', credentials: 'omit' });
      const text = await res.text();
      const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
      
      if (jsonMatch && jsonMatch[1]) {
        const json = JSON.parse(jsonMatch[1]);
        const rows = json.table.rows;
        let activeAlerts: AlertData[] = [];
        
        rows.forEach((row: any) => {
          const c = row.c;
          if (c && c[0] && c[6] && c[6].v === "AKTIF") {
            activeAlerts.push({
              idPeringatan: c[0].v, nis: c[1] ? c[1].v.toString() : "", nama: c[2] ? c[2].v : "", kelas: c[3] ? c[3].v : "",
              tingkatKumulatif: c[4] ? Number(c[4].v) : 0, totalHariAbsen: c[5] ? Number(c[5].v) : 0, status: c[6].v, waktuDibuat: c[7] ? c[7].f || c[7].v : ""
            });
          }
        });
        
        activeAlerts.sort((a, b) => b.tingkatKumulatif - a.tingkatKumulatif);
        setAlerts(activeAlerts);
      }
    } catch (err) {
      toast.error("Gagal menarik data antrean.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleUploadResolution = async (idPeringatan: string, e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(idPeringatan);
    const notes = (e.currentTarget.querySelector("textarea") as HTMLTextAreaElement | null)?.value || "";

    try {
      const res = await fetchGasApi("resolveCase", { id_peringatan: idPeringatan, catatan_konseling: notes || "Diselesaikan", ditangani_oleh: "Guru BK", fileName: "bukti.pdf", pdfBase64: "dummy" });
      if (res.status === "success") {
        toast.success("Dokumen berhasil diunggah! Kasus ditutup.");
        setAlerts(alerts.filter(a => a.idPeringatan !== idPeringatan));
      } else { toast.error("Gagal resolve: " + res.message); }
    } catch (error) { toast.error("Gagal mengirim perintah resolusi."); } 
    finally { setIsUploading(null); }
  };

  const getTindakanInfo = (tingkat: number) => {
    switch (tingkat) { case 1: return "Teguran Lisan / SP 1"; case 2: return "Home Visit / Ortu"; case 3: return "Skorsing / Konferensi"; case 4: return "Sidang Akhir DO"; default: return ""; }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Semua Antrean Alert</h1>
          <p className="text-muted-foreground mt-1 text-sm">Daftar lengkap seluruh siswa yang membutuhkan intervensi BK.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={isFetching} className="gap-2 hidden md:flex h-9 rounded-md border-gray-200 bg-white shadow-sm">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col">
        {/* HEADER DIV */}
        <div className="bg-white border-b border-gray-200 p-4 sm:px-6 sm:py-5 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold leading-none flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500"/> Daftar Lengkap Peringatan Aktif</h3>
            <p className="text-sm text-gray-500 mt-1">Menampilkan {alerts.length} kasus belum tertangani.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={isFetching} className="md:hidden h-8 w-8 p-0 border-gray-200">
             <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* CONTENT DIV */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100 min-h-[320px]">
          {isFetching ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Mencari data ke database...</div>
          ) : alerts.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm font-medium text-green-600">Antrean Peringatan Kosong. Semua selesai!</div>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.tingkatKumulatif >= 3;
              return (
                <div key={alert.idPeringatan} className={`p-4 space-y-3 border-l-[4px] ${isCritical ? "border-l-red-500 bg-red-50/20" : "border-l-orange-400 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-950 leading-snug">{alert.nama}</div>
                      <div className="mt-1 text-[11px] text-gray-500">{alert.kelas}</div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 whitespace-nowrap bg-white ${isCritical ? 'border-red-300 text-red-700' : 'border-orange-300 text-orange-700'}`}>Level {alert.tingkatKumulatif}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex min-w-[72px] justify-center whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-bold ${isCritical ? 'text-red-700 bg-red-50 border-red-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>{alert.totalHariAbsen} Hari</span>
                    <span className="text-[11px] text-gray-500 truncate">{getTindakanInfo(alert.tingkatKumulatif)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="h-9 rounded-md text-xs"><Printer className="mr-1.5 h-3.5 w-3.5" />Surat</Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className={`h-9 rounded-md text-xs ${isCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>Upload Bukti</Button>
                      </DialogTrigger>
                      <DialogContent className="bottom-0 top-auto translate-y-0 rounded-b-none sm:top-1/2 sm:translate-y-[-50%] sm:rounded-md sm:max-w-md">
                        <form onSubmit={(e) => handleUploadResolution(alert.idPeringatan, e)}>
                          <DialogHeader><DialogTitle>Selesaikan Kasus - {alert.nama}</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="p-3 bg-gray-50 text-gray-700 text-sm rounded-md border"><p>Rekomendasi: <strong>{getTindakanInfo(alert.tingkatKumulatif)}</strong>.</p></div>
                            <div className="space-y-2 pt-2"><Label htmlFor={`file-mobile-${alert.idPeringatan}`}>Upload File Bukti (.pdf)</Label><Input id={`file-mobile-${alert.idPeringatan}`} type="file" accept=".pdf" /></div>
                            <div className="space-y-2"><Label htmlFor={`notes-mobile-${alert.idPeringatan}`}>Catatan Tindakan</Label><Textarea id={`notes-mobile-${alert.idPeringatan}`} placeholder="Tuliskan hasil intervensi..." required /></div>
                          </div>
                          <DialogFooter><Button type="submit" disabled={isUploading === alert.idPeringatan} className="w-full font-semibold">{isUploading === alert.idPeringatan ? "Mengunggah..." : "Submit & Tutup Kasus"}</Button></DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block flex-1 overflow-x-auto min-h-[400px]">
          <Table className="min-w-[760px] text-sm">
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[40px] text-center border-r border-gray-200 font-semibold">No</TableHead>
                <TableHead className="min-w-[200px] border-r border-gray-200 font-semibold">Nama Siswa</TableHead>
                <TableHead className="min-w-[120px] text-center border-r border-gray-200 font-semibold whitespace-nowrap">Total Absen</TableHead>
                <TableHead className="min-w-[120px] text-center border-r border-gray-200 font-semibold whitespace-nowrap">Level Kasus</TableHead>
                <TableHead className="text-right pr-6 font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground">Mencari data ke database...</TableCell></TableRow>
              ) : alerts.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-green-600 font-medium">Antrean Peringatan Kosong. Semua selesai!</TableCell></TableRow>
              ) : (
                alerts.map((alert, idx) => {
                  const isCritical = alert.tingkatKumulatif >= 3;
                  return (
                    <TableRow key={alert.idPeringatan} className={isCritical ? "bg-red-50/20" : "hover:bg-gray-50/50"}>
                      <TableCell className="text-center text-muted-foreground font-medium border-r border-gray-200">{idx + 1}</TableCell>
                      <TableCell className="border-r border-gray-200">
                         <div className="font-semibold text-gray-900">{alert.nama}</div>
                         <div className="text-[11px] text-gray-500 mt-0.5">{alert.kelas}</div>
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200 whitespace-nowrap">
                        <span className={`inline-flex min-w-[72px] justify-center whitespace-nowrap text-[11px] font-bold px-2 py-1 rounded-md border ${isCritical ? 'text-red-700 bg-red-50 border-red-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>
                          {alert.totalHariAbsen} Hari
                        </span>
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200 whitespace-nowrap">
                         <Badge variant="outline" className={`min-w-[70px] justify-center whitespace-nowrap font-semibold bg-white ${isCritical ? 'border-red-300 text-red-700' : 'border-orange-300 text-orange-700'}`}>
                           Level {alert.tingkatKumulatif}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                           <Button variant="outline" size="sm" className="h-8 px-3 gap-1.5 text-gray-700 border-gray-200 rounded-md text-xs">
                             <Printer className="w-3.5 h-3.5 hidden sm:block" /><span>Print Surat Tugas</span>
                           </Button>

                           <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className={`h-8 px-3 gap-1.5 font-semibold rounded-md text-xs ${isCritical ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}>
                                <span className="hidden sm:inline">Upload Bukti Tindakan</span>
                                <span className="sm:hidden">Selesaikan</span>
                                <ArrowRight className="w-3 h-3"/>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <form onSubmit={(e) => handleUploadResolution(alert.idPeringatan, e)}>
                                <DialogHeader><DialogTitle>Selesaikan Kasus - {alert.nama}</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="p-3 bg-gray-50 text-gray-700 text-sm rounded-md border flex flex-col gap-2">
                                    <p>Rekomendasi: <strong>{getTindakanInfo(alert.tingkatKumulatif)}</strong>.</p>
                                    <Button variant="outline" size="sm" type="button" className="w-fit h-8 text-xs gap-2"><Printer className="w-3 h-3" /> Print Surat Tugas</Button>
                                  </div>
                                  <div className="space-y-2 pt-2"><Label htmlFor="file">Upload File Bukti (.pdf)</Label><Input id="file" type="file" accept=".pdf" /></div>
                                  <div className="space-y-2"><Label htmlFor={`notes-${alert.idPeringatan}`}>Catatan Tindakan</Label><Textarea id={`notes-${alert.idPeringatan}`} placeholder="Tuliskan hasil intervensi..." required /></div>
                                </div>
                                <DialogFooter><Button type="submit" disabled={isUploading === alert.idPeringatan} className="w-full sm:w-auto font-semibold">{isUploading === alert.idPeringatan ? "Mengunggah..." : "Submit & Tutup Kasus"}</Button></DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
