"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Paperclip, FileCheck, X } from "lucide-react";
import { fetchGasApi } from "@/lib/api";
import { fileToBase64, validateFile, ACCEPT_FILE_TYPES } from "@/lib/fileUpload";

type StatusAbsen = "HADIR" | "SAKIT" | "IZIN" | "ALPHA";
interface Siswa { nis: string; nama: string; kelas: string; }

interface BuktiAttachment {
  fileName: string;
  fileBase64: string;
  adaSuratDokter: boolean;
}

export default function PresensiHarianPage() {
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split("T")[0]); 
  const [tingkat, setTingkat] = useState<string>("X");
  const [kelas, setKelas] = useState<string>("");
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [semuaSiswa, setSemuaSiswa] = useState<Siswa[]>([]);
  
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusSiswa, setStatusSiswa] = useState<Record<string, StatusAbsen>>({});
  const [lampiranSiswa, setLampiranSiswa] = useState<Record<string, BuktiAttachment>>({});
  
  // Modal Upload State
  const [activeModalNis, setActiveModalNis] = useState<string | null>(null);
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [tempAdaDokter, setTempAdaDokter] = useState(false);

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  useEffect(() => {
    const loadStudents = async () => {
      setIsFetching(true);
      setKelas("");
      setDaftarKelas([]);
      
      try {
        const sheetName = `Siswa_${tingkat}`;
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}&_v=${new Date().getTime()}`;
        
        const response = await fetch(gvizUrl);
        const text = await response.text();
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
        
        if (jsonMatch && jsonMatch[1]) {
          const json = JSON.parse(jsonMatch[1]);
          if (json.status !== "ok") return toast.error("Gagal mengambil data kelas.");

          const rows = json.table.rows;
          const students: Siswa[] = [];

          rows.forEach((row: any) => {
            const dataRow = row.c;
            if (dataRow && dataRow[1] && dataRow[2] && dataRow[3]) {
              const classStr = dataRow[1].v?.toString() || "";
              const nisStr = dataRow[2].v?.toString() || "";
              const nameStr = dataRow[3].v?.toString() || "";

              if (classStr && nisStr && nameStr) {
                students.push({ kelas: classStr, nis: nisStr, nama: nameStr });
              }
            }
          });

          setSemuaSiswa(students);
          
          const uniqueClasses = Array.from(new Set(students.map(s => s.kelas))).filter(Boolean).sort();
          setDaftarKelas(uniqueClasses);
          if(uniqueClasses.length > 0) setKelas(uniqueClasses[0]);

          const initialStatus: Record<string, StatusAbsen> = {};
          students.forEach(s => { initialStatus[s.nis] = "HADIR"; });
          setStatusSiswa(initialStatus);
          setLampiranSiswa({});

        } else {
          toast.error("Format balasan tidak valid.");
        }
      } catch (error) {
        toast.error("Gagal memuat data.");
      } finally {
        setIsFetching(false);
      }
    };
    
    loadStudents();
  }, [tingkat]);

  const filterSiswa = semuaSiswa.filter(s => s.kelas === kelas);
  const summary = filterSiswa.reduce((acc, siswa) => {
    const status = statusSiswa[siswa.nis] || "HADIR";
    acc[status] += 1;
    return acc;
  }, { HADIR: 0, SAKIT: 0, IZIN: 0, ALPHA: 0 } as Record<StatusAbsen, number>);

  const handleSimpan = async () => {
    if(filterSiswa.length === 0) return toast.error("Tidak ada siswa.");
    if(!tanggal) return toast.error("Pilih tanggal.");
    
    setIsSaving(true);
    const dataKirim = filterSiswa.map(s => {
      const lampiran = lampiranSiswa[s.nis];
      return {
        nis: s.nis,
        nama: s.nama,
        kelas: s.kelas,
        status_presensi: statusSiswa[s.nis],
        ada_surat_dokter: lampiran ? lampiran.adaSuratDokter : false,
        fileName: lampiran ? lampiran.fileName : undefined,
        fileBase64: lampiran ? lampiran.fileBase64 : undefined,
      };
    });

    try {
      const res = await fetchGasApi("saveAttendance", { date: tanggal, attendances: dataKirim });
      if(res.status === "success") {
        toast.success(`Presensi Kelas ${kelas} tanggal ${tanggal} disimpan!`);
      } else {
        toast.error("Error dari server: " + res.message);
      }
    } catch (error) {
      toast.error("Gagal mengirim presensi.");
    } finally {
      setIsSaving(false);
    }
  };

  const setStatus = (nis: string, stat: StatusAbsen) => {
    setStatusSiswa(prev => ({...prev, [nis]: stat}));
    if (stat === "HADIR" || stat === "ALPHA") {
      setLampiranSiswa(prev => {
        const copy = { ...prev };
        delete copy[nis];
        return copy;
      });
    }
  };

  const openUploadModal = (nis: string) => {
    const existing = lampiranSiswa[nis];
    setTempAdaDokter(existing ? existing.adaSuratDokter : false);
    setTempFile(null);
    setActiveModalNis(nis);
  };

  const handleSaveModalBukti = async () => {
    if (!activeModalNis) return;
    
    if (tempFile) {
      const validation = validateFile(tempFile);
      if (!validation.valid) {
        return toast.error(validation.error || "File tidak valid.");
      }
      try {
        const base64 = await fileToBase64(tempFile);
        setLampiranSiswa(prev => ({
          ...prev,
          [activeModalNis]: {
            fileName: tempFile.name,
            fileBase64: base64,
            adaSuratDokter: tempAdaDokter,
          }
        }));
        toast.success("Bukti tersimpan untuk siswa ini.");
      } catch (e) {
        return toast.error("Gagal memproses file.");
      }
    } else {
      // Hanya update checkbox surat dokter jika sudah ada file sebelumnya
      setLampiranSiswa(prev => {
        if (!prev[activeModalNis]) return prev;
        return {
          ...prev,
          [activeModalNis]: {
            ...prev[activeModalNis],
            adaSuratDokter: tempAdaDokter,
          }
        };
      });
    }

    setActiveModalNis(null);
  };

  const removeBukti = (nis: string) => {
    setLampiranSiswa(prev => {
      const copy = { ...prev };
      delete copy[nis];
      return copy;
    });
    toast.info("Lampiran bukti dihapus.");
  };

  const activeSiswaObj = semuaSiswa.find(s => s.nis === activeModalNis);
  const activeStatus = activeModalNis ? statusSiswa[activeModalNis] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Input Presensi Harian</h1>
        <p className="text-muted-foreground mt-1 text-sm">Default status siswa adalah HADIR. Klik opsi untuk mengubah & lampirkan bukti.</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(["HADIR", "SAKIT", "IZIN", "ALPHA"] as StatusAbsen[]).map((status) => (
          <div key={status} className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold text-gray-500">{status}</div>
            <div className={`mt-1 text-2xl font-bold ${status === "HADIR" ? "text-green-600" : status === "SAKIT" ? "text-blue-600" : status === "IZIN" ? "text-amber-600" : "text-red-600"}`}>
              {summary[status]}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col">
        {/* FILTER BAR */}
        <div className="bg-white border-b border-gray-200 p-4 sm:px-6 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="w-full sm:w-[130px]">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Tingkat</label>
              <Select value={tingkat} onValueChange={(val) => { setTingkat(val); }}>
                <SelectTrigger className="bg-white border-gray-300 font-medium">
                  <SelectValue placeholder="Pilih Tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="X">Kelas X</SelectItem>
                  <SelectItem value="XI">Kelas XI</SelectItem>
                  <SelectItem value="XII">Kelas XII</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[180px]">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Kelas</label>
              <Select value={kelas} onValueChange={setKelas} disabled={daftarKelas.length === 0}>
                <SelectTrigger className="bg-white border-gray-300 font-medium">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  {daftarKelas.map(k => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[180px]">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Tanggal</label>
              <input 
                type="date" 
                value={tanggal} 
                onChange={(e) => setTanggal(e.target.value)} 
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
              />
            </div>
          </div>
        </div>

        {/* MOBILE VIEW */}
        <div className="block md:hidden divide-y divide-gray-100">
          {isFetching ? (
            <div className="p-8 text-center text-sm text-gray-500">Memuat data siswa...</div>
          ) : filterSiswa.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">Tidak ada siswa di kelas ini.</div>
          ) : (
            filterSiswa.map((siswa, i) => {
              const status = statusSiswa[siswa.nis];
              const lampiran = lampiranSiswa[siswa.nis];
              const canAttach = status === "SAKIT" || status === "IZIN";

              return (
                <div key={siswa.nis} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 font-mono w-5">{i + 1}.</span>
                      <span className="text-sm font-semibold text-gray-900 truncate">{siswa.nama}</span>
                    </div>
                    {canAttach && (
                      <Button 
                        size="sm" 
                        variant={lampiran ? "secondary" : "outline"} 
                        onClick={() => openUploadModal(siswa.nis)}
                        className={`h-7 px-2 text-[11px] gap-1 shrink-0 ${lampiran ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-600'}`}
                      >
                        {lampiran ? <FileCheck className="w-3 h-3 text-blue-600" /> : <Paperclip className="w-3 h-3" />}
                        {lampiran ? "Bukti Ada" : "+ Bukti"}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-md">
                    {(["HADIR", "SAKIT", "IZIN", "ALPHA"] as StatusAbsen[]).map((item) => (
                      <button 
                        key={item} 
                        onClick={() => setStatus(siswa.nis, item)} 
                        className={`h-9 rounded text-[11px] font-semibold transition-all ${status === item ? "bg-white text-gray-950 shadow-sm ring-1 ring-black/5" : "text-gray-500"}`}
                      >
                        {item === "HADIR" ? "Hadir" : item === "SAKIT" ? "Sakit" : item === "IZIN" ? "Izin" : "Alpha"}
                      </button>
                    ))}
                  </div>
                  {lampiran && (
                    <div className="flex items-center justify-between text-[11px] bg-blue-50 text-blue-800 px-2.5 py-1 rounded border border-blue-100">
                      <span className="truncate max-w-[200px]">{lampiran.fileName} {lampiran.adaSuratDokter ? "(Surat Dokter)" : ""}</span>
                      <button onClick={() => removeBukti(siswa.nis)} className="text-red-500 hover:text-red-700 ml-2">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block flex-1 overflow-x-auto min-h-[300px]">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[40px] text-center border-r border-gray-200 font-medium">No</TableHead>
                <TableHead className="min-w-[150px] border-r border-gray-200 font-medium">Nama Siswa</TableHead>
                <TableHead className="min-w-[280px] text-center border-r border-gray-200 font-medium">Status Absensi</TableHead>
                <TableHead className="w-[180px] text-center font-medium">Lampiran Bukti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                    Sedang memuat data...
                  </TableCell>
                </TableRow>
              ) : filterSiswa.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                    Tidak ada data siswa untuk kelas {kelas || '(Belum dipilih)'}.
                  </TableCell>
                </TableRow>
              ) : (
                filterSiswa.map((siswa, i) => {
                  const status = statusSiswa[siswa.nis];
                  const lampiran = lampiranSiswa[siswa.nis];
                  const canAttach = status === "SAKIT" || status === "IZIN";

                  return (
                    <TableRow key={siswa.nis} className="hover:bg-gray-50/50">
                      <TableCell className="text-center font-medium text-gray-500 border-r border-gray-200">{i + 1}</TableCell>
                      <TableCell className="border-r border-gray-200">
                        <div className="font-semibold text-gray-900 leading-tight">{siswa.nama}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{siswa.nis}</div>
                      </TableCell>
                      <TableCell className="p-2 sm:p-4 border-r border-gray-200">
                        <div className="flex w-full bg-gray-100 p-1 rounded-lg justify-between gap-1 max-w-[340px] mx-auto shadow-inner">
                          <button onClick={() => setStatus(siswa.nis, "HADIR")} className={`flex-1 py-2 px-1 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${status === "HADIR" ? "bg-white text-green-700 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:bg-gray-200"}`}>
                            Hadir
                          </button>
                          <button onClick={() => setStatus(siswa.nis, "SAKIT")} className={`flex-1 py-2 px-1 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${status === "SAKIT" ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500/20" : "text-gray-500 hover:bg-gray-200"}`}>
                            Sakit
                          </button>
                          <button onClick={() => setStatus(siswa.nis, "IZIN")} className={`flex-1 py-2 px-1 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${status === "IZIN" ? "bg-yellow-50 text-yellow-700 shadow-sm ring-1 ring-yellow-500/20" : "text-gray-500 hover:bg-gray-200"}`}>
                            Izin
                          </button>
                          <button onClick={() => setStatus(siswa.nis, "ALPHA")} className={`flex-1 py-2 px-1 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${status === "ALPHA" ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-500/20" : "text-gray-500 hover:bg-gray-200"}`}>
                            Alpha
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        {canAttach ? (
                          lampiran ? (
                            <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-md text-xs">
                              <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate max-w-[90px] font-medium" title={lampiran.fileName}>{lampiran.fileName}</span>
                              <button onClick={() => removeBukti(siswa.nis)} className="text-gray-400 hover:text-red-600 ml-1">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openUploadModal(siswa.nis)}
                              className="h-8 px-2.5 text-xs gap-1.5 border-dashed border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> Lampirkan Bukti
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* FOOTER */}
        <div className="fixed md:static bottom-16 left-0 right-0 z-30 md:z-auto border-t border-gray-200 p-3 sm:px-6 sm:py-4 bg-white/95 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none">
          <div className="text-xs text-gray-500">Tidak hadir: <span className="font-semibold text-gray-950">{summary.SAKIT + summary.IZIN + summary.ALPHA}</span></div>
          <Button 
            size="lg" 
            onClick={handleSimpan} 
            disabled={isSaving || isFetching || filterSiswa.length === 0} 
            className="w-full sm:w-auto font-bold shadow-sm h-12"
          >
            {isSaving ? 'Menyimpan...' : `Simpan Presensi Kelas ${kelas || ''}`}
          </Button>
        </div>

      </div>

      {/* DIALOG UPLOAD BUKTI IZIN / SAKIT */}
      <Dialog open={!!activeModalNis} onOpenChange={(open) => { if (!open) setActiveModalNis(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unggah Bukti {activeStatus === "SAKIT" ? "Sakit" : "Izin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="p-3 bg-gray-50 rounded-md border text-xs text-gray-700 space-y-1">
              <p><strong>Nama:</strong> {activeSiswaObj?.nama}</p>
              <p><strong>Kelas:</strong> {activeSiswaObj?.kelas} | <strong>Status:</strong> {activeStatus}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-bukti">Pilih Berkas (PDF, Word, Excel, Foto)</Label>
              <Input 
                id="file-bukti" 
                type="file" 
                accept={ACCEPT_FILE_TYPES} 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setTempFile(e.target.files[0]);
                  }
                }}
                className="cursor-pointer text-xs" 
              />
              <p className="text-[11px] text-gray-500">Format: .pdf, .docx, .xlsx, .jpg, .png (Maks. 10MB)</p>
            </div>

            {activeStatus === "SAKIT" && (
              <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <Checkbox 
                  id="surat-dokter" 
                  checked={tempAdaDokter} 
                  onCheckedChange={(checked) => setTempAdaDokter(Boolean(checked))} 
                />
                <label 
                  htmlFor="surat-dokter" 
                  className="text-xs font-medium text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Memiliki Surat Keterangan Dokter Resmi (Bobot 0.5 Hari)
                </label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => setActiveModalNis(null)}>Batal</Button>
            <Button type="button" onClick={handleSaveModalBukti} className="font-semibold">Simpan Bukti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
