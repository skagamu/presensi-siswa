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
import { AlertTriangle, FileDown, RefreshCw, ArrowRight } from "lucide-react";
import { getPeringatanKasus, resolveCase, PeringatanKasus } from "@/lib/api";
import { fileToBase64, validateFile, ACCEPT_FILE_TYPES } from "@/lib/fileUpload";

export default function SemuaAlertPage() {
  const [alerts, setAlerts] = useState<PeringatanKasus[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setIsFetching(true);
    try {
      const res = await getPeringatanKasus({ status_peringatan: "AKTIF" });
      if (res.status === "success" && res.data) {
        const sorted = [...res.data].sort((a, b) => b.tingkat_kumulatif - a.tingkat_kumulatif);
        setAlerts(sorted);
      }
    } catch (err) {
      toast.error("Gagal menarik data antrean.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleDownloadSurat = async (alert: PeringatanKasus) => {
    const { generateSuratTugasDocx } = await import("@/lib/docxGenerator");
    await generateSuratTugasDocx({
      idPeringatan: alert.id_peringatan,
      nis: alert.nis,
      nama: alert.nama,
      kelas: alert.kelas,
      tingkatKumulatif: alert.tingkat_kumulatif,
      totalHariAbsen: alert.total_hari_absen,
    });
  };

  const handleUploadResolution = async (alert: PeringatanKasus, e: React.FormEvent<HTMLFormElement>) => {
    const idPeringatan = alert.id_peringatan;
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector(`input[type="file"]`) as HTMLInputElement | null;
    const notesInput = form.querySelector(`textarea`) as HTMLTextAreaElement | null;
    const notes = notesInput?.value || "Diselesaikan";

    let fileBase64 = "";
    let fileName = "";

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const validation = validateFile(file);
      if (!validation.valid) {
        return toast.error(validation.error || "File tidak valid.");
      }
      try {
        fileBase64 = await fileToBase64(file);
        fileName = file.name;
      } catch (err) {
        return toast.error("Gagal membaca file.");
      }
    }

    setIsUploading(idPeringatan);

    try {
      const res = await resolveCase({
        id_peringatan: alert.id_peringatan,
        nis: alert.nis,
        nama: alert.nama,
        kelas: alert.kelas,
        catatan_konseling: notes,
        ditangani_oleh: "Guru BK",
        fileName: fileName || "bukti.pdf",
        fileBase64: fileBase64 || "dummy",
      });
      if (res.status === "success") {
        toast.success("Dokumen berhasil diunggah! Kasus ditutup.");
        setAlerts(alerts.filter(a => a.id_peringatan !== idPeringatan));
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

        {/* MOBILE VIEW */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100 min-h-[320px]">
          {isFetching ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Mencari data ke database...</div>
          ) : alerts.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm font-medium text-green-600">Antrean Peringatan Kosong. Semua selesai!</div>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.tingkat_kumulatif >= 3;
              return (
                <div key={alert.id_peringatan} className={`p-4 space-y-3 border-l-[4px] ${isCritical ? "border-l-red-500 bg-red-50/20" : "border-l-orange-400 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-950 leading-snug">{alert.nama}</div>
                      <div className="mt-1 text-[11px] text-gray-500">{alert.kelas}</div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 whitespace-nowrap bg-white ${isCritical ? 'border-red-300 text-red-700' : 'border-orange-300 text-orange-700'}`}>Level {alert.tingkat_kumulatif}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex min-w-[72px] justify-center whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-bold ${isCritical ? 'text-red-700 bg-red-50 border-red-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>{alert.total_hari_absen} Hari</span>
                    <span className="text-[11px] text-gray-500 truncate">{getTindakanInfo(alert.tingkat_kumulatif)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadSurat(alert)} className="h-9 rounded-md text-xs text-blue-700 border-blue-200 hover:bg-blue-50 font-semibold"><FileDown className="mr-1.5 h-3.5 w-3.5" />Surat (.docx)</Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className={`h-9 rounded-md text-xs ${isCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}>Upload Bukti</Button>
                      </DialogTrigger>
                      <DialogContent className="bottom-0 top-auto translate-y-0 rounded-b-none sm:top-1/2 sm:translate-y-[-50%] sm:rounded-md sm:max-w-md">
                        <form onSubmit={(e) => handleUploadResolution(alert, e)}>
                          <DialogHeader><DialogTitle>Selesaikan Kasus - {alert.nama}</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="p-3 bg-gray-50 text-gray-700 text-sm rounded-md border"><p>Rekomendasi: <strong>{getTindakanInfo(alert.tingkat_kumulatif)}</strong>.</p></div>
                            <div className="space-y-2 pt-2">
                              <Label htmlFor={`file-m-${alert.id_peringatan}`}>Upload Bukti (PDF, Word, Excel, Foto)</Label>
                              <Input id={`file-m-${alert.id_peringatan}`} name="file" type="file" accept={ACCEPT_FILE_TYPES} className="cursor-pointer text-xs" />
                              <p className="text-[11px] text-gray-500">Mendukung .pdf, .docx, .xlsx, .jpg, .png (Maks. 10MB)</p>
                            </div>
                            <div className="space-y-2"><Label htmlFor={`notes-m-${alert.id_peringatan}`}>Catatan Tindakan</Label><Textarea id={`notes-m-${alert.id_peringatan}`} placeholder="Tuliskan hasil intervensi..." required /></div>
                          </div>
                          <DialogFooter><Button type="submit" disabled={isUploading === alert.id_peringatan} className="w-full font-semibold">{isUploading === alert.id_peringatan ? "Mengunggah..." : "Submit & Tutup Kasus"}</Button></DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE */}
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
                  const isCritical = alert.tingkat_kumulatif >= 3;
                  return (
                    <TableRow key={alert.id_peringatan} className={isCritical ? "bg-red-50/20" : "hover:bg-gray-50/50"}>
                      <TableCell className="text-center text-muted-foreground font-medium border-r border-gray-200">{idx + 1}</TableCell>
                      <TableCell className="border-r border-gray-200">
                        <div className="font-semibold text-gray-900">{alert.nama}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{alert.kelas}</div>
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200 whitespace-nowrap">
                        <span className={`inline-flex min-w-[72px] justify-center whitespace-nowrap text-[11px] font-bold px-2 py-1 rounded-md border ${isCritical ? 'text-red-700 bg-red-50 border-red-200' : 'text-orange-700 bg-orange-50 border-orange-200'}`}>
                          {alert.total_hari_absen} Hari
                        </span>
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200 whitespace-nowrap">
                        <Badge variant="outline" className={`min-w-[70px] justify-center whitespace-nowrap font-semibold bg-white ${isCritical ? 'border-red-300 text-red-700' : 'border-orange-300 text-orange-700'}`}>
                          Level {alert.tingkat_kumulatif}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleDownloadSurat(alert)} className="h-8 px-3 gap-1.5 text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200 rounded-md text-xs font-semibold">
                            <FileDown className="w-3.5 h-3.5" /><span className="truncate">Unduh Surat (.docx)</span>
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
                              <form onSubmit={(e) => handleUploadResolution(alert, e)}>
                                <DialogHeader><DialogTitle>Selesaikan Kasus - {alert.nama}</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="p-3 bg-gray-50 text-gray-700 text-sm rounded-md border flex flex-col gap-2">
                                    <p>Rekomendasi: <strong>{getTindakanInfo(alert.tingkat_kumulatif)}</strong>.</p>
                                    <Button variant="outline" size="sm" type="button" onClick={() => handleDownloadSurat(alert)} className="w-fit h-8 text-xs gap-2 text-blue-700 border-blue-200 hover:bg-blue-50 font-semibold"><FileDown className="w-3 h-3" /> Unduh Surat Tugas (.docx)</Button>
                                  </div>
                                  <div className="space-y-2 pt-2">
                                    <Label htmlFor={`file-d-${alert.id_peringatan}`}>Upload Bukti (PDF, Word, Excel, Foto)</Label>
                                    <Input id={`file-d-${alert.id_peringatan}`} name="file" type="file" accept={ACCEPT_FILE_TYPES} className="cursor-pointer text-xs" />
                                    <p className="text-[11px] text-gray-500">Mendukung .pdf, .docx, .xlsx, .jpg, .png (Maks. 10MB)</p>
                                  </div>
                                  <div className="space-y-2"><Label htmlFor={`notes-d-${alert.id_peringatan}`}>Catatan Tindakan</Label><Textarea id={`notes-d-${alert.id_peringatan}`} placeholder="Tuliskan hasil intervensi..." required /></div>
                                </div>
                                <DialogFooter><Button type="submit" disabled={isUploading === alert.id_peringatan} className="w-full sm:w-auto font-semibold">{isUploading === alert.id_peringatan ? "Mengunggah..." : "Submit & Tutup Kasus"}</Button></DialogFooter>
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
