"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchGasApi } from "@/lib/api";

interface Siswa { nis: string; nama: string; kelas: string; }

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

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  useEffect(() => {
    const loadStudents = async () => {
      setIsFetchingSiswa(true);
      setKelas("");
      setDaftarKelas([]);
      setSelectedNis([]);
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
              students.push({ kelas: c[1].v?.toString() || "", nis: c[2].v?.toString() || "", nama: c[3].v?.toString() || "" });
            }
          });
          setSemuaSiswa(students);
          const uniqueClasses = Array.from(new Set(students.map(s => s.kelas))).filter(Boolean).sort();
          setDaftarKelas(uniqueClasses);
          if(uniqueClasses.length > 0) setKelas(uniqueClasses[0]);
        }
      } catch (error) { toast.error("Gagal memuat data siswa."); } 
      finally { setIsFetchingSiswa(false); }
    };
    loadStudents();
  }, [tingkat]);

  const filterSiswa = semuaSiswa.filter(s => s.kelas === kelas);

  const toggleSiswa = (nis: string) => {
    setSelectedNis(prev => prev.includes(nis) ? prev.filter(n => n !== nis) : [...prev, nis]);
  };

  const toggleSemuaSiswa = () => {
    if (selectedNis.length === filterSiswa.length) setSelectedNis([]);
    else setSelectedNis(filterSiswa.map(s => s.nis));
  };

  const handleSimpan = async () => {
    if(selectedNis.length === 0) return toast.error("Pilih minimal 1 siswa.");
    if(!tanggal) return toast.error("Pilih tanggal pelanggaran.");
    if(!pelanggaran.trim()) return toast.error("Tuliskan jenis pelanggaran yang dilakukan.");
    
    setIsSaving(true);
    const selectedStudentsData = semuaSiswa.filter(s => selectedNis.includes(s.nis));

    try {
      const res = await fetchGasApi("saveBankKasus", { date: tanggal, pelanggaran: pelanggaran.trim(), students: selectedStudentsData });
      if(res.status === "success") {
        toast.success(`${selectedStudentsData.length} data pelanggaran berhasil disimpan!`);
        setPelanggaran("");
        setSelectedNis([]);
      } else { toast.error("Error dari server: " + res.message); }
    } catch (error) { toast.error("Gagal mengirim data ke server."); } 
    finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Input Bank Kasus</h1>
        <p className="text-muted-foreground mt-1 text-sm">Catat pelanggaran kedisiplinan (Merokok, Terlambat, Atribut, dll) secara massal.</p>
      </div>

      <div className="bg-orange-50/50 border sm:border border-orange-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-4">
           <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-orange-900 font-bold">Tulis Jenis Pelanggaran</Label>
                <Input placeholder="Contoh: Merokok di kantin, Terlambat upacara..." value={pelanggaran} onChange={(e) => setPelanggaran(e.target.value)} className="bg-white border-orange-200 focus-visible:ring-orange-500"/>
              </div>
              <div className="md:w-1/4 space-y-2">
                <Label className="text-orange-900 font-bold">Tanggal Kejadian</Label>
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-white border-orange-200 focus-visible:ring-orange-500"/>
              </div>
           </div>
           
           <div className="pt-4 mt-2 flex justify-between items-center border-t border-orange-200/60">
             <span className="text-sm font-medium text-orange-800">{selectedNis.length} siswa terpilih</span>
             <Button onClick={handleSimpan} disabled={isSaving || selectedNis.length === 0 || !pelanggaran} className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-9">
                {isSaving ? "Menyimpan..." : "Simpan Pelanggaran"}
             </Button>
           </div>
        </div>
      </div>

      <div className="bg-white border sm:border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="border-b border-gray-200 px-4 sm:px-6 pt-4 sm:pt-6 pb-0 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-start justify-between pb-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold leading-none">Pilih Siswa Pelanggar</h3>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto items-center justify-between md:justify-end">
              <Select value={tingkat} onValueChange={(val) => { if(val) setTingkat(val); }} disabled={isFetchingSiswa}>
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

          {daftarKelas.length > 0 && !isFetchingSiswa && (
            <div className="w-full border-t border-gray-100 px-2 sm:px-0">
              <div className="flex overflow-x-auto scrollbar-hide pt-1">
                {daftarKelas.map(kls => {
                  const isActive = kelas === kls;
                  return (
                    <button
                      key={kls}
                      onClick={() => setKelas(kls)}
                      className={`relative px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors outline-none ${isActive ? "text-primary" : "text-gray-500 hover:text-gray-800"}`}
                    >
                      {kls}
                      {isActive && (<div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-lg" />)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-x-auto min-h-[300px]">
          <Table>
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center border-r border-gray-200 font-medium">
                  <Checkbox checked={filterSiswa.length > 0 && selectedNis.length === filterSiswa.length} onCheckedChange={toggleSemuaSiswa}/>
                </TableHead>
                <TableHead className="min-w-[150px] font-medium border-r border-gray-200">Nama Siswa</TableHead>
                <TableHead className="w-[100px] text-center font-medium">NIS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetchingSiswa ? (
                <TableRow><TableCell colSpan={3} className="h-48 text-center text-muted-foreground">Sedang memuat data siswa...</TableCell></TableRow>
              ) : filterSiswa.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="h-48 text-center text-muted-foreground">Tidak ada data siswa.</TableCell></TableRow>
              ) : (
                filterSiswa.map((siswa) => {
                  const isSelected = selectedNis.includes(siswa.nis);
                  return (
                    <TableRow 
                      key={siswa.nis} 
                      className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-orange-50/50' : ''}`}
                      onClick={() => toggleSiswa(siswa.nis)}
                    >
                      <TableCell className="text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleSiswa(siswa.nis)}/>
                      </TableCell>
                      <TableCell className="border-r border-gray-200">
                        <div className="font-semibold text-gray-900 leading-tight">{siswa.nama}</div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-500">{siswa.nis}</TableCell>
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
