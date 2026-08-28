"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileWarning, RefreshCw } from "lucide-react";

interface Kasus { idKasus: string; tanggal: string; nis: string; nama: string; kelas: string; pelanggaran: string; }

export default function DaftarKasusPage() {
  const [dataKasus, setDataKasus] = useState<Kasus[]>([]);
  const [isFetchingKasus, setIsFetchingKasus] = useState(true);

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  const fetchDaftarKasus = async () => {
    setIsFetchingKasus(true);
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=BankKasus&_v=${new Date().getTime()}`;
      const response = await fetch(gvizUrl, { mode: 'cors', credentials: 'omit' });
      const text = await response.text();
      const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
      
      if (jsonMatch && jsonMatch[1]) {
        const json = JSON.parse(jsonMatch[1]);
        if (json.status === "ok") {
          const rows = json.table.rows;
          let listKasus: Kasus[] = [];
          
          rows.forEach((row: any) => {
            const c = row.c;
            if (c && c[0]) {
              let tgl = "";
              if(c[1]?.f) tgl = c[1].f;
              else if(c[1]?.v) tgl = String(c[1].v).replace("Date(", "").replace(")", ""); 

              listKasus.push({
                idKasus: c[0].v, tanggal: tgl, nis: c[2]?.v?.toString() || "", nama: c[3]?.v || "", kelas: c[4]?.v || "", pelanggaran: c[5]?.v || ""
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

  useEffect(() => { fetchDaftarKasus(); }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Daftar Bank Kasus</h1>
          <p className="text-muted-foreground mt-1 text-sm">Seluruh catatan pelanggaran kedisiplinan siswa (Merokok, dll).</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDaftarKasus} disabled={isFetchingKasus} className="gap-2 hidden md:flex h-9 rounded-md border-gray-200 bg-white shadow-sm">
          <RefreshCw className={`w-4 h-4 ${isFetchingKasus ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col">
        {/* HEADER DIV */}
        <div className="bg-white border-b border-gray-200 p-4 sm:px-6 sm:py-5 flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold leading-none flex items-center gap-2"><FileWarning className="w-5 h-5 text-orange-500"/> Riwayat Pelanggaran</h3>
            <p className="text-sm text-gray-500 mt-1">Total ada {dataKasus.length} catatan pelanggaran di database.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDaftarKasus} disabled={isFetchingKasus} className="md:hidden h-8 w-8 p-0 border-gray-200">
             <RefreshCw className={`w-4 h-4 ${isFetchingKasus ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* CONTENT DIV */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100 min-h-[320px]">
          {isFetchingKasus ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Mencari data pelanggaran...</div>
          ) : dataKasus.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Belum ada pelanggaran yang dicatat.</div>
          ) : (
            dataKasus.map((kasus) => {
              let formattedDate = String(kasus.tanggal);
              if(formattedDate.includes(",")) {
                const pts = formattedDate.split(",");
                if(pts.length >= 3) formattedDate = `${pts[0]}-${(parseInt(pts[1]) + 1).toString().padStart(2,'0')}-${pts[2].toString().padStart(2,'0')}`;
              }
              return (
                <div key={kasus.idKasus} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-950 leading-snug">{kasus.nama}</div>
                      <div className="mt-1 text-[11px] text-gray-500">{kasus.kelas}</div>
                    </div>
                    <div className="shrink-0 text-[11px] font-medium text-gray-500">{formattedDate.substring(0, 10)}</div>
                  </div>
                  <div className="rounded-md border border-orange-100 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">{kasus.pelanggaran}</div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block flex-1 overflow-x-auto min-h-[400px]">
          <Table className="text-sm">
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px] text-center border-r border-gray-200 font-semibold">No</TableHead>
                <TableHead className="min-w-[180px] border-r border-gray-200 font-semibold">Nama Siswa & Kelas</TableHead>
                <TableHead className="min-w-[250px] border-r border-gray-200 font-semibold">Jenis Pelanggaran</TableHead>
                <TableHead className="text-right pr-6 w-[120px] font-semibold">Tanggal Kejadian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetchingKasus ? (
                <TableRow><TableCell colSpan={4} className="h-48 text-center text-muted-foreground">Mencari data ke database...</TableCell></TableRow>
              ) : dataKasus.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-48 text-center text-muted-foreground">Belum ada pelanggaran yang dicatat. Sekolah tertib!</TableCell></TableRow>
              ) : (
                dataKasus.map((kasus, idx) => {
                  let formattedDate = String(kasus.tanggal);
                  if(formattedDate.includes(",")) {
                    const pts = formattedDate.split(",");
                    if(pts.length >= 3) {
                       const m = parseInt(pts[1]) + 1;
                       formattedDate = `${pts[0]}-${m.toString().padStart(2,'0')}-${pts[2].toString().padStart(2,'0')}`;
                    }
                  }

                  return (
                    <TableRow key={kasus.idKasus} className="hover:bg-gray-50/50">
                      <TableCell className="text-center text-muted-foreground font-medium border-r border-gray-200">{idx + 1}</TableCell>
                      <TableCell className="border-r border-gray-200">
                        <div className="font-semibold text-gray-900">{kasus.nama}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{kasus.kelas}</div>
                      </TableCell>
                      <TableCell className="border-r border-gray-200">
                        <div className="text-sm text-gray-800 font-medium">{kasus.pelanggaran}</div>
                      </TableCell>
                      <TableCell className="text-right pr-6 text-xs font-semibold text-gray-600">
                        {formattedDate.substring(0, 10)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
