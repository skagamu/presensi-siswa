"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, Printer, UploadCloud, RefreshCw, ArrowRight, Users, CheckCircle, XCircle, FileWarning } from "lucide-react";
import { fetchGasApi, fetchGasApiGet } from "@/lib/api";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AlertData { idPeringatan: string; nis: string; nama: string; kelas: string; tingkatKumulatif: number; totalHariAbsen: number; status: string; waktuDibuat: string; }
interface KasusTerakhir { idKasus: string; tanggal: string; nama: string; kelas: string; pelanggaran: string; }
interface StatsData { 
  tanggal: string; totalMurid: number; hadirHariIni: number; absenHariIni: number; persentaseKehadiran: number; 
  breakdown: { SAKIT: number, IZIN: number, ALPHA: number };
  chart: { weekly: { label: string, hadir: number, absen: number }[]; monthly: { label: string, hadir: number, absen: number }[]; }
}

export default function DashboardPage() {
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertData[] | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [kasusTerakhir, setKasusTerakhir] = useState<KasusTerakhir[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartMode, setChartMode] = useState<"weekly" | "monthly">("weekly");

  const SHEET_ID = "1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY";

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const resStats = await fetchGasApiGet("getDashboardStats");
      if(resStats.status === "success") setStats(resStats.data);

      const gvizUrlAlert = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=PeringatanKasus&_v=${new Date().getTime()}`;
      const resAlert = await fetch(gvizUrlAlert, { mode: 'cors', credentials: 'omit' });
      const textAlert = await resAlert.text();
      const jsonMatchAlert = textAlert.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
      if (jsonMatchAlert && jsonMatchAlert[1]) {
        const json = JSON.parse(jsonMatchAlert[1]);
        if (json.status === "ok") {
          const rows = json.table.rows;
          let activeAlerts: AlertData[] = [];
          rows.forEach((row: any) => {
            const c = row.c;
            if (c && c[0] && c[6] && c[6].v === "AKTIF") {
              activeAlerts.push({
                idPeringatan: c[0].v, nis: c[1] ? c[1].v.toString() : "", nama: c[2] ? c[2].v : "", kelas: c[3] ? c[3].v : "",
                tingkatKumulatif: c[4] ? Number(c[4].v) : 0, totalHariAbsen: c[5] ? Number(c[5].v) : 0, status: c[6].v, waktuDibuat: c[7] ? c[7].f || c[7].v : ""
              });
            }
          });
          activeAlerts.sort((a, b) => b.tingkatKumulatif - a.tingkatKumulatif);
          setAlerts(activeAlerts);
        }
      }

      const gvizUrlKasus = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=BankKasus&_v=${new Date().getTime()}`;
      const resKasus = await fetch(gvizUrlKasus, { mode: 'cors', credentials: 'omit' });
      const textKasus = await resKasus.text();
      const jsonMatchKasus = textKasus.match(/google\.visualization\.Query\.setResponse\((.*)\);?/);
      if (jsonMatchKasus && jsonMatchKasus[1]) {
        const json = JSON.parse(jsonMatchKasus[1]);
        if (json.status === "ok") {
          const rows = json.table.rows;
          let listKasus: KasusTerakhir[] = [];
          rows.forEach((row: any) => {
            const c = row.c;
            if (c && c[0]) {
              let tgl = "";
              if(c[1]?.f) tgl = c[1].f;
              else if(c[1]?.v) tgl = String(c[1].v).replace("Date(", "").replace(")", ""); 
              listKasus.push({ idKasus: c[0].v, tanggal: tgl, nama: c[3]?.v || "", kelas: c[4]?.v || "", pelanggaran: c[5]?.v || "" });
            }
          });
          setKasusTerakhir(listKasus.slice(-5).reverse());
        }
      }
    } catch (err: any) {
      toast.error(`Error mengambil data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const getTindakanInfo = (tingkat: number) => {
    switch (tingkat) { case 1: return "Teguran Lisan / SP 1"; case 2: return "Home Visit / Ortu"; case 3: return "Skorsing / Konferensi"; case 4: return "Sidang Akhir DO"; default: return ""; }
  };

  const getBadgeColor = (tingkat: number) => {
    switch (tingkat) { case 1: return "bg-yellow-50 text-yellow-800 border-yellow-200"; case 2: return "bg-orange-50 text-orange-800 border-orange-200"; case 3: return "bg-red-50 text-red-700 border-red-200"; case 4: return "bg-red-600 text-white border-red-700"; default: return ""; }
  };

  const handleUploadResolution = async (alert: AlertData, e: React.FormEvent) => {
    const idPeringatan = alert.idPeringatan;
    e.preventDefault();
    setIsUploading(idPeringatan);
    const notes = (document.getElementById(`notes-${idPeringatan}`) as HTMLTextAreaElement).value;

    try {
      const res = await fetchGasApi("resolveCase", { 
        id_peringatan: alert.idPeringatan, 
        nis: alert.nis,
        nama: alert.nama,
        kelas: alert.kelas,
        catatan_konseling: notes || "Diselesaikan", 
        ditangani_oleh: "Guru BK", 
        fileName: "bukti.pdf", 
        pdfBase64: "dummy" 
      });
      if (res.status === "success") {
        toast.success("Dokumen berhasil diunggah! Kasus ditutup.");
        if (alerts) setAlerts(alerts.filter(a => a.idPeringatan !== idPeringatan));
      } else {
        toast.error("Gagal resolve: " + res.message);
      }
    } catch (error) { toast.error("Gagal mengirim perintah resolusi."); } 
    finally { setIsUploading(null); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-5">
      <div className="mb-4 flex items-start justify-between gap-3 md:mb-5 md:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Dashboard BK</h1>
          <p className="text-muted-foreground mt-1 text-xs md:text-sm">Ikhtisar harian kedisiplinan & presensi siswa sekolah.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={isLoading} className="h-9 shrink-0 gap-2 rounded-md border-gray-200 bg-white px-3 shadow-sm">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isLoading ? "Refreshing..." : "Refresh"}</span>
        </Button>
      </div>

      {/* TOP WIDGET STATS - REFACTORED TO NATIVE DIVS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
        
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col p-3 md:p-4 gap-2 min-h-[92px] md:min-h-[104px]">
          <div className="flex flex-row items-center justify-between">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Siswa</h3>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl md:text-2xl font-semibold text-gray-900">{stats ? stats.totalMurid : "..."}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col p-3 md:p-4 gap-2 min-h-[92px] md:min-h-[104px]">
          <div className="flex flex-row items-center justify-between">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Hadir Hari Ini</h3>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-xl md:text-2xl font-semibold text-green-600">{stats ? stats.hadirHariIni : "..."}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col p-3 md:p-4 gap-1 min-h-[92px] md:min-h-[104px]">
          <div className="flex flex-row items-center justify-between">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Absen Hari Ini</h3>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex flex-col items-start gap-1 mt-1 md:flex-row md:items-end md:gap-2">
            <div className="text-xl md:text-2xl font-semibold text-red-600 leading-none">{stats ? stats.absenHariIni : "..."}</div>
            <span className="text-[10px] sm:text-xs text-muted-foreground md:pb-0.5">{stats ? `S:${stats.breakdown.SAKIT} I:${stats.breakdown.IZIN} A:${stats.breakdown.ALPHA}` : ""}</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col p-3 md:p-4 gap-2 min-h-[92px] md:min-h-[104px]">
          <div className="flex flex-row items-center justify-between">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">% Kehadiran</h3>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-xl md:text-2xl font-semibold text-gray-900">{stats ? `${stats.persentaseKehadiran}%` : "..."}</div>
          <div className={`w-fit text-[10px] font-bold px-2 py-0.5 rounded-full ${stats && stats.persentaseKehadiran < 90 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>Tgt &gt; 95%</div>
        </div>
      </div>

      {/* TWO COLUMNS LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 pt-2">
        
        {/* KOLOM KIRI: PRIORITY ALERTS & CHART */}
        <div className="xl:col-span-8 space-y-5">
          
          <div>
            <div className="flex justify-between items-end mb-2.5 md:mb-3">
               <h2 className="text-lg font-semibold tracking-tight text-gray-950">Priority Alerts Top 3</h2>
               <Link href="/semua-alert" className="text-sm font-semibold text-primary hover:underline">Lihat Semua Alerts</Link>
            </div>

            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="p-6 flex flex-col items-center justify-center text-muted-foreground border rounded-md bg-white h-[80px]">
                  <RefreshCw className="w-5 h-5 animate-spin text-gray-300" />
                </div>
              ) : alerts && alerts.length === 0 ? (
                <div className="p-6 text-center bg-green-50 text-green-700 border border-green-200 rounded-md font-medium text-sm">Tidak ada Active Alert saat ini. Sekolah kondusif!</div>
              ) : (
                alerts?.slice(0, 3).map((alert) => {
                  const isCritical = alert.tingkatKumulatif >= 3;
                  return (
                    // RIBBON ALERT (Murni HTML DIV Tanpa Komponen Card Shadcn)
                    <div key={alert.idPeringatan} className={`flex flex-col md:flex-row md:items-center justify-between px-3 py-3 md:px-4 rounded-md border transition-all gap-3 md:gap-4 bg-white shadow-sm ${isCritical ? 'border-l-[4px] border-l-red-500 border-red-200' : 'border-l-[4px] border-l-orange-400 border-orange-200'}`}>
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-1.5 sm:p-2 rounded-md flex-shrink-0 ${isCritical ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex flex-col justify-center flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className={`text-sm sm:text-base font-bold leading-none ${isCritical ? 'text-red-900' : 'text-gray-900'}`}>{alert.nama}</h3>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 leading-none h-4 sm:h-5 flex items-center">{alert.kelas}</span>
                            <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md border leading-none h-4 sm:h-5 flex items-center ${isCritical ? 'text-red-600 bg-red-50 border-red-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>{alert.totalHariAbsen} Hari Absen</span>
                          </div>
                          <p className={`text-[11px] sm:text-xs mt-1 font-medium ${isCritical ? 'text-red-700' : 'text-gray-500'}`}>Level {alert.tingkatKumulatif} — Rekomendasi: {getTindakanInfo(alert.tingkatKumulatif)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:flex md:items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto">
                        <Button variant="outline" size="sm" onClick={() => generateSuratTugasDocx(alert)} className="h-9 md:h-8 px-3 gap-1.5 text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200 rounded-md text-xs sm:text-sm font-semibold">
                          <FileDown className="w-3.5 h-3.5" /><span className="truncate">Surat (.docx)</span>
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className={`h-9 md:h-8 px-3 gap-1.5 font-semibold rounded-md text-xs sm:text-sm ${isCritical ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}>
                              <span className="truncate">Upload Bukti</span><ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <form onSubmit={(e) => handleUploadResolution(alert, e)}>
                              <DialogHeader><DialogTitle>Selesaikan Kasus - {alert.nama}</DialogTitle></DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="p-3 bg-gray-50 text-gray-700 text-sm rounded-md border flex flex-col gap-2"><p>Tindakan yang disarankan: <strong>{getTindakanInfo(alert.tingkatKumulatif)}</strong>.</p></div>
                                <div className="space-y-2 pt-2"><Label htmlFor="file">Upload File Bukti (.pdf)</Label><Input id="file" type="file" accept=".pdf" /></div>
                                <div className="space-y-2"><Label htmlFor={`notes-${alert.idPeringatan}`}>Catatan Tindakan</Label><Textarea id={`notes-${alert.idPeringatan}`} placeholder="Tuliskan hasil intervensi..." required /></div>
                              </div>
                              <DialogFooter><Button type="submit" disabled={isUploading === alert.idPeringatan} className="w-full sm:w-auto font-semibold">{isUploading === alert.idPeringatan ? "Mengunggah..." : "Submit & Tutup Kasus"}</Button></DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            {/* BAR CHART REFACTORED TO NATIVE DIV */}
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-none">Trend Kehadiran Siswa</h3>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                   <button onClick={() => setChartMode("weekly")} className={`flex-1 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${chartMode === "weekly" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}>Mingguan</button>
                   <button onClick={() => setChartMode("monthly")} className={`flex-1 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${chartMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-gray-500"}`}>Bulanan</button>
                </div>
              </div>
              
              <div className="p-4 sm:p-5">
                <div className="h-[280px] w-full">
                  {isLoading || !stats ? (
                     <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">Memuat grafik...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartMode === "weekly" ? stats.chart.weekly : stats.chart.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f9fafb' }}/>
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                        <Bar dataKey="hadir" name="Hadir" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="absen" name="Absen (S/I/A)" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* KOLOM KANAN: PREVIEW BANK KASUS */}
        <div className="xl:col-span-4 space-y-5">
          
          <div>
            <div className="flex justify-between items-end mb-3">
               <h2 className="text-lg font-semibold tracking-tight text-gray-950">5 Kasus Terakhir</h2>
               <Link href="/daftar-kasus" className="text-sm font-semibold text-primary hover:underline">Semua</Link>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col">
               <div className="bg-orange-50 border-b border-orange-100 px-4 py-3 flex items-center gap-2">
                 <FileWarning className="w-4 h-4 text-orange-600"/>
                 <h3 className="font-bold text-orange-900 text-sm">Pelanggaran Disiplin</h3>
               </div>
               
               <div className="flex flex-col flex-1">
                  {isLoading ? (
                    <div className="p-6 text-center text-xs text-gray-400">Memuat kasus...</div>
                  ) : kasusTerakhir && kasusTerakhir.length > 0 ? (
                    kasusTerakhir.map((k) => (
                      <div key={k.idKasus} className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-sm text-gray-900 leading-tight">{k.nama}</p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                            {k.tanggal.includes(",") 
                              ? `${k.tanggal.split(",")[0]}-${parseInt(k.tanggal.split(",")[1])+1}-${k.tanggal.split(",")[2]}` 
                              : k.tanggal.substring(0, 10)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="px-1.5 py-0 text-[9px] h-4 bg-gray-100 text-gray-600">{k.kelas}</Badge>
                          <span className="text-xs text-orange-700 font-medium truncate">{k.pelanggaran}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400">Belum ada pelanggaran dicatat.</div>
                  )}
               </div>

               <div className="p-3 bg-gray-50 border-t border-gray-100 text-center mt-auto">
                 <Link href="/bank-kasus" className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center justify-center gap-1">
                   + Input Kasus Baru <ArrowRight className="w-3 h-3"/>
                 </Link>
               </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
