"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileWarning, RefreshCw, Search, X, Filter } from "lucide-react";

interface Kasus {
  idKasus: string;
  tanggal: string;
  nis: string;
  nama: string;
  kelas: string;
  pelanggaran: string;
}

export default function DaftarKasusPage() {
  const [dataKasus, setDataKasus] = useState<Kasus[]>([]);
  const [isFetchingKasus, setIsFetchingKasus] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("SEMUA");

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  const fetchDaftarKasus = async () => {
    setIsFetchingKasus(true);
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=BankKasus&_v=${new Date().getTime()}`;
      const response = await fetch(gvizUrl, { mode: "cors", credentials: "omit" });
      const text = await response.text();
      const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);

      if (jsonMatch && jsonMatch[1]) {
        const json = JSON.parse(jsonMatch[1]);
        if (json.status === "ok") {
          const rows = json.table.rows;
          const listKasus: Kasus[] = [];

          rows.forEach((row: any) => {
            const c = row.c;
            if (c && c[0]) {
              let tgl = "";
              if (c[1]?.f) tgl = c[1].f;
              else if (c[1]?.v) tgl = String(c[1].v).replace("Date(", "").replace(")", "");

              listKasus.push({
                idKasus: c[0].v,
                tanggal: tgl,
                nis: c[2]?.v?.toString() || "",
                nama: c[3]?.v || "",
                kelas: c[4]?.v || "",
                pelanggaran: c[5]?.v || "",
              });
            }
          });
          setDataKasus(listKasus.reverse());
        }
      }
    } catch (err) {
      toast.error("Gagal menarik data Bank Kasus dari server.");
    } finally {
      setIsFetchingKasus(false);
    }
  };

  useEffect(() => {
    fetchDaftarKasus();
  }, []);

  // Daftar kelas unik dari database
  const daftarKelasUnik = useMemo(() => {
    const list = Array.from(new Set(dataKasus.map((k) => k.kelas))).filter(Boolean);
    return list.sort();
  }, [dataKasus]);

  // Real-time filtering berdasarkan Nama, NIS, Kelas, dan Jenis Pelanggaran
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return dataKasus.filter((item) => {
      const matchKelas = selectedKelas === "SEMUA" || item.kelas === selectedKelas;
      const matchQuery =
        !query ||
        item.nama.toLowerCase().includes(query) ||
        item.nis.toLowerCase().includes(query) ||
        item.kelas.toLowerCase().includes(query) ||
        item.pelanggaran.toLowerCase().includes(query);

      return matchKelas && matchQuery;
    });
  }, [dataKasus, searchQuery, selectedKelas]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedKelas("SEMUA");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-5 pb-24 md:pb-0">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3 mb-2 md:mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Daftar Bank Kasus</h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm">
            Pencarian dan rekap pelanggaran kedisiplinan siswa (Merokok, Terlambat, Atribut, dll).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDaftarKasus}
          disabled={isFetchingKasus}
          className="gap-2 hidden md:flex h-9 rounded-md border-gray-200 bg-white shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isFetchingKasus ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-gray-200 rounded-md p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa, NIS, kelas, atau jenis pelanggaran..."
            className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-gray-50 border-gray-200 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select value={selectedKelas} onValueChange={(val) => setSelectedKelas(val)} disabled={isFetchingKasus}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs font-semibold bg-gray-50 border-gray-200">
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Kelas</SelectItem>
              {daftarKelasUnik.map((kls) => (
                <SelectItem key={kls} value={kls}>
                  {kls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || selectedKelas !== "SEMUA") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* CONTAINER TABEL / LIST */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col">
        {/* HEADER DIV */}
        <div className="bg-white border-b border-gray-200 p-4 sm:px-6 sm:py-4 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold leading-none flex items-center gap-2">
              <FileWarning className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" /> Riwayat Pelanggaran
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Menampilkan {filteredData.length} dari {dataKasus.length} catatan pelanggaran.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDaftarKasus}
            disabled={isFetchingKasus}
            className="md:hidden h-8 w-8 p-0 border-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingKasus ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* MOBILE VIEW */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100 min-h-[320px]">
          {isFetchingKasus ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Mencari data pelanggaran...</div>
          ) : filteredData.length === 0 ? (
            <div className="h-48 grid place-items-center text-center p-6 text-sm text-muted-foreground">
              {searchQuery || selectedKelas !== "SEMUA"
                ? "Tidak ada data siswa yang cocok dengan kata kunci pencarian."
                : "Belum ada pelanggaran yang dicatat."}
            </div>
          ) : (
            filteredData.map((kasus) => {
              let formattedDate = String(kasus.tanggal);
              if (formattedDate.includes(",")) {
                const pts = formattedDate.split(",");
                if (pts.length >= 3)
                  formattedDate = `${pts[0]}-${(parseInt(pts[1]) + 1).toString().padStart(2, "0")}-${pts[2]
                    .toString()
                    .padStart(2, "0")}`;
              }
              return (
                <div key={kasus.idKasus} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-950 leading-snug">{kasus.nama}</div>
                      <div className="mt-0.5 text-[11px] text-gray-500 font-medium">
                        NIS: {kasus.nis} • <span className="font-bold text-gray-700">{kasus.kelas}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                      {formattedDate.substring(0, 10)}
                    </div>
                  </div>
                  <div className="rounded-md border border-orange-100 bg-orange-50/80 px-3 py-2 text-xs font-medium text-orange-900 leading-relaxed">
                    {kasus.pelanggaran}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block flex-1 overflow-x-auto min-h-[400px]">
          <Table className="text-sm">
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center border-r border-gray-200 font-semibold">No</TableHead>
                <TableHead className="w-[110px] border-r border-gray-200 font-semibold">NIS</TableHead>
                <TableHead className="min-w-[180px] border-r border-gray-200 font-semibold">Nama Siswa</TableHead>
                <TableHead className="w-[110px] text-center border-r border-gray-200 font-semibold">Kelas</TableHead>
                <TableHead className="min-w-[240px] border-r border-gray-200 font-semibold">Jenis Pelanggaran</TableHead>
                <TableHead className="text-right pr-6 w-[130px] font-semibold">Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetchingKasus ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    Mencari data ke database...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    {searchQuery || selectedKelas !== "SEMUA"
                      ? "Tidak ada siswa yang sesuai dengan filter / pencarian."
                      : "Belum ada pelanggaran yang dicatat. Sekolah tertib!"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((kasus, idx) => {
                  let formattedDate = String(kasus.tanggal);
                  if (formattedDate.includes(",")) {
                    const pts = formattedDate.split(",");
                    if (pts.length >= 3) {
                      const m = parseInt(pts[1]) + 1;
                      formattedDate = `${pts[0]}-${m.toString().padStart(2, "0")}-${pts[2].toString().padStart(2, "0")}`;
                    }
                  }

                  return (
                    <TableRow key={kasus.idKasus} className="hover:bg-gray-50/50">
                      <TableCell className="text-center text-muted-foreground font-medium border-r border-gray-200 py-3">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="border-r border-gray-200 text-xs font-mono text-gray-600">
                        {kasus.nis}
                      </TableCell>
                      <TableCell className="border-r border-gray-200 font-semibold text-gray-900">
                        {kasus.nama}
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-200">
                        <Badge variant="secondary" className="font-semibold text-xs bg-gray-100 text-gray-700">
                          {kasus.kelas}
                        </Badge>
                      </TableCell>
                      <TableCell className="border-r border-gray-200">
                        <span className="text-xs font-medium text-orange-950 bg-orange-50/60 px-2 py-1 rounded border border-orange-100 inline-block">
                          {kasus.pelanggaran}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6 text-xs font-semibold text-gray-600">
                        {formattedDate.substring(0, 10)}
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
