"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Search, X, RefreshCw, Eye } from "lucide-react";
import { getStudentSummary, getStudentDetail } from "@/lib/api";
import { SiswaDetailModal, SiswaDetailData } from "@/components/SiswaDetailModal";

export default function DataSiswaPage() {
  const [allStudents, setAllStudents] = useState<SiswaDetailData[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const detailRequest = useRef(0);
  const detailPending = useRef(false);
  const detailStarted = useRef(0);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTingkat, setSelectedTingkat] = useState<string>("SEMUA");
  const [selectedKelas, setSelectedKelas] = useState<string>("SEMUA");

  const [selectedSiswaDetail, setSelectedSiswaDetail] = useState<SiswaDetailData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAllData = async (fresh = false) => {
    detailRequest.current += 1;
    detailPending.current = false;
    setLoadingDetail(false);
    setIsModalOpen(false);
    setSelectedSiswaDetail(null);
    setIsLoading(true);
    try {
      const res = await getStudentSummary(fresh);
      if (res.status !== "success" || !res.data) throw new Error(res.message || "Data tidak tersedia.");
      setAllStudents(res.data.students.map(s => ({ ...s, tingkat: s.tingkat || s.kelas.split(" ")[0], logs: [], kasus: [], penyelesaian: [] })));
    } catch {
      toast.error("Gagal memuat data siswa. Coba muat ulang.");
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    loadAllData();
    return () => { detailRequest.current += 1; detailPending.current = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "development" || !isModalOpen || !detailStarted.current) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => console.info("[BK_UI]", JSON.stringify({ action: "studentDetailPaint", elapsedMs: Date.now() - detailStarted.current })));
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [isModalOpen]);

  // Compute available classes based on selected tingkat
  const availableClasses = useMemo(() => {
    const pool = selectedTingkat === "SEMUA" ? allStudents : allStudents.filter((s) => s.tingkat === selectedTingkat);
    const classes = Array.from(new Set(pool.map((s) => s.kelas))).filter(Boolean).sort();
    return classes;
  }, [allStudents, selectedTingkat]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    return allStudents
      .filter((s) => {
        if (selectedTingkat !== "SEMUA" && s.tingkat !== selectedTingkat) return false;
        if (selectedKelas !== "SEMUA" && s.kelas !== selectedKelas) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchNama = s.nama.toLowerCase().includes(q);
          const matchNis = s.nis.toLowerCase().includes(q);
          const matchKelas = s.kelas.toLowerCase().includes(q);
          if (!matchNama && !matchNis && !matchKelas) return false;
        }
        return true;
      })
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  }, [allStudents, selectedTingkat, selectedKelas, searchQuery]);

  const handleOpenDetail = async (siswa: SiswaDetailData) => {
    if (detailPending.current || isLoading) return;
    const request = ++detailRequest.current;
    // Ukur waktu dari klik pengguna; baris ini berjalan di event handler.
    // eslint-disable-next-line react-hooks/purity
    detailStarted.current = Date.now();
    detailPending.current = true;
    setLoadingDetail(true);
    try {
      const res = await getStudentDetail(siswa.nis, siswa.tingkat);
      if (request !== detailRequest.current) return;
      if (res.status !== "success" || !res.data) throw new Error(res.message || "Detail tidak tersedia.");
      const { logs, kasus, penyelesaian } = res.data;
      setSelectedSiswaDetail({
        ...siswa,
        logs: logs.filter(l => l.nis === siswa.nis).map(l => ({ tanggal: l.tanggal, status: l.status_presensi, adaSurat: l.ada_surat_dokter, linkBukti: l.link_bukti_izin })),
        kasus: kasus.filter(k => k.nis === siswa.nis).map(k => ({ tanggal: k.tanggal, pelanggaran: k.jenis_pelanggaran })),
        penyelesaian: penyelesaian.filter(p => p.nis === siswa.nis).map(p => ({ tanggal: p.waktu_selesai, tindakan: p.catatan_konseling, guru: p.ditangani_oleh, linkPdf: p.link_pdf_drive })),
      });
      setIsModalOpen(true);
    } catch {
      if (request === detailRequest.current) toast.error("Gagal memuat detail siswa. Coba lagi.");
    } finally {
      if (request === detailRequest.current) { detailPending.current = false; setLoadingDetail(false); }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-5 pb-24 md:pb-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950 flex items-center gap-2">
            <Users className="w-7 h-7 text-gray-800" />
            Direktori Data Siswa
          </h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm">
            Daftar lengkap seluruh siswa SMK Gajah Mungkur 1 Wuryantoro beserta rekap kehadiran & pelanggaran.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadAllData(true)}
          disabled={isLoading}
          className="h-9 text-xs font-semibold self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      {/* FILTER & SEARCH CARD */}
      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="🔍 Cari nama, NIS, atau kelas siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-10 text-xs sm:text-sm font-medium bg-gray-50/50 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={selectedTingkat}
              onValueChange={(val) => {
                setSelectedTingkat(val);
                setSelectedKelas("SEMUA");
              }}
            >
              <SelectTrigger className="w-[120px] h-10 text-xs font-semibold bg-gray-50">
                <SelectValue placeholder="Tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEMUA">Semua Tingkat</SelectItem>
                <SelectItem value="X">Kelas X</SelectItem>
                <SelectItem value="XI">Kelas XI</SelectItem>
                <SelectItem value="XII">Kelas XII</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedKelas} onValueChange={(val) => setSelectedKelas(val)}>
              <SelectTrigger className="w-[130px] h-10 text-xs font-semibold bg-gray-50">
                <SelectValue placeholder="Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEMUA">Semua Kelas</SelectItem>
                {availableClasses.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
          <span>
            Menampilkan <strong className="text-gray-900">{filteredStudents.length}</strong> dari{" "}
            {allStudents.length} siswa
          </span>
          {(searchQuery || selectedTingkat !== "SEMUA" || selectedKelas !== "SEMUA") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedTingkat("SEMUA");
                setSelectedKelas("SEMUA");
              }}
              className="text-orange-600 hover:underline font-semibold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      <Dialog open={loadingDetail}>
        <DialogContent
          aria-busy={loadingDetail}
          onEscapeKeyDown={event => event.preventDefault()}
          onInteractOutside={event => event.preventDefault()}
          className="h-[100dvh] w-screen max-w-none place-content-center border-0 bg-white/90 text-center shadow-none rounded-none sm:rounded-none [&>button]:hidden"
        >
          <RefreshCw aria-hidden="true" className="mx-auto h-8 w-8 animate-spin text-gray-700" />
          <DialogTitle>Memuat detail siswa</DialogTitle>
          <DialogDescription role="status">Mohon tunggu sebentar...</DialogDescription>
        </DialogContent>
      </Dialog>
      {/* SISWA LIST */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
        {/* MOBILE VIEW */}
        <div className="md:hidden divide-y divide-gray-100 min-h-[300px]">
          {isLoading ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Memuat data siswa...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="h-48 grid place-items-center text-center p-6 text-sm text-muted-foreground">
              Tidak ada data siswa yang cocok dengan kriteria pencarian.
            </div>
          ) : (
            filteredStudents.map((s) => (
              <div
                key={s.nis}
                onClick={() => handleOpenDetail(s)}
                className="p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-950 leading-snug truncate">{s.nama}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      NIS: <span className="font-mono">{s.nis}</span> • <span className="font-bold text-gray-800">{s.kelas}</span>
                    </p>
                  </div>
                  <Button disabled={loadingDetail} variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-gray-400">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-100">
                    A: {s.totalAlpha}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-100">
                    S: {s.totalSakit}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">
                    I: {s.totalIzin}
                  </span>
                  {s.totalPelanggaran > 0 && (
                    <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-800 font-bold border border-orange-200">
                      Kasus: {s.totalPelanggaran}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto min-h-[300px]">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[110px] font-semibold border-r border-gray-200">NIS</TableHead>
                <TableHead className="min-w-[220px] font-semibold border-r border-gray-200">Nama Siswa</TableHead>
                <TableHead className="w-[120px] text-center font-semibold border-r border-gray-200">Kelas</TableHead>
                <TableHead className="w-[80px] text-center font-semibold border-r border-gray-200 text-red-700">Alpha</TableHead>
                <TableHead className="w-[80px] text-center font-semibold border-r border-gray-200 text-amber-700">Sakit</TableHead>
                <TableHead className="w-[80px] text-center font-semibold border-r border-gray-200 text-blue-700">Izin</TableHead>
                <TableHead className="w-[110px] text-center font-semibold border-r border-gray-200 text-orange-800">Pelanggaran</TableHead>
                <TableHead className="w-[100px] text-center font-semibold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                    Sedang memuat direktori data siswa...
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                    Tidak ada data siswa yang cocok dengan kriteria pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s) => (
                  <TableRow
                    key={s.nis}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors"
                    onClick={() => handleOpenDetail(s)}
                  >
                    <TableCell className="font-mono text-xs text-gray-600 border-r border-gray-200">{s.nis}</TableCell>
                    <TableCell className="border-r border-gray-200">
                      <div className="font-semibold text-gray-900 hover:text-orange-600 transition-colors">
                        {s.nama}
                      </div>
                    </TableCell>
                    <TableCell className="text-center border-r border-gray-200">
                      <Badge variant="secondary" className="font-semibold text-xs bg-gray-100 text-gray-700">
                        {s.kelas}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center border-r border-gray-200 font-bold text-red-700">
                      {s.totalAlpha > 0 ? s.totalAlpha : "-"}
                    </TableCell>
                    <TableCell className="text-center border-r border-gray-200 font-bold text-amber-700">
                      {s.totalSakit > 0 ? s.totalSakit : "-"}
                    </TableCell>
                    <TableCell className="text-center border-r border-gray-200 font-bold text-blue-700">
                      {s.totalIzin > 0 ? s.totalIzin : "-"}
                    </TableCell>
                    <TableCell className="text-center border-r border-gray-200">
                      {s.totalPelanggaran > 0 ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 font-bold text-xs">
                          {s.totalPelanggaran} Kasus
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loadingDetail}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(s);
                        }}
                        className="h-7 px-2.5 text-xs font-semibold border-gray-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <SiswaDetailModal
        siswa={selectedSiswaDetail}
        isOpen={isModalOpen}
        onClose={() => {
          detailRequest.current += 1;
          detailPending.current = false;
          setLoadingDetail(false);
          setIsModalOpen(false);
          setSelectedSiswaDetail(null);
        }}
      />
    </div>
  );
}
