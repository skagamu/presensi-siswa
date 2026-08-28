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
import { AlertTriangle, RefreshCw, ArrowRight, Printer } from "lucide-react";
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
    const notes = (document.getElementById(`notes-${idPeringatan}`) as HTMLTextAreaElement).value;

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Semua Antrean Alert</h1>
          <p className="text-muted-foreground mt-1 text-sm">Daftar lengkap seluruh siswa yang membutuhkan intervensi BK.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={isFetching} className="gap-2 hidden md:flex h-9 border-gray-200">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="bg-white border sm:border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* HEADER DIV */}
        <div className="bg-white border-b border-gray-200 p-4 sm:px-6 sm:py-5 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-bold leading-none flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500"/> Daftar Lengkap Peringatan Aktif</h3>
            <p className="text-sm text-gray-500 mt-1">Menampilkan {alerts.length} kasus belum tertangani.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={isFetching} className="md:hidden h-8 w-8 p-0 border-gray-200">
             <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* CONTENT DIV */}
        <div className="flex-1 overflow-x-auto min-h-[400px]">
          <Table className="text-sm">
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center border-r border-gray-200 font-semibold">No</TableHead>
                <TableHead className="min-w-[200px] border-r border-gray-200 font-semibold">Nama Siswa</TableHead>
                <TableHead className="text-center border-r border-gray-200 font-semibold">Total Absen</TableHead>
                <TableHead className="text-center border-r border-gray-200 font-semibold">Level Kasus</TableHead>
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
                         <div className="text-[11px] text-gray-500 mt-0.5">{alert.kelas} • NIS {alert.nis}</div>
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-md border ${isCritical ? 'text-red-700 bg-red-50 border-red-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>
                          {alert.totalHariAbsen} Hari
                        </span>
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200">
                         <Badge variant="outline" className={`font-semibold bg-white ${isCritical ? 'border-red-300 text-red-700' : 'border-orange-300 text-orange-700'}`}>
                           Level {alert.tingkatKumulatif}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                         <Dialog>
                          <DialogTrigger >
                            <Button size="sm" className={`h-8 px-3 gap-1.5 shadow-sm text-xs font-semibold ${isCritical ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-primary text-white'}`}>
                              Selesaikan <ArrowRight className="w-3 h-3"/>
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
                              <DialogFooter><Button type="submit" disabled={isUploading === alert.idPeringatan} className="w-full sm:w-auto">{isUploading === alert.idPeringatan ? "Mengunggah..." : "Submit & Tutup Kasus"}</Button></DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
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
