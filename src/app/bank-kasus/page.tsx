"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchGasApi } from "@/lib/api";
import { Search, X, CheckSquare, Users } from "lucide-react";

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
  const [semuaSiswa, setSemuaSiswa] = useState<Siswa[]>([]);

  const [isFetchingSiswa, setIsFetchingSiswa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [pelanggaran, setPelanggaran] = useState<string>("");
  const [selectedNis, setSelectedNis] = useState<string[]>([]);
  const [searchSiswa, setSearchSiswa] = useState<string>("");

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  useEffect(() => {
    const loadStudents = async () => {
      setIsFetchingSiswa(true);
      setKelas("");
      setDaftarKelas([]);
      setSelectedNis([]);
      setSearchSiswa("");
      try {
        const sheetName = `Siswa_${tingkat}`;
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}&_v=${new Date().getTime()}`;
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
          setSemuaSiswa(students);
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

  const filterSiswa = useMemo(() => {
    return semuaSiswa.filter((s) => s.kelas === kelas);
  }, [semuaSiswa, kelas]);

  const displayedSiswa = useMemo(() => {
    const q = searchSiswa.toLowerCase().trim();
    if (!q) return filterSiswa;
    return filterSiswa.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
    );
  }, [filterSiswa, searchSiswa]);

  const toggleSiswa = (nis: string) => {
    setSelectedNis((prev) => (prev.includes(nis) ? prev.filter((n) => n !== nis) : [...prev, nis]));
  };

  const toggleSemuaSiswa = () => {
    if (selectedNis.length === filterSiswa.length) {
      setSelectedNis([]);
    } else {
      setSelectedNis(filterSiswa.map((s) => s.nis));
    }
  };

  const handleSimpan = async () => {
    if (selectedNis.length === 0) return toast.error("Pilih minimal 1 siswa.");
    if (!tanggal) return toast.error("Pilih tanggal pelanggaran.");
    if (!pelanggaran.trim()) return toast.error("Tuliskan jenis pelanggaran yang dilakukan.");

    setIsSaving(true);
    const selectedStudentsData = semuaSiswa.filter((s) => selectedNis.includes(s.nis));

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
        setSearchSiswa("");
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
          Catat pelanggaran kedisiplinan siswa (Merokok, Terlambat, Atribut, dll) secara massal.
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

          {/* PILIH TINGKAT & TABS KELAS */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-t border-gray-100 pt-4 gap-3">
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

            {/* QUICK ACTIONS & SUMMARY */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <span className="text-xs font-medium text-gray-500">
                Terpilih: <strong className="text-orange-700 font-bold">{selectedNis.length}</strong> siswa
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSemuaSiswa}
                disabled={filterSiswa.length === 0}
                className="h-8 text-xs font-semibold border-gray-200"
              >
                <CheckSquare className="w-3.5 h-3.5 mr-1" />
                {selectedNis.length === filterSiswa.length && filterSiswa.length > 0 ? "Batal Semua" : "Pilih Semua"}
              </Button>
            </div>
          </div>

          {/* TAB KELAS */}
          {daftarKelas.length > 0 && !isFetchingSiswa && (
            <div className="w-full border-t border-gray-100 px-2 sm:px-0">
              <div className="flex overflow-x-auto scrollbar-hide pt-1">
                {daftarKelas.map((kls) => {
                  const isActive = kelas === kls;
                  return (
                    <button
                      key={kls}
                      onClick={() => {
                        setKelas(kls);
                        setSearchSiswa("");
                      }}
                      className={`relative px-5 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors outline-none ${
                        isActive ? "text-primary font-bold" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {kls}
                      {isActive && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-lg" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEARCH BAR SISWA DALAM KELAS */}
          <div className="relative w-full pt-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchSiswa}
              onChange={(e) => setSearchSiswa(e.target.value)}
              placeholder={`Cari nama atau NIS siswa di kelas ${kelas || ""}...`}
              className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-gray-50/80 border-gray-200 focus:bg-white"
            />
            {searchSiswa && (
              <button
                onClick={() => setSearchSiswa("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* MOBILE VIEW */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100 min-h-[300px] pb-32">
          {isFetchingSiswa ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Sedang memuat data siswa...</div>
          ) : displayedSiswa.length === 0 ? (
            <div className="h-48 grid place-items-center text-center p-6 text-sm text-muted-foreground">
              {searchSiswa ? "Tidak ada siswa yang sesuai kata kunci pencarian." : "Tidak ada data siswa."}
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
                      NIS: {siswa.nis} • {siswa.kelas}
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
                    checked={filterSiswa.length > 0 && selectedNis.length === filterSiswa.length}
                    onCheckedChange={toggleSemuaSiswa}
                  />
                </TableHead>
                <TableHead className="w-[120px] font-medium border-r border-gray-200">NIS</TableHead>
                <TableHead className="min-w-[200px] font-medium border-r border-gray-200">Nama Siswa</TableHead>
                <TableHead className="w-[120px] text-center font-medium">Kelas</TableHead>
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
                    {searchSiswa
                      ? "Tidak ada siswa yang sesuai dengan kata kunci pencarian."
                      : "Tidak ada data siswa."}
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
                      <TableCell className="text-center text-xs font-medium text-gray-600">
                        {siswa.kelas}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="border-t border-gray-200 p-4 bg-gray-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            Total siswa terpilih untuk dicatat pelanggaran:{" "}
            <span className="font-bold text-orange-900">{selectedNis.length} siswa</span>
          </div>
          <Button
            onClick={handleSimpan}
            disabled={isSaving || isFetchingSiswa || selectedNis.length === 0}
            className="w-full sm:w-auto font-bold bg-orange-600 hover:bg-orange-700 text-white h-10 px-6 shadow-sm"
          >
            {isSaving ? "Menyimpan ke Server..." : `Simpan Pelanggaran (${selectedNis.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
