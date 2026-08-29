"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Search, X, RefreshCw, Eye } from "lucide-react";
import { SiswaDetailModal, SiswaDetailData } from "@/components/SiswaDetailModal";

interface RawSiswa {
  nis: string;
  nama: string;
  kelas: string;
  tingkat: string;
}

interface RawLog {
  nis: string;
  status: string;
  tanggal: string;
  adaSurat: boolean;
  linkBukti?: string;
}

interface RawKasus {
  nis: string;
  tanggal: string;
  pelanggaran: string;
}

interface RawPenyelesaian {
  nis: string;
  tanggal: string;
  tindakan: string;
  guru: string;
}

export default function DataSiswaPage() {
  const [allStudents, setAllStudents] = useState<RawSiswa[]>([]);
  const [logs, setLogs] = useState<RawLog[]>([]);
  const [kasusList, setKasusList] = useState<RawKasus[]>([]);
  const [penyelesaianList, setPenyelesaianList] = useState<RawPenyelesaian[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTingkat, setSelectedTingkat] = useState<string>("SEMUA");
  const [selectedKelas, setSelectedKelas] = useState<string>("SEMUA");

  const [selectedSiswaDetail, setSelectedSiswaDetail] = useState<SiswaDetailData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Students across all 3 levels
      const levels = ["X", "XI", "XII"];
      const studentPromises = levels.map(async (lvl) => {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Siswa_${lvl}&_v=${Date.now()}`;
        const res = await fetch(url);
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
        if (match && match[1]) {
          const json = JSON.parse(match[1]);
          const rows = json.table.rows || [];
          const list: RawSiswa[] = [];
          rows.forEach((r: any) => {
            const c = r.c;
            if (c && c[1] && c[2] && c[3]) {
              list.push({
                kelas: String(c[1].v || "").trim(),
                nis: String(c[2].v || "").trim(),
                nama: String(c[3].v || "").trim(),
                tingkat: lvl,
              });
            }
          });
          return list;
        }
        return [];
      });

      // 2. Fetch LogPresensi
      const presensiPromise = (async () => {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=LogPresensi&_v=${Date.now()}`;
        const res = await fetch(url);
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
        if (match && match[1]) {
          const json = JSON.parse(match[1]);
          const rows = json.table.rows || [];
          const list: RawLog[] = [];
          rows.forEach((r: any) => {
            const c = r.c;
            if (c && c[2]) {
              list.push({
                nis: String(c[2].v || "").trim(),
                tanggal: c[1]?.f || c[1]?.v || "",
                status: String(c[5]?.v || "").toUpperCase(),
                adaSurat: Boolean(c[6]?.v),
                linkBukti: c[7]?.v ? String(c[7].v) : undefined,
              });
            }
          });
          return list;
        }
        return [];
      })();

      // 3. Fetch BankKasus
      const kasusPromise = (async () => {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=BankKasus&_v=${Date.now()}`;
        const res = await fetch(url);
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
        if (match && match[1]) {
          const json = JSON.parse(match[1]);
          const rows = json.table.rows || [];
          const list: RawKasus[] = [];
          rows.forEach((r: any) => {
            const c = r.c;
            if (c && c[2]) {
              list.push({
                nis: String(c[2].v || "").trim(),
                tanggal: c[1]?.f || c[1]?.v || "",
                pelanggaran: String(c[5]?.v || ""),
              });
            }
          });
          return list;
        }
        return [];
      })();

      // 4. Fetch PenyelesaianKasus
      const penyelesaianPromise = (async () => {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=PenyelesaianKasus&_v=${Date.now()}`;
        const res = await fetch(url);
        const text = await res.text();
        const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
        if (match && match[1]) {
          const json = JSON.parse(match[1]);
          const rows = json.table.rows || [];
          const list: RawPenyelesaian[] = [];
          rows.forEach((r: any) => {
            const c = r.c;
            if (c && c[2]) {
              list.push({
                nis: String(c[2].v || "").trim(),
                tindakan: String(c[6]?.v || ""),
                guru: String(c[7]?.v || ""),
                tanggal: c[8]?.f || c[8]?.v || "",
              });
            }
          });
          return list;
        }
        return [];
      })();

      const [studentResults, presensiLogs, kasusData, penyelesaianData] = await Promise.all([
        Promise.all(studentPromises),
        presensiPromise,
        kasusPromise,
        penyelesaianPromise,
      ]);

      setAllStudents(studentResults.flat());
      setLogs(presensiLogs);
      setKasusList(kasusData);
      setPenyelesaianList(penyelesaianData);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat direktori data siswa.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Compute available classes based on selected tingkat
  const availableClasses = useMemo(() => {
    const pool = selectedTingkat === "SEMUA" ? allStudents : allStudents.filter((s) => s.tingkat === selectedTingkat);
    const classes = Array.from(new Set(pool.map((s) => s.kelas))).filter(Boolean).sort();
    return classes;
  }, [allStudents, selectedTingkat]);

  // Aggregate student stats
  const studentsWithStats = useMemo(() => {
    // Map logs by NIS
    const logMap = new Map<string, RawLog[]>();
    logs.forEach((l) => {
      const arr = logMap.get(l.nis) || [];
      arr.push(l);
      logMap.set(l.nis, arr);
    });

    // Map kasus by NIS
    const kasusMap = new Map<string, RawKasus[]>();
    kasusList.forEach((k) => {
      const arr = kasusMap.get(k.nis) || [];
      arr.push(k);
      kasusMap.set(k.nis, arr);
    });

    // Map penyelesaian by NIS
    const penyelesaianMap = new Map<string, RawPenyelesaian[]>();
    penyelesaianList.forEach((p) => {
      const arr = penyelesaianMap.get(p.nis) || [];
      arr.push(p);
      penyelesaianMap.set(p.nis, arr);
    });

    return allStudents.map((s) => {
      const studentLogs = logMap.get(s.nis) || [];
      const studentKasus = kasusMap.get(s.nis) || [];
      const studentPenyelesaian = penyelesaianMap.get(s.nis) || [];

      const totalAlpha = studentLogs.filter((l) => l.status === "ALPHA").length;
      const totalSakit = studentLogs.filter((l) => l.status === "SAKIT").length;
      const totalIzin = studentLogs.filter((l) => l.status === "IZIN").length;
      const totalPelanggaran = studentKasus.length;

      return {
        ...s,
        totalAlpha,
        totalSakit,
        totalIzin,
        totalPelanggaran,
        totalAbsen: totalAlpha + totalSakit + totalIzin,
        logs: studentLogs,
        kasus: studentKasus,
        penyelesaian: studentPenyelesaian,
      };
    });
  }, [allStudents, logs, kasusList, penyelesaianList]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    return studentsWithStats
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
  }, [studentsWithStats, selectedTingkat, selectedKelas, searchQuery]);

  const handleOpenDetail = (siswa: SiswaDetailData) => {
    setSelectedSiswaDetail(siswa);
    setIsModalOpen(true);
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
          onClick={loadAllData}
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
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-gray-400">
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
          setIsModalOpen(false);
          setSelectedSiswaDetail(null);
        }}
      />
    </div>
  );
}
