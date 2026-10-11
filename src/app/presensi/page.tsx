"use client";

import { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Paperclip, FileCheck, X } from "lucide-react";
import { getAttendancePageData, saveAttendance, type LogPresensi } from "@/lib/api";
import { todayWib } from "@/lib/date";
import { isSchoolDayWib } from "@/lib/reportData";
import { fileToBase64, validateFile, ACCEPT_FILE_TYPES } from "@/lib/fileUpload";

type StatusAbsen = "HADIR" | "SAKIT" | "IZIN" | "ALPHA";
interface Siswa { nis: string; nama: string; kelas: string; }

interface BuktiAttachment {
  fileName: string;
  fileBase64?: string;
  linkBukti?: string;
  adaSuratDokter: boolean;
}

export default function PresensiHarianPage() {
  const [tanggal, setTanggal] = useState<string>(todayWib);
  const [tingkat, setTingkat] = useState<"X" | "XI" | "XII">("X");
  const [kelas, setKelas] = useState<string>("");
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [semuaSiswa, setSemuaSiswa] = useState<Siswa[]>([]);
  const [logsHari, setLogsHari] = useState<LogPresensi[]>([]);
  const [loadedDataKey, setLoadedDataKey] = useState("");

  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusSiswa, setStatusSiswa] = useState<Record<string, StatusAbsen>>({});
  const [lampiranSiswa, setLampiranSiswa] = useState<Record<string, BuktiAttachment>>({});

  // Modal Upload State
  const [activeModalNis, setActiveModalNis] = useState<string | null>(null);
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [tempAdaDokter, setTempAdaDokter] = useState(false);

  const [syncedSelection, setSyncedSelection] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [saveUncertain, setSaveUncertain] = useState(false);
  const selection = `${tingkat}/${kelas}/${tanggal}`;
  const dataSelection = `${tingkat}/${tanggal}`;
  const currentSelection = useRef(selection);
  useEffect(() => { currentSelection.current = selection; }, [selection]);
  const proofRequest = useRef(0);
  const saveNeedsReconciliation = useRef(false);
  const pendingAttendanceSave = useRef<{ date: string; tingkat: string; kelas: string; rows: Parameters<typeof saveAttendance>[1] } | null>(null);
  const closeUploadModal = () => { proofRequest.current += 1; setActiveModalNis(null); };
  const ready = !isFetching && syncedSelection === selection && !loadError;
  const schoolDay = isSchoolDayWib(tanggal);

  useEffect(() => {
    let cancelled = false;
    getAttendancePageData(tingkat, tanggal, saveNeedsReconciliation.current).then(res => {
      if (cancelled) return;
      if (res.status !== "success" || !res.data) throw new Error(res.message || "Gagal memuat presensi.");
      saveNeedsReconciliation.current = false;
      pendingAttendanceSave.current = null;
      setSaveUncertain(false);
      setSemuaSiswa(res.data.students);
      setLogsHari(res.data.logs);
      setLoadedDataKey(dataSelection);
      const classes = Array.from(new Set(res.data.students.map(s => s.kelas))).filter(Boolean).sort();
      setDaftarKelas(classes);
      setKelas(current => classes.includes(current) ? current : classes[0] || "");
    }).catch(error => {
      if (!cancelled) setLoadError(error.message || "Gagal memuat siswa.");
    }).finally(() => { if (!cancelled) setIsFetching(false); });
    return () => { cancelled = true; };
  }, [tingkat, tanggal, retry, dataSelection]);

  useEffect(() => {
    const classStudents = semuaSiswa.filter(s => s.kelas === kelas);
    setStatusSiswa(Object.fromEntries(classStudents.map(s => [s.nis, "HADIR" as StatusAbsen])));
    setLampiranSiswa({});
    if (!kelas || !schoolDay || isFetching || loadedDataKey !== dataSelection) return;
    setLoadError("");
    const statuses: Record<string, StatusAbsen> = {};
    const attachments: Record<string, BuktiAttachment> = {};
    classStudents.forEach(s => { statuses[s.nis] = "HADIR"; });
    logsHari.forEach(log => {
      if (log.tanggal !== tanggal || log.kelas !== kelas || !(log.nis in statuses)) return;
      statuses[log.nis] = log.status_presensi;
      if (log.link_bukti_izin || log.ada_surat_dokter) attachments[log.nis] = {
        fileName: "Bukti tersimpan",
        linkBukti: log.link_bukti_izin,
        adaSuratDokter: log.ada_surat_dokter,
      };
    });
    setStatusSiswa(statuses);
    setLampiranSiswa(attachments);
    setSyncedSelection(selection);
  }, [kelas, tanggal, semuaSiswa, logsHari, isFetching, schoolDay, selection, loadedDataKey, dataSelection]);

  const filterSiswa = semuaSiswa.filter(s => s.kelas === kelas);
  const summary = filterSiswa.reduce((acc, siswa) => {
    if (!schoolDay) return acc;
    const status = statusSiswa[siswa.nis] || "HADIR";
    acc[status] += 1;
    return acc;
  }, { HADIR: 0, SAKIT: 0, IZIN: 0, ALPHA: 0 } as Record<StatusAbsen, number>);

  const handleSimpan = async () => {
    if (!ready || isSaving) return;
    if (!schoolDay) return toast.error("Presensi hanya Senin–Jumat.");
    if(filterSiswa.length === 0) return toast.error("Tidak ada siswa.");
    if(!tanggal) return toast.error("Pilih tanggal.");

    const dataKirim = saveNeedsReconciliation.current && pendingAttendanceSave.current
      ? pendingAttendanceSave.current.rows
      : filterSiswa.map(s => {
      const lampiran = lampiranSiswa[s.nis];
      return {
        nis: s.nis,
        nama: s.nama,
        kelas: s.kelas,
        status_presensi: statusSiswa[s.nis],
        ada_surat_dokter: lampiran ? lampiran.adaSuratDokter : false,
        fileName: lampiran?.fileBase64 ? lampiran.fileName : undefined,
        fileBase64: lampiran ? lampiran.fileBase64 : undefined,
        link_bukti_izin: lampiran?.linkBukti || "",
      };
    });
    if (saveNeedsReconciliation.current && pendingAttendanceSave.current &&
        (pendingAttendanceSave.current.date !== tanggal || pendingAttendanceSave.current.tingkat !== tingkat || pendingAttendanceSave.current.kelas !== kelas)) {
      toast.error("Pilihan berubah. Periksa status presensi sebelum menyimpan ulang.");
      return;
    }
    setIsSaving(true);
    const attemptedSave = { date: tanggal, tingkat, kelas, rows: dataKirim };

    try {
      const res = await saveAttendance(tanggal, dataKirim);
      if (res.status !== "success") throw new Error(res.message || "Gagal menyimpan presensi.");
      saveNeedsReconciliation.current = false;
      pendingAttendanceSave.current = null;
      setSaveUncertain(false);
      const uploadedLinks = new Map((res.data?.uploadedLinks || []).map(({ nis, linkBukti }) => [nis, linkBukti]));
      const savedRows: LogPresensi[] = dataKirim.map(row => ({
        nis: row.nis,
        nama: row.nama,
        kelas: row.kelas,
        status_presensi: row.status_presensi,
        ada_surat_dokter: row.ada_surat_dokter,
        tanggal,
        id_presensi: "",
        waktu_simpan: "",
        link_bukti_izin: uploadedLinks.get(row.nis) || row.link_bukti_izin,
      }));
      setLogsHari(prev => [...prev.filter(log => log.tanggal !== tanggal || log.kelas !== kelas), ...savedRows]);
      if (res.data?.alertSyncPending) toast.warning(res.message || "Presensi tersimpan, sinkronisasi alert belum berhasil. Simpan ulang untuk mencoba lagi.");
      else toast.success(`Presensi Kelas ${kelas} tanggal ${tanggal} disimpan!`);
    } catch {
      saveNeedsReconciliation.current = true;
      pendingAttendanceSave.current = attemptedSave;
      setSaveUncertain(true);
      toast.error("Gagal mengirim presensi.");
    } finally {
      setIsSaving(false);
    }
  };

  const setStatus = (nis: string, stat: StatusAbsen) => {
    if (!ready || isSaving || saveUncertain) return;
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
    if (!ready || isSaving || saveUncertain) return;
    proofRequest.current += 1;
    const existing = lampiranSiswa[nis];
    setTempAdaDokter(existing ? existing.adaSuratDokter : false);
    setTempFile(null);
    setActiveModalNis(nis);
  };

  const handleSaveModalBukti = async () => {
    if (!activeModalNis || !ready || isSaving || saveUncertain) return;
    const modalSelection = selection;
    const request = ++proofRequest.current;

    if (tempFile) {
      const validation = validateFile(tempFile);
      if (!validation.valid) {
        return toast.error(validation.error || "File tidak valid.");
      }
      try {
        const base64 = await fileToBase64(tempFile);
        if (currentSelection.current !== modalSelection || proofRequest.current !== request) return;
        setLampiranSiswa(prev => ({
          ...prev,
          [activeModalNis]: {
            fileName: tempFile.name,
            fileBase64: base64,
            adaSuratDokter: tempAdaDokter,
          }
        }));
        toast.success("Bukti tersimpan untuk siswa ini.");
      } catch {
        if (proofRequest.current === request) toast.error("Gagal memproses file.");
        return;
      }
    } else {
      // Hanya update checkbox surat dokter jika sudah ada file sebelumnya
      setLampiranSiswa(prev => {

        return {
          ...prev,
          [activeModalNis]: {
            fileName: "Surat dokter",
            ...prev[activeModalNis],
            adaSuratDokter: tempAdaDokter,
          }
        };
      });
    }

    closeUploadModal();
  };

  const removeBukti = (nis: string) => {
    if (!ready || isSaving || saveUncertain) return;
    setLampiranSiswa(prev => {
      const copy = { ...prev };
      delete copy[nis];
      return copy;
    });
    toast.info("Lampiran bukti dihapus.");
  };

  const activeSiswaObj = semuaSiswa.find(s => s.nis === activeModalNis);
  const activeStatus = activeModalNis ? statusSiswa[activeModalNis] : null;
  const retryAttendanceLoad = () => {
    setLoadedDataKey("");
    setIsFetching(true);
    setLoadError("");
    setRetry(n => n + 1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Input Presensi Harian</h1>
        <p className="text-muted-foreground mt-1 text-sm">Default status siswa adalah HADIR. Klik opsi untuk mengubah & lampirkan bukti.</p>
      </div>

      {!schoolDay && <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {new Date(`${tanggal}T12:00:00+07:00`).getUTCDay() === 6
          ? "Hari Sabtu tidak dapat input absen. Pilih tanggal Senin–Jumat."
          : new Date(`${tanggal}T12:00:00+07:00`).getUTCDay() === 0
            ? "Hari Minggu tidak dapat input absen. Pilih tanggal Senin–Jumat."
            : "Pilih tanggal Senin–Jumat."}
      </div>}

      {(loadError || saveUncertain) && <div role="alert" className="text-sm text-red-600">{loadError || "Respons simpan belum diterima; coba ulangi penyimpanan yang sama atau periksa status."} <Button variant="outline" disabled={isFetching} onClick={retryAttendanceLoad}>{saveUncertain ? "Periksa status" : "Coba lagi"}</Button></div>}
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
              <Select disabled={isSaving} value={tingkat} onValueChange={(val) => { closeUploadModal(); setIsFetching(true); setLoadError(""); setTingkat(val as "X" | "XI" | "XII"); }}>
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
              <Select value={kelas} onValueChange={(val) => {
                closeUploadModal();
                if (val !== kelas && saveNeedsReconciliation.current) {
                  setLoadedDataKey("");
                  setIsFetching(true);
                  setLoadError("");
                  setRetry(n => n + 1);
                }
                setKelas(val);
              }} disabled={isSaving || daftarKelas.length === 0}>
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
                disabled={isSaving}
                value={tanggal}
                onChange={(e) => { closeUploadModal(); setIsFetching(true); setLoadError(""); setTanggal(e.target.value); }}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {schoolDay && (<>
        {/* MOBILE VIEW */}
        <div className="block md:hidden divide-y divide-gray-100">
          {(isFetching || (!ready && !loadError && !saveUncertain && schoolDay && !!kelas)) ? (
            <div className="p-8 text-center text-sm text-gray-500">Memuat data siswa...</div>
          ) : saveUncertain ? (
            <div className="p-8 text-center text-sm text-amber-700">Status simpan belum dipastikan. Presensi dikunci sampai data terbaru berhasil dimuat.</div>
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
                        disabled={!ready || isSaving || saveUncertain}
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
                        disabled={!ready || isSaving || saveUncertain}
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
                      <button aria-label={`Hapus bukti ${siswa.nama}`} disabled={!ready || isSaving || saveUncertain} onClick={() => removeBukti(siswa.nis)} className="text-red-500 hover:text-red-700 ml-2">
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
              {(isFetching || (!ready && !loadError && !saveUncertain && schoolDay && !!kelas)) ? (
                <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                    Sedang memuat data...
                  </TableCell>
                </TableRow>
              ) : saveUncertain ? (
                <TableRow><TableCell colSpan={4} className="h-48 text-center text-amber-700">Status simpan belum dipastikan. Presensi dikunci sampai data terbaru berhasil dimuat.</TableCell></TableRow>
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
                          <button disabled={!ready || isSaving || saveUncertain} onClick={() => setStatus(siswa.nis, "HADIR")} className={`flex-1 py-2 px-1 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${status === "HADIR" ? "bg-white text-green-700 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:bg-gray-200"}`}>
                            Hadir
                          </button>
                          <button disabled={!ready || isSaving || saveUncertain} onClick={() => setStatus(siswa.nis, "SAKIT")} className={`flex-1 py-2 px-1 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${status === "SAKIT" ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500/20" : "text-gray-500 hover:bg-gray-200"}`}>
                            Sakit
                          </button>
                          <button disabled={!ready || isSaving || saveUncertain} onClick={() => setStatus(siswa.nis, "IZIN")} className={`flex-1 py-2 px-1 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${status === "IZIN" ? "bg-yellow-50 text-yellow-700 shadow-sm ring-1 ring-yellow-500/20" : "text-gray-500 hover:bg-gray-200"}`}>
                            Izin
                          </button>
                          <button disabled={!ready || isSaving || saveUncertain} onClick={() => setStatus(siswa.nis, "ALPHA")} className={`flex-1 py-2 px-1 text-xs sm:text-sm font-semibold rounded-md transition-all duration-200 ${status === "ALPHA" ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-500/20" : "text-gray-500 hover:bg-gray-200"}`}>
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
                              <button aria-label={`Hapus bukti ${siswa.nama}`} disabled={!ready || isSaving || saveUncertain} onClick={() => removeBukti(siswa.nis)} className="text-gray-400 hover:text-red-600 ml-1">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!ready || isSaving || saveUncertain}
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

        </>)}
        {/* FOOTER */}
        <div className="fixed md:static bottom-16 left-0 right-0 z-30 md:z-auto border-t border-gray-200 p-3 sm:px-6 sm:py-4 bg-white/95 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:shadow-none">
          <div className="text-xs text-gray-500">Tidak hadir: <span className="font-semibold text-gray-950">{summary.SAKIT + summary.IZIN + summary.ALPHA}</span></div>
          <Button
            size="lg"
            onClick={handleSimpan}
            disabled={isSaving || !ready || !schoolDay || filterSiswa.length === 0}
            className="w-full sm:w-auto font-bold shadow-sm h-12"
          >
            {isSaving ? 'Menyimpan...' : `Simpan Presensi Kelas ${kelas || ''}`}
          </Button>
        </div>

      </div>

      {/* DIALOG UPLOAD BUKTI IZIN / SAKIT */}
      <Dialog open={!!activeModalNis} onOpenChange={(open) => { if (!open) closeUploadModal(); }}>
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
                    proofRequest.current += 1;
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
                  onCheckedChange={(checked) => { proofRequest.current += 1; setTempAdaDokter(Boolean(checked)); }}
                />
                <label
                  htmlFor="surat-dokter"
                  className="text-xs font-medium text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Memiliki Surat Keterangan Dokter Resmi (Dihitung 1 Hari)
                </label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" type="button" onClick={() => closeUploadModal()}>Batal</Button>
            <Button type="button" onClick={handleSaveModalBukti} className="font-semibold">Simpan Bukti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
