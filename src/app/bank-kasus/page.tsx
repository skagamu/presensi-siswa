"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchGasApi } from "@/lib/api";
import { Search, X, CheckSquare, Users, Sparkles } from "lucide-react";

interface Siswa {
  nis: string;
  nama: string;
  kelas: string;
}

export default function BankKasusInputPage() {
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split("T")[0]);
  const [tingkat, setTingkat] = useState<string>("X");
  const [kelas, setKelas] = useState<string>("");
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [semuaSiswaCurrentTingkat, setSemuaSiswaCurrentTingkat] = useState<Siswa[]>([]);
  const [allStudentsAllLevels, setAllStudentsAllLevels] = useState<Siswa[]>([]);

  const [isFetchingSiswa, setIsFetchingSiswa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [pelanggaran, setPelanggaran] = useState<string>("");
  const [selectedNis, setSelectedNis] = useState<string[]>([]);
  const [searchSiswaGlobal, setSearchSiswaGlobal] = useState<string>("");

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  // 1. Preload semua siswa lintas tingkat (X, XI, XII) untuk global search
  useEffect(() => {
    const loadAllStudents = async () => {
      try {
        const levels = ["X", "XI", "XII"];
        const promises = levels.map(async (lvl) => {
          const sheetName = `Siswa_${lvl}`;
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}&_v=${Date.now()}`;
          const res = await fetch(gvizUrl);
          const text = await res.text();
          const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
          if (match && match[1]) {
            const json = JSON.parse(match[1]);
            const rows = json.table.rows || [];
            const list: Siswa[] = [];
            rows.forEach((row: any) => {
              const c = row.c;
              if (c && c[1] && c[2] && c[3]) {
                list.push({
                  kelas: c[1].v?.toString() || "",
                  nis: c[2].v?.toString() || "",
                  nama: c[3].v?.toString() || "",
                });
              }
            });
            return list;
          }
          return [];
        });

        const results = await Promise.all(promises);
        const combined = results.flat();
        setAllStudentsAllLevels(combined);
      } catch (e) {
        console.error("Gagal preload data seluruh siswa", e);
      }
    };
    loadAllStudents();
  }, []);

  // 2. Load siswa per tingkat untuk tab kelas reguler
  useEffect(() => {
    const loadStudents = async () => {
      setIsFetchingSiswa(true);
      setKelas("");
      setDaftarKelas([]);
      try {
        const sheetName = `Siswa_${tingkat}`;
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}&_v=${Date.now()}`;
        const response = await fetch(gvizUrl);
        const text = await response.text();
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
        if (jsonMatch && jsonMatch[1]) {
          const json = JSON.parse(jsonMatch[1]);
          if (json.status !== "ok") return;
          const rows = json.table.rows;
          const students: Siswa[] = [];
          rows.forEach((row: any) => {
            const c = row.c;
            if (c && c[1] && c[2] && c[3]) {
              students.push({
                kelas: c[1].v?.toString() || "",
                nis: c[2].v?.toString() || "",
                nama: c[3].v?.toString() || "",
              });
            }
          });
          setSemuaSiswaCurrentTingkat(students);
          const uniqueClasses = Array.from(new Set(students.map((s) => s.kelas))).filter(Boolean).sort();
          setDaftarKelas(uniqueClasses);
          if (uniqueClasses.length > 0) setKelas(uniqueClasses[0]);
        }
      } catch (error) {
        toast.error("Gagal memuat data siswa.");
      } finally {
        setIsFetchingSiswa(false);
      }
    };
    loadStudents();
  }, [tingkat]);

  // Data yang ditampilkan: JIKA search aktif -> cari di SELURUH siswa (X, XI, XII)
  // JIKA search kosong -> tampilkan siswa di kelas aktif
    const selectedStudents = useMemo(() => {
    const pool = allStudentsAllLevels.length > 0 ? allStudentsAllLevels : semuaSiswaCurrentTingkat;
    return pool.filter((s) => selectedNis.includes(s.nis));
  }, [selectedNis, allStudentsAllLevels, semuaSiswaCurrentTingkat]);

  const isGlobalSearchActive = searchSiswaGlobal.trim().length > 0;

  const displayedSiswa = useMemo(() => {
    if (isGlobalSearchActive) {
      const q = searchSiswaGlobal.toLowerCase().trim();
      const pool = allStudentsAllLevels.length > 0 ? allStudentsAllLevels : semuaSiswaCurrentTingkat;
      return pool.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.kelas.toLowerCase().includes(q)
      );
    }
    return semuaSiswaCurrentTingkat.filter((s) => s.kelas === kelas);
  }, [isGlobalSearchActive, searchSiswaGlobal, allStudentsAllLevels, semuaSiswaCurrentTingkat, kelas]);

  const toggleSiswa = (nis: string) => {
    setSelectedNis((prev) => (prev.includes(nis) ? prev.filter((n) => n !== nis) : [...prev, nis]));
  };

  const toggleSemuaDisplayed = () => {
    const displayedNisList = displayedSiswa.map((s) => s.nis);
    const allSelected = displayedNisList.every((nis) => selectedNis.includes(nis));

    if (allSelected) {
      setSelectedNis((prev) => prev.filter((n) => !displayedNisList.includes(n)));
    } else {
      setSelectedNis((prev) => Array.from(new Set([...prev, ...displayedNisList])));
    }
  };

  const handleSimpan = async () => {
    if (selectedNis.length === 0) return toast.error("Pilih minimal 1 siswa.");
    if (!tanggal) return toast.error("Pilih tanggal pelanggaran.");
    if (!pelanggaran.trim()) return toast.error("Tuliskan jenis pelanggaran yang dilakukan.");

    setIsSaving(true);
    const pool = allStudentsAllLevels.length > 0 ? allStudentsAllLevels : semuaSiswaCurrentTingkat;
    const selectedStudentsData = pool.filter((s) => selectedNis.includes(s.nis));

    try {
      const res = await fetchGasApi("saveBankKasus", {
        date: tanggal,
        pelanggaran: pelanggaran.trim(),
        students: selectedStudentsData,
      });
      if (res.status === "success") {
        toast.success(`${selectedStudentsData.length} data pelanggaran berhasil disimpan!`);
        setPelanggaran("");
        setSelectedNis([]);
        setSearchSiswaGlobal("");
      } else {
        toast.error("Error dari server: " + res.message);
      }
    } catch (error) {
      toast.error("Gagal mengirim data ke server.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-5 pb-24 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Input Bank Kasus</h1>
        <p className="text-muted-foreground mt-1 text-xs md:text-sm">
          Catat pelanggaran kedisiplinan siswa lintas kelas dan tingkat secara massal.
        </p>
      </div>

      <div className="bg-white border border-orange-200 rounded-md overflow-hidden shadow-sm flex flex-col">
        <div className="px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-orange-900 font-bold">Tulis Jenis Pelanggaran</Label>
              <Input
                placeholder="Contoh: Merokok di kantin, Terlambat upacara, Atribut tidak lengkap..."
                value={pelanggaran}
                onChange={(e) => setPelanggaran(e.target.value)}
                className="bg-white border-orange-200 focus-visible:ring-orange-500"
              />
            </div>
            <div className="w-full md:w-48 space-y-2">
              <Label className="text-gray-700 font-bold">Tanggal Kejadian</Label>
              <Input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="bg-white border-gray-200"
              />
            </div>
          </div>

                    {/* GLOBAL SEARCH BAR LINTAS TINGKAT & KELAS */}
          <div className="relative w-full pt-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchSiswaGlobal}
              onChange={(e) => setSearchSiswaGlobal(e.target.value)}
              placeholder="🔍 Cari nama atau NIS siswa lintas semua kelas (X, XI, XII)..."
              className="pl-9 pr-8 h-10 text-xs sm:text-sm bg-orange-50/40 border-orange-200 focus:bg-white focus:border-orange-500 font-medium"
            />
            {searchSiswaGlobal && (
              <button
                onClick={() => setSearchSiswaGlobal("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* PILL CHIPS SISWA TERPILIH */}
          {selectedStudents.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-gray-400 mr-1">Terpilih ({selectedStudents.length}):</span>
              {selectedStudents.map((s) => (
                <span
                  key={s.nis}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-950 border border-orange-200 shadow-sm"
                >
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{s.nama}</span>
                  <span className="text-[10px] text-orange-700 font-bold bg-white/70 px-1 rounded">{s.kelas}</span>
                  <button
                    type="button"
                    onClick={() => toggleSiswa(s.nis)}
                    className="text-orange-700 hover:text-orange-950 p-0.5"
                    aria-label={`Hapus ${s.nama}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setSelectedNis([])}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline ml-1"
              >
                Reset Pilihan
              </button>
            </div>
          )}

          {/* ACTION & SUMMARY ROW (DI BAWAH PILL CHIPS SISWA TERPILIH) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-orange-50/70 border border-orange-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-600">Total terpilih:</span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold bg-orange-200 text-orange-950 text-xs">
                {selectedNis.length} siswa
              </span>
              {selectedNis.length === 0 && (
                <span className="text-[11px] text-gray-400 italic">(Pilih siswa dari daftar di bawah)</span>
              )}
            </div>

            <Button
              onClick={handleSimpan}
              disabled={isSaving || isFetchingSiswa || selectedNis.length === 0}
              className="font-bold bg-orange-600 hover:bg-orange-700 text-white h-9 px-5 text-xs shadow-sm w-full sm:w-auto shrink-0"
            >
              {isSaving ? "Menyimpan..." : `Simpan Pelanggaran (${selectedNis.length})`}
            </Button>
          </div>

          {/* KONDISIONAL: JIKA TIDAK SEDANG GLOBAL SEARCH -> TAMPILKAN PILIH TINGKAT & TABS KELAS */}
          {!isGlobalSearchActive ? (
            <>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-t border-gray-100 pt-3 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tingkat:</span>
                  <Select value={tingkat} onValueChange={(val) => setTingkat(val)} disabled={isFetchingSiswa}>
                    <SelectTrigger className="w-[110px] h-9 text-xs font-semibold bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Tingkat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="X">Kelas X</SelectItem>
                      <SelectItem value="XI">Kelas XI</SelectItem>
                      <SelectItem value="XII">Kelas XII</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleSemuaDisplayed}
                    disabled={displayedSiswa.length === 0}
                    className="h-8 text-xs font-semibold border-gray-200"
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1" />
                    {displayedSiswa.length > 0 && displayedSiswa.every((s) => selectedNis.includes(s.nis)) ? "Batal Semua di Kelas" : "Pilih Semua di Kelas"}
                  </Button>
                </div>
              </div>

              {daftarKelas.length > 0 && !isFetchingSiswa && (
                <div className="w-full border-t border-gray-100 px-2 sm:px-0">
                  <div className="flex overflow-x-auto scrollbar-hide pt-1">
                    {daftarKelas.map((kls) => {
                      const isActive = kelas === kls;
                      return (
                        <button
                          key={kls}
                          onClick={() => setKelas(kls)}
                          className={`relative px-5 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors outline-none ${
                            isActive ? "text-primary font-bold" : "text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          {kls}
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-lg" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between border-t border-orange-100 pt-2 text-xs">
              <span className="text-orange-950 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                Hasil pencarian lintas semua tingkat ({displayedSiswa.length} siswa ditemukan)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleSemuaDisplayed}
                  className="h-7 text-xs font-semibold border-orange-200 text-orange-900 bg-orange-50/50"
                >
                  {displayedSiswa.length > 0 && displayedSiswa.every((s) => selectedNis.includes(s.nis)) ? "Batal Semua Hasil" : "Pilih Semua Hasil"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE LIST VIEW */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100 min-h-[300px] pb-12">
          {isFetchingSiswa ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Sedang memuat data siswa...</div>
          ) : displayedSiswa.length === 0 ? (
            <div className="h-48 grid place-items-center text-center p-6 text-sm text-muted-foreground">
              {isGlobalSearchActive
                ? `Tidak ada siswa yang cocok dengan "${searchSiswaGlobal}" di seluruh tingkat.`
                : "Tidak ada data siswa pada kelas ini."}
            </div>
          ) : (
            displayedSiswa.map((siswa) => {
              const isSelected = selectedNis.includes(siswa.nis);
              return (
                <button
                  key={siswa.nis}
                  onClick={() => toggleSiswa(siswa.nis)}
                  className={`flex items-center gap-3 p-4 text-left transition-colors ${
                    isSelected ? "bg-orange-50" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSiswa(siswa.nis)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-snug text-gray-950">{siswa.nama}</div>
                    <div className="mt-1 text-[11px] text-gray-500 font-medium">
                      NIS: {siswa.nis} • <span className="font-bold text-gray-800">{siswa.kelas}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block flex-1 overflow-x-auto min-h-[300px]">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center border-r border-gray-200 font-medium">
                  <Checkbox
                    checked={
                      displayedSiswa.length > 0 &&
                      displayedSiswa.every((s) => selectedNis.includes(s.nis))
                    }
                    onCheckedChange={toggleSemuaDisplayed}
                  />
                </TableHead>
                <TableHead className="w-[120px] font-medium border-r border-gray-200">NIS</TableHead>
                <TableHead className="min-w-[200px] font-medium border-r border-gray-200">Nama Siswa</TableHead>
                <TableHead className="w-[140px] text-center font-medium">Kelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetchingSiswa ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                    Sedang memuat data siswa...
                  </TableCell>
                </TableRow>
              ) : displayedSiswa.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                    {isGlobalSearchActive
                      ? `Tidak ada siswa yang cocok dengan "${searchSiswaGlobal}" di seluruh tingkat.`
                      : "Tidak ada data siswa pada kelas ini."}
                  </TableCell>
                </TableRow>
              ) : (
                displayedSiswa.map((siswa) => {
                  const isSelected = selectedNis.includes(siswa.nis);
                  return (
                    <TableRow
                      key={siswa.nis}
                      className={`hover:bg-gray-50 cursor-pointer ${isSelected ? "bg-orange-50/60" : ""}`}
                      onClick={() => toggleSiswa(siswa.nis)}
                    >
                      <TableCell className="text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSiswa(siswa.nis)} />
                      </TableCell>
                      <TableCell className="border-r border-gray-200 text-xs font-mono text-gray-600">
                        {siswa.nis}
                      </TableCell>
                      <TableCell className="border-r border-gray-200">
                        <div className="font-semibold text-gray-900 leading-tight">{siswa.nama}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-semibold text-xs bg-gray-100 text-gray-700">
                          {siswa.kelas}
                        </Badge>
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
