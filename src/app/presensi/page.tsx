"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchGasApi } from "@/lib/api";

type StatusAbsen = "HADIR" | "SAKIT" | "IZIN" | "ALPHA";
interface Siswa { nis: string; nama: string; kelas: string; }

export default function PresensiHarianPage() {
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split("T")[0]); 
  const [tingkat, setTingkat] = useState<string>("X");
  const [kelas, setKelas] = useState<string>("");
  const [daftarKelas, setDaftarKelas] = useState<string[]>([]);
  const [semuaSiswa, setSemuaSiswa] = useState<Siswa[]>([]);
  
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusSiswa, setStatusSiswa] = useState<Record<string, StatusAbsen>>({});

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

  const handleSimpan = async () => {
    if(filterSiswa.length === 0) return toast.error("Tidak ada siswa.");
    if(!tanggal) return toast.error("Pilih tanggal.");
    
    setIsSaving(true);
    const dataKirim = filterSiswa.map(s => ({
      nis: s.nis, nama: s.nama, kelas: s.kelas, status_presensi: statusSiswa[s.nis], ada_surat_dokter: false
    }));

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
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Input Presensi Harian</h1>
        <p className="text-muted-foreground mt-1 text-sm">Default status siswa adalah HADIR. Klik opsi untuk mengubah.</p>
      </div>

      <div className="bg-white border sm:border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* HEADER */}
        <div className="border-b border-gray-200 px-4 sm:px-6 pt-4 sm:pt-6 pb-0 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-start justify-between pb-4">
            <div>
              <h3 className="text-lg font-bold leading-none">Daftar Siswa</h3>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto items-center justify-between md:justify-end">
              <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 bg-gray-50 h-10 w-full md:w-auto flex-1 md:flex-none">
                <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Tanggal:</span>
                <input 
                  type="date" 
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="bg-transparent text-sm font-semibold outline-none py-1 w-full"
                />
              </div>

              <Select value={tingkat} onValueChange={(val) => { if(val) setTingkat(val); }} disabled={isFetching}>
                <SelectTrigger className="w-[110px] h-10 bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="X">Kelas X</SelectItem>
                  <SelectItem value="XI">Kelas XI</SelectItem>
                  <SelectItem value="XII">Kelas XII</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {daftarKelas.length > 0 && !isFetching && (
            <div className="w-full">
              <div className="flex overflow-x-auto scrollbar-hide">
                {!isFetching && daftarKelas.map(kls => {
                  const isActive = kelas === kls;
                  return (
                    <button
                      key={kls}
                      onClick={() => setKelas(kls)}
                      className={`
                        relative px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors outline-none
                        ${isActive ? "text-primary" : "text-gray-500 hover:text-gray-800"}
                      `}
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
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-x-auto min-h-[300px]">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[40px] text-center border-r border-gray-200 font-medium">No</TableHead>
                <TableHead className="min-w-[150px] border-r border-gray-200 font-medium">Nama Siswa</TableHead>
                <TableHead className="min-w-[280px] text-center font-medium">Status Absensi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                    Sedang memuat data...
                  </TableCell>
                </TableRow>
              ) : filterSiswa.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                    Tidak ada data siswa untuk kelas {kelas || '(Belum dipilih)'}.
                  </TableCell>
                </TableRow>
              ) : (
                filterSiswa.map((siswa, i) => {
                  const status = statusSiswa[siswa.nis];
                  return (
                    <TableRow key={siswa.nis} className="hover:bg-gray-50/50">
                      <TableCell className="text-center font-medium text-gray-500 border-r border-gray-200">{i + 1}</TableCell>
                      <TableCell className="border-r border-gray-200">
                        <div className="font-semibold text-gray-900 leading-tight">{siswa.nama}</div>
                      </TableCell>
                      <TableCell className="p-2 sm:p-4">
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
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* FOOTER */}
        <div className="border-t border-gray-200 p-4 sm:px-6 sm:py-4 bg-gray-50/50 flex justify-end">
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
    </div>
  );
}
