"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getRekapBulanan, getRekapRentang } from "@/lib/api";
import { Copy, Download, Image as ImageIcon } from "lucide-react";
import {
  ReportConfig,
  ReportItem,
  DayInfo,
  downloadReportImage,
  copyReportImageToClipboard,
} from "@/lib/reportImage";
import { downloadReportExcel } from "@/lib/reportExcel";

interface RekapRow {
  nis: string;
  nama: string;
  kelas: string;
  sakit: number;
  izin: number;
  alpha: number;
  totalTidakHadir: number;
  dailyLogs: Record<string, string>;
}

export default function RekapitulasiMatrixPage() {
  const [mode, setMode] = useState<"BULANAN" | "MINGGUAN" | "HARIAN" | "KUSTOM">("MINGGUAN");
  const [bulan, setBulan] = useState("");
  const [tanggalHarian, setTanggalHarian] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tingkat, setTingkat] = useState("XI");
  const [kelasFilter, setKelasFilter] = useState("SEMUA");
  const [statusFilter, setStatusFilter] = useState("SEMUA");

  const [dataRekap, setDataRekap] = useState<RekapRow[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const today = new Date();
    const localYYYY = today.getFullYear();
    const localMM = String(today.getMonth() + 1).padStart(2, "0");
    const localDD = String(today.getDate()).padStart(2, "0");
    const localTodayStr = `${localYYYY}-${localMM}-${localDD}`;
    const localMonthStr = `${localYYYY}-${localMM}`;

    setBulan(localMonthStr);
    setTanggalHarian(localTodayStr);
    setStartDate(localTodayStr);
    setEndDate(localTodayStr);
    setIsMounted(true);
  }, []);

  // Compute 5-day week (Senin..Jumat) from tanggalHarian
  const weekInfo = useMemo(() => {
    if (!tanggalHarian) return { days: [], periodeMinggu: "" };
    const d = new Date(`${tanggalHarian}T00:00:00`);

    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const dayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jum'at"];
    const days: DayInfo[] = [];

    for (let i = 0; i < 5; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const dayNum = cur.getDate();
      const monthNum = cur.getMonth() + 1;
      days.push({
        dateObj: cur,
        dayIndex: cur.getDate(),
        dayName: dayNames[i],
        dateShort: `${String(dayNum).padStart(2, "0")}/${String(monthNum).padStart(2, "0")}`,
        dateFull: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`,
      });
    }

    const first = days[0];
    const last = days[4];
    const periodeMinggu = `PERIODE ${first.dayIndex} ${monthNames[first.dateObj.getMonth()]} - ${last.dayIndex} ${monthNames[last.dateObj.getMonth()]}`.toUpperCase();

    return { days, periodeMinggu };
  }, [tanggalHarian]);

  const daysInMonth = useMemo(() => {
    if (!bulan) return 31;
    const [year, month] = bulan.split("-");
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  }, [bulan]);

  // Compute custom date range days
  const customDaysArray = useMemo(() => {
    if (!startDate || !endDate) return [];
    let start = startDate;
    let end = endDate;
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    const cur = new Date(`${start}T00:00:00`);
    const endD = new Date(`${end}T00:00:00`);
    const diffDays = Math.round((endD.getTime() - cur.getTime()) / 86400000) + 1;
    const maxDays = Math.min(diffDays, 60);

    const shortDayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const result: DayInfo[] = [];
    const iter = new Date(cur);

    for (let i = 0; i < maxDays; i++) {
      const dow = iter.getDay();
      if (dow !== 0 && dow !== 6) {
        const dayNum = iter.getDate();
        const monthNum = iter.getMonth() + 1;
        result.push({
          dateObj: new Date(iter),
          dayIndex: dayNum,
          dayName: shortDayNames[dow],
          dateShort: `${String(dayNum).padStart(2, "0")}/${String(monthNum).padStart(2, "0")}`,
          dateFull: `${iter.getFullYear()}-${String(iter.getMonth() + 1).padStart(2, "0")}-${String(iter.getDate()).padStart(2, "0")}`,
        });
      }
      iter.setDate(iter.getDate() + 1);
    }
    return result;
  }, [startDate, endDate]);

  const daysArray = useMemo(() => {
    if (!bulan) return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const [year, month] = bulan.split("-").map(Number);
    const days: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow !== 0 && dow !== 6) days.push(d);
    }
    return days;
  }, [daysInMonth, bulan]);

  const daftarKelas = useMemo(() => {
    const classes = Array.from(new Set(dataRekap.map((s) => s.kelas))).filter(Boolean);
    return classes.sort();
  }, [dataRekap]);

  const fetchRekap = async () => {
    if (!bulan || !tanggalHarian || !startDate || !endDate) return;
    setIsFetching(true);
    setDataRekap([]);
    setKelasFilter("SEMUA");

    try {
      if (mode === "KUSTOM") {
        let start = startDate;
        let end = endDate;
        if (start > end) {
          const temp = start;
          start = end;
          end = temp;
        }
        const d1 = new Date(`${start}T00:00:00`).getTime();
        const d2 = new Date(`${end}T00:00:00`).getTime();
        const diff = Math.round((d2 - d1) / 86400000) + 1;
        if (diff > 60) {
          end = new Date(d1 + 59 * 86400000).toISOString().split("T")[0];
          setEndDate(end);
          toast.info("Rentang dibatasi maksimal 60 hari.");
        }
        const res = await getRekapRentang({ start_date: start, end_date: end, tingkat: tingkat as "X" | "XI" | "XII" | "SEMUA" });
        if (res.status === "success") {
          const list = Array.isArray(res.data) ? (res.data as unknown as RekapRow[]) : [];
          setDataRekap(list);
          if (list.length === 0) toast.info("Data siswa kosong untuk tingkat ini.");
        } else {
          toast.error(res.message || "Gagal menarik data dari server.");
        }
      } else {
        const targetBulan = mode === "BULANAN" ? bulan : tanggalHarian.substring(0, 7);
        const res = await getRekapBulanan({ month: targetBulan, tingkat: tingkat as "X" | "XI" | "XII" | "SEMUA" });
        if (res.status === "success") {
          const list = Array.isArray(res.data) ? (res.data as unknown as RekapRow[]) : [];
          setDataRekap(list);
          if (list.length === 0) toast.info("Data siswa kosong untuk tingkat ini.");
        } else {
          toast.error(res.message || "Gagal menarik data dari server.");
        }
      }
    } catch (err) {
      toast.error("Terjadi masalah jaringan.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isMounted) fetchRekap();
  }, [tingkat, mode, bulan, tanggalHarian.substring(0, 7), startDate, endDate, isMounted]);

  const getStatusColor = (status: string) => {
    if (!status) return "bg-transparent";
    const s = status.toUpperCase().trim();
    switch (s) {
      case "SAKIT":
        return "bg-blue-300 text-blue-800";
      case "IZIN":
        return "bg-yellow-300 text-yellow-800";
      case "ALPHA":
        return "bg-red-400 text-white font-bold";
      case "HADIR":
        return "bg-green-50 text-green-600";
      default:
        return "bg-gray-100 text-gray-400";
    }
  };

  const getStatusLetter = (status: string) => {
    if (!status) return "";
    const s = status.toUpperCase().trim();
    switch (s) {
      case "SAKIT":
        return "S";
      case "IZIN":
        return "I";
      case "ALPHA":
        return "A";
      case "HADIR":
        return "H";
      default:
        return "?";
    }
  };

  const displayedData = useMemo(() => {
    let filtered = dataRekap;
    if (kelasFilter !== "SEMUA") filtered = filtered.filter((s) => s.kelas === kelasFilter);
    if (statusFilter !== "SEMUA") {
      filtered = filtered.filter((s) => {
        if (mode === "BULANAN" || mode === "MINGGUAN" || mode === "KUSTOM") {
          if (statusFilter === "TIDAK HADIR") return s.sakit > 0 || s.izin > 0 || s.alpha > 0;
          if (statusFilter === "SAKIT" && s.sakit > 0) return true;
          if (statusFilter === "IZIN" && s.izin > 0) return true;
          if (statusFilter === "ALPHA" && s.alpha > 0) return true;
          return false;
        } else {
          const dateInt = parseInt(tanggalHarian.split("-")[2], 10);
          const statHariIni = (s.dailyLogs[String(dateInt)] || "HADIR").toUpperCase().trim();
          if (statusFilter === "TIDAK HADIR") return ["SAKIT", "IZIN", "ALPHA"].includes(statHariIni);
          return statHariIni === statusFilter;
        }
      });
    }
    return filtered;
  }, [dataRekap, kelasFilter, statusFilter, mode, tanggalHarian]);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate) {
      if (val > endDate) {
        setEndDate(val);
      } else {
        const d1 = new Date(`${val}T00:00:00`).getTime();
        const d2 = new Date(`${endDate}T00:00:00`).getTime();
        const diff = Math.round((d2 - d1) / 86400000) + 1;
        if (diff > 60) {
          const maxEnd = new Date(d1 + 59 * 86400000).toISOString().split("T")[0];
          setEndDate(maxEnd);
        }
      }
    }
  };

  const handleEndDateChange = (val: string) => {
    if (startDate) {
      if (val < startDate) {
        setStartDate(val);
        setEndDate(startDate);
      } else {
        const d1 = new Date(`${startDate}T00:00:00`).getTime();
        const d2 = new Date(`${val}T00:00:00`).getTime();
        const diff = Math.round((d2 - d1) / 86400000) + 1;
        if (diff > 60) {
          toast.info("Rentang dibatasi maksimal 60 hari.");
          const maxEnd = new Date(d1 + 59 * 86400000).toISOString().split("T")[0];
          setEndDate(maxEnd);
        } else {
          setEndDate(val);
        }
      }
    } else {
      setEndDate(val);
    }
  };
  const absentDailyData = useMemo(() => {
    const dateInt = parseInt(tanggalHarian.split("-")[2], 10);
    return displayedData
      .map((siswa) => ({
        ...siswa,
        statusHarian: (siswa.dailyLogs[String(dateInt)] || "HADIR").toUpperCase().trim(),
      }))
      .filter((siswa) => ["SAKIT", "IZIN", "ALPHA"].includes(siswa.statusHarian));
  }, [displayedData, tanggalHarian]);

  const absentSummary = useMemo(() => {
    return absentDailyData.reduce(
      (acc, siswa) => {
        acc[siswa.statusHarian as "SAKIT" | "IZIN" | "ALPHA"] += 1;
        return acc;
      },
      { SAKIT: 0, IZIN: 0, ALPHA: 0 }
    );
  }, [absentDailyData]);

  const formattedTanggalHarian = useMemo(() => {
    if (!tanggalHarian) return "";
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${tanggalHarian}T00:00:00`));
  }, [tanggalHarian]);

  const absentByTingkat = useMemo(() => {
    const getLevel = (kelas: string) => kelas.split(" ")[0];
    return ["X", "XI", "XII"]
      .map((level) => ({
        level,
        students: absentDailyData.filter((siswa) => getLevel(siswa.kelas || "") === level),
      }))
      .filter((group) => group.students.length > 0);
  }, [absentDailyData]);

  const copyDailyAbsence = async () => {
    const title = `Rekap Tidak Hadir - ${formattedTanggalHarian}`;
    const scope = `Tingkat: ${tingkat}${kelasFilter !== "SEMUA" ? ` | Kelas: ${kelasFilter}` : ""}`;
    const filter = `Filter: ${statusFilter}`;
    const total = `Total: ${absentDailyData.length} siswa (Sakit ${absentSummary.SAKIT}, Izin ${absentSummary.IZIN}, Alpha ${absentSummary.ALPHA})`;
    const rows = absentByTingkat.flatMap((group) => [
      `Kelas ${group.level}`,
      ...group.students.map((siswa, index) => `${index + 1}. ${siswa.nama} - ${siswa.kelas} - ${siswa.statusHarian}`),
      "",
    ]);
    const text = [title, scope, filter, total, "", ...rows].join("\n").trim();
    await navigator.clipboard.writeText(text);
    toast.success("Rekap harian disalin ke clipboard.");
  };

  // Helper to build report config based on current active mode (HARIAN, MINGGUAN, BULANAN, KUSTOM)
  // isForExcel=true → include ALL students in selected class/tingkat (bypass absence filter)
  const buildReportConfig = (isForExcel: boolean = false): ReportConfig => {
    if (!tanggalHarian) throw new Error("Tanggal belum diset");
    const dateObj = new Date(`${tanggalHarian}T00:00:00`);
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const shortDayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

    const namaHari = dayNames[dateObj.getDay()];
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const yy = String(dateObj.getFullYear()).slice(-2);
    const tanggalSingkat = `${dd}/${mm}/${yy}`;
    const bulanTahun = `${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    const dateInt = parseInt(tanggalHarian.split("-")[2], 10);

    // Target students filter
    let targetStudents: RekapRow[] = [];
    if (isForExcel) {
      // Excel: all students for the selected class/tingkat (no absence filter)
      targetStudents = displayedData;
    } else if (mode === "HARIAN") {
      targetStudents = absentDailyData.length > 0 ? absentDailyData : displayedData.filter((s) => s.sakit > 0 || s.izin > 0 || s.alpha > 0);
    } else {
      // Mingguan, Bulanan, Kustom: show all students with any absence in the dataset
      targetStudents = displayedData.filter((s) => s.sakit > 0 || s.izin > 0 || s.alpha > 0 || (s.totalTidakHadir && s.totalTidakHadir > 0));
      if (targetStudents.length === 0) targetStudents = displayedData;
    }

    const customDays = mode === "KUSTOM" ? customDaysArray : [];

    const items: ReportItem[] = targetStudents.map((s, idx) => {
      // Status today
      const statTodayRaw = (s.dailyLogs[String(dateInt)] || "-").toUpperCase().trim();
      let statusToday = "-";
      if (statTodayRaw === "SAKIT") statusToday = "S";
      else if (statTodayRaw === "IZIN") statusToday = "I";
      else if (statTodayRaw === "ALPHA") statusToday = "A";

      // Weekly statuses (5 days) or KUSTOM days — both stored in weeklyStatuses
      const activeDays = mode === "KUSTOM" ? customDays : weekInfo.days;
      const weeklyStatuses = activeDays.map((wd) => {
        // For KUSTOM: key by dateFull (YYYY-MM-DD); for MINGGUAN: key by dayIndex
        const key = mode === "KUSTOM" ? wd.dateFull : String(wd.dayIndex);
        const raw = (s.dailyLogs[key] || "").toUpperCase().trim();
        if (raw === "SAKIT") return "S";
        if (raw === "IZIN") return "I";
        if (raw === "ALPHA") return "A";
        if (raw === "HADIR") return "H";
        return "-";
      });

      // Monthly statuses (1..daysInMonth)
      const monthlyStatuses = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const raw = (s.dailyLogs[String(d)] || "").toUpperCase().trim();
        if (raw === "SAKIT") return "S";
        if (raw === "IZIN") return "I";
        if (raw === "ALPHA") return "A";
        if (raw === "HADIR") return "H";
        return "";
      });

      return {
        no: idx + 1,
        kelas: s.kelas,
        nis: s.nis,
        nama: s.nama,
        statusToday,
        weeklyStatuses,
        monthlyStatuses,
        sakit: s.sakit || 0,
        izin: s.izin || 0,
        alpa: s.alpha || 0,
        total: (s.sakit || 0) + (s.izin || 0) + (s.alpha || 0),
      };
    });

    const totalTidakHadirCount = items.reduce((sum, item) => sum + (item.sakit + item.izin + item.alpa), 0);

    // KUSTOM periode label
    const kustomPeriode = customDays.length > 0
      ? `PERIODE ${customDays[0].dateShort} - ${customDays[customDays.length - 1].dateShort}`.toUpperCase()
      : "";

    return {
      mode,
      tingkat: tingkat === "SEMUA" ? "SEMUA TINGKAT" : tingkat,
      bulanTahun,
      namaHari,
      tanggalSingkat,
      periodeMinggu: mode === "KUSTOM" ? kustomPeriode : weekInfo.periodeMinggu,
      weekDays: weekInfo.days,
      daysInMonth,
      customDays: mode === "KUSTOM" ? customDays : undefined,
      totalTidakHadir: totalTidakHadirCount,
      totalSiswa: dataRekap.length > 0 ? dataRekap.length : items.length,
      items,
    };
  };

  const handleDownloadExcel = async () => {
    if (dataRekap.length === 0) return toast.error("Data rekap masih kosong.");
    try {
      const config = buildReportConfig(true);
      await downloadReportExcel(config);
      toast.success(`Laporan Excel (${mode}) berhasil diunduh.`);
    } catch (e) {
      console.error(e);
      toast.error("Gagal men-generate Excel.");
    }
  };

  const handleDownloadImage = async () => {
    if (dataRekap.length === 0) return toast.error("Data rekap masih kosong.");
    setIsGeneratingImg(true);
    try {
      const config = buildReportConfig(false);
      await downloadReportImage(config);
      toast.success(`Gambar laporan presensi (${mode}) berhasil diunduh.`);
    } catch (e) {
      console.error(e);
      toast.error("Gagal men-generate gambar.");
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleCopyImage = async () => {
    if (dataRekap.length === 0) return toast.error("Data rekap masih kosong.");
    setIsGeneratingImg(true);
    try {
      const config = buildReportConfig(false);
      const success = await copyReportImageToClipboard(config);
      if (success) {
        toast.success(`Gambar laporan (${mode}) disalin! Bisa langsung Paste (Ctrl+V) ke WhatsApp.`);
      } else {
        toast.error("Browser tidak mengizinkan salin gambar otomatis. Gunakan tombol Unduh Gambar.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal menyalin gambar.");
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const renderCellContent = (statusDariDB: string, day: number, dateFull?: string) => {
    let isMasaDepan = false;
    const todayDate = new Date();
    const todayStr = todayDate.toISOString().split("T")[0];

    if (dateFull) {
      if (dateFull > todayStr) isMasaDepan = true;
    } else {
      const currentMonthStr = todayDate.toISOString().substring(0, 7);
      const currentDay = todayDate.getDate();
      if (bulan > currentMonthStr) isMasaDepan = true;
      else if (bulan === currentMonthStr && day > currentDay) isMasaDepan = true;
    }

    let rawStatus = (statusDariDB || "").toUpperCase().trim();
    if (!rawStatus) rawStatus = isMasaDepan ? "MASA_DEPAN" : "HADIR";

    return (
      <div className={`w-full h-[32px] flex items-center justify-center ${getStatusColor(rawStatus)}`}>
        {getStatusLetter(rawStatus)}
      </div>
    );
  };

  if (!isMounted) return null;

  return (
    <div className="w-full space-y-5 pb-24 md:pb-0">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">Laporan Presensi</h1>
            <p className="text-muted-foreground mt-1 text-sm">Pantau kehadiran siswa berdasarkan mode waktu dan filter status.</p>
          </div>

          {/* ACTION EXPORT BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleCopyImage}
              disabled={isFetching || isGeneratingImg || dataRekap.length === 0}
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold border-orange-200 text-orange-950 bg-orange-50/50 hover:bg-orange-100 shadow-sm"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-orange-700" />
              Salin Gambar ({mode})
            </Button>
            <Button
              onClick={handleDownloadImage}
              disabled={isFetching || isGeneratingImg || dataRekap.length === 0}
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold border-green-300 text-green-950 bg-green-50/60 hover:bg-green-100 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-green-700" />
              Unduh Gambar ({mode})
            </Button>
            <Button
              onClick={handleDownloadExcel}
              disabled={isFetching || isGeneratingImg || dataRekap.length === 0}
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold border-blue-300 text-blue-950 bg-blue-50/60 hover:bg-blue-100 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
              Unduh Excel ({mode})
            </Button>
          </div>
        </div>

        {/* CONTROLS (4 TABS: BULANAN | MINGGUAN | HARIAN | KUSTOM) */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto shadow-inner">
            <button
              onClick={() => {
                setMode("BULANAN");
                setStatusFilter("SEMUA");
              }}
              className={`flex-1 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "BULANAN" ? "bg-white text-primary shadow-sm ring-1 ring-black/5" : "text-gray-500"
              }`}
            >
              Matrix Bulanan
            </button>
            <button
              onClick={() => {
                setMode("MINGGUAN");
                setStatusFilter("SEMUA");
              }}
              className={`flex-1 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "MINGGUAN" ? "bg-white text-primary shadow-sm ring-1 ring-black/5" : "text-gray-500"
              }`}
            >
              Matrix Mingguan
            </button>
            <button
              onClick={() => {
                setMode("HARIAN");
                setStatusFilter("SEMUA");
              }}
              className={`flex-1 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "HARIAN" ? "bg-white text-primary shadow-sm ring-1 ring-black/5" : "text-gray-500"
              }`}
            >
              Daftar Harian
            </button>
            <button
              onClick={() => {
                setMode("KUSTOM");
                setStatusFilter("SEMUA");
              }}
              className={`flex-1 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                mode === "KUSTOM" ? "bg-white text-primary shadow-sm ring-1 ring-black/5" : "text-gray-500"
              }`}
            >
              Rentang
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Select
              value={tingkat}
              onValueChange={(val) => {
                if (val) setTingkat(val);
              }}
              disabled={isFetching}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-9 bg-white text-xs font-semibold border-gray-200 shadow-sm">
                <SelectValue placeholder="Tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEMUA">Semua Tingkat</SelectItem>
                <SelectItem value="X">Kelas X</SelectItem>
                <SelectItem value="XI">Kelas XI</SelectItem>
                <SelectItem value="XII">Kelas XII</SelectItem>
              </SelectContent>
            </Select>

            {mode === "BULANAN" ? (
              <input
                type="month"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="h-9 w-full sm:w-auto rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold bg-white shadow-sm"
              />
            ) : mode === "KUSTOM" ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="h-9 w-full sm:w-auto rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold bg-white shadow-sm"
                />
                <span className="text-xs text-gray-400 font-medium shrink-0">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="h-9 w-full sm:w-auto rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold bg-white shadow-sm"
                />
              </div>
            ) : (
              <input
                type="date"
                value={tanggalHarian}
                onChange={(e) => setTanggalHarian(e.target.value)}
                className="h-9 w-full sm:w-auto rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold bg-white shadow-sm"
              />
            )}

            <Button
              onClick={fetchRekap}
              variant="secondary"
              disabled={isFetching}
              className="h-9 w-full sm:w-auto text-xs hidden sm:flex border border-gray-200 shadow-sm"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {mode === "HARIAN" && (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-950">Rekap Tidak Hadir</h2>
              <p className="mt-1 text-sm text-gray-500">
                {formattedTanggalHarian} • {tingkat}
                {kelasFilter !== "SEMUA" ? ` • ${kelasFilter}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={copyDailyAbsence} disabled={absentDailyData.length === 0} variant="outline" className="h-9 rounded-md text-xs font-semibold">
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Salin Teks
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-gray-100 p-4 text-center sm:px-6">
            <div className="rounded-md bg-blue-50 p-2 text-xs font-semibold text-blue-700">
              Sakit<br />
              <span className="text-base text-blue-900">{absentSummary.SAKIT}</span>
            </div>
            <div className="rounded-md bg-yellow-50 p-2 text-xs font-semibold text-yellow-700">
              Izin<br />
              <span className="text-base text-yellow-900">{absentSummary.IZIN}</span>
            </div>
            <div className="rounded-md bg-red-50 p-2 text-xs font-semibold text-red-700">
              Alpha<br />
              <span className="text-base text-red-900">{absentSummary.ALPHA}</span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {isFetching ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Mencari data harian...</div>
            ) : absentDailyData.length === 0 ? (
              <div className="p-6 text-center text-sm text-green-600">Tidak ada siswa tidak hadir pada filter ini.</div>
            ) : (
              absentByTingkat.map((group) => (
                <div key={`share-${group.level}`} className="divide-y divide-gray-100">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 sm:px-6">
                    Kelas {group.level}
                  </div>
                  {group.students.map((siswa, index) => (
                    <div key={`share-${siswa.nis}`} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-950">
                          {index + 1}. {siswa.nama}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-500">{siswa.kelas}</div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 whitespace-nowrap ${
                          siswa.statusHarian === "SAKIT"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : siswa.statusHarian === "IZIN"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {siswa.statusHarian}
                      </Badge>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {mode === "MINGGUAN" && (
        <div className="bg-orange-50/60 border border-orange-200 rounded-md p-3 text-xs text-orange-950 flex items-center justify-between">
          <span>
            Menampilkan ringkasan mingguan: <strong>{weekInfo.periodeMinggu}</strong>
          </span>
          <span className="text-[11px] text-orange-700 font-semibold">(5 Hari: Senin s.d. Jum&apos;at)</span>
        </div>
      )}

      {mode === "KUSTOM" && (
        <div className="bg-purple-50/60 border border-purple-200 rounded-md p-3 text-xs text-purple-950 flex items-center justify-between">
          <span>
            Menampilkan rentang: <strong>{startDate}</strong> s/d <strong>{endDate}</strong>
          </span>
          <span className="text-[11px] text-purple-700 font-semibold">
            ({customDaysArray.length} Hari)
          </span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm flex flex-col">
        {/* FILTER BAR */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-full sm:w-auto mr-2">
              Tampilkan:
            </span>
            <div className="flex flex-wrap sm:flex-nowrap w-full sm:w-auto gap-1.5">
              <button
                onClick={() => setStatusFilter("SEMUA")}
                className={`py-1.5 px-3 text-[11px] font-bold rounded border ${
                  statusFilter === "SEMUA"
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                SEMUA
              </button>
              <button
                onClick={() => setStatusFilter("TIDAK HADIR")}
                className={`py-1.5 px-3 text-[11px] font-bold rounded border ${
                  statusFilter === "TIDAK HADIR"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
                }`}
              >
                TIDAK HADIR
              </button>
              <button
                onClick={() => setStatusFilter("SAKIT")}
                className={`py-1.5 px-3 text-[11px] font-bold rounded border ${
                  statusFilter === "SAKIT"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                }`}
              >
                SAKIT
              </button>
              <button
                onClick={() => setStatusFilter("IZIN")}
                className={`py-1.5 px-3 text-[11px] font-bold rounded border ${
                  statusFilter === "IZIN"
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                }`}
              >
                IZIN
              </button>
              <button
                onClick={() => setStatusFilter("ALPHA")}
                className={`py-1.5 px-3 text-[11px] font-bold rounded border ${
                  statusFilter === "ALPHA"
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-red-600 border-red-200 hover:bg-red-50"
                }`}
              >
                ALPHA
              </button>
            </div>
          </div>

          {/* TAB KELAS */}
          {daftarKelas.length > 0 && !isFetching && (
            <div className="w-full border-t border-gray-100 px-2 sm:px-0 mt-4">
              <div className="flex overflow-x-auto scrollbar-hide pt-1">
                <button
                  onClick={() => setKelasFilter("SEMUA")}
                  className={`relative px-5 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors outline-none ${
                    kelasFilter === "SEMUA" ? "text-primary" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Semua Kelas{" "}
                  {kelasFilter === "SEMUA" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-lg" />
                  )}
                </button>
                {daftarKelas.map((kls) => {
                  const isActive = kelasFilter === kls;
                  return (
                    <button
                      key={kls}
                      onClick={() => setKelasFilter(kls)}
                      className={`relative px-5 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors outline-none ${
                        isActive ? "text-primary" : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {kls}{" "}
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

        {/* MOBILE MATRIX LIST */}
        <div className="md:hidden flex flex-col divide-y divide-gray-100 min-h-[300px]">
          {isFetching ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Mencari data ke Spreadsheet...</div>
          ) : displayedData.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">Tidak ada siswa yang sesuai filter.</div>
          ) : (
            displayedData.map((siswa, idx) => {
              const isCritical = siswa.totalTidakHadir >= 3;
              const dateInt = parseInt(tanggalHarian.split("-")[2], 10);
              const statHariIni = (siswa.dailyLogs[String(dateInt)] || "HADIR").toUpperCase().trim();

              return (
                <div key={siswa.nis} className={`p-4 flex flex-col gap-2 ${isCritical ? "bg-red-50/20" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-400 w-5">{idx + 1}.</span>
                      <div>
                        <div className="text-sm font-bold text-gray-950">{siswa.nama}</div>
                        <div className="text-[11px] text-gray-500">{siswa.kelas}</div>
                      </div>
                    </div>
                    {mode === "HARIAN" ? (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          statHariIni === "SAKIT"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : statHariIni === "IZIN"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : statHariIni === "ALPHA"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}
                      >
                        {statHariIni}
                      </Badge>
                    ) : (
                      <div className="text-right">
                        <span className="text-xs text-gray-400">Total Absen:</span>
                        <div className="text-sm font-bold text-red-600">{siswa.totalTidakHadir} hari</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-gray-50">
                    <div className="rounded-md bg-blue-50 p-2 text-xs font-semibold text-blue-700">
                      Sakit<br />
                      <span className="text-base text-blue-900">{siswa.sakit}</span>
                    </div>
                    <div className="rounded-md bg-yellow-50 p-2 text-xs font-semibold text-yellow-700">
                      Izin<br />
                      <span className="text-base text-yellow-900">{siswa.izin}</span>
                    </div>
                    <div className="rounded-md bg-red-50 p-2 text-xs font-semibold text-red-700">
                      Alpha<br />
                      <span className="text-base text-red-900">{siswa.alpha}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block flex-1 overflow-x-auto min-h-[400px]">
          <Table className="text-xs sm:text-sm border-collapse">
            <TableHeader className="bg-gray-50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[40px] text-center border-r border-gray-200 font-semibold">No</TableHead>
                <TableHead className="min-w-[180px] border-r border-gray-200 font-semibold">Nama Siswa</TableHead>

                {mode === "BULANAN" && (
                  <>
                    {daysArray.map((day) => (
                      <TableHead
                        key={`h-${day}`}
                        className="w-[28px] p-0 text-center border-r border-gray-200 px-1 text-[10px] sm:text-xs"
                      >
                        {day}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-bold border-l border-gray-200 bg-gray-100 min-w-[50px]">
                      Tot
                    </TableHead>
                  </>
                )}

                {mode === "MINGGUAN" && (
                  <>
                    {weekInfo.days.map((wd) => (
                      <TableHead
                        key={`hw-${wd.dayIndex}`}
                        className="min-w-[55px] text-center border-r border-gray-200 px-1 text-xs"
                      >
                        <div>{wd.dayName}</div>
                        <div className="text-[10px] text-gray-500 font-normal">{wd.dateShort}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold bg-yellow-50/50 text-amber-900 min-w-[45px]">S</TableHead>
                    <TableHead className="text-center font-semibold bg-cyan-50/50 text-cyan-900 min-w-[45px]">I</TableHead>
                    <TableHead className="text-center font-semibold bg-red-50/50 text-red-900 min-w-[45px]">A</TableHead>
                    <TableHead className="text-center font-bold border-l border-gray-200 bg-gray-100 min-w-[45px]">
                      Tot
                    </TableHead>
                  </>
                )}

                {mode === "KUSTOM" && (
                  <>
                    {customDaysArray.map((wd) => (
                      <TableHead
                        key={`hk-${wd.dateFull}`}
                        className="min-w-[48px] text-center border-r border-gray-200 px-1 text-xs"
                      >
                        <div>{wd.dayName}</div>
                        <div className="text-[10px] text-gray-500 font-normal">{wd.dateShort}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold bg-yellow-50/50 text-amber-900 min-w-[45px]">S</TableHead>
                    <TableHead className="text-center font-semibold bg-cyan-50/50 text-cyan-900 min-w-[45px]">I</TableHead>
                    <TableHead className="text-center font-semibold bg-red-50/50 text-red-900 min-w-[45px]">A</TableHead>
                    <TableHead className="text-center font-bold border-l border-gray-200 bg-gray-100 min-w-[45px]">Tot</TableHead>
                  </>
                )}

                {mode === "HARIAN" && (
                  <TableHead className="text-center font-semibold">Status pada {tanggalHarian}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      mode === "BULANAN"
                        ? daysArray.length + 3
                        : mode === "MINGGUAN"
                        ? weekInfo.days.length + 6
                        : mode === "KUSTOM"
                        ? customDaysArray.length + 6
                        : 3
                    }
                    className="h-64 text-center text-muted-foreground"
                  >
                    Mencari data ke Spreadsheet...
                  </TableCell>
                </TableRow>
              ) : displayedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      mode === "BULANAN"
                        ? daysArray.length + 3
                        : mode === "MINGGUAN"
                        ? weekInfo.days.length + 6
                        : mode === "KUSTOM"
                        ? customDaysArray.length + 6
                        : 3
                    }
                    className="h-64 text-center text-muted-foreground"
                  >
                    Tidak ada siswa yang sesuai dengan filter.
                  </TableCell>
                </TableRow>
              ) : (
                displayedData.map((siswa, idx) => {
                  const isCritical = siswa.totalTidakHadir >= 3;

                  return (
                    <TableRow
                      key={siswa.nis}
                      className={`hover:bg-gray-50/50 ${isCritical ? "bg-red-50/20" : ""}`}
                    >
                      <TableCell className="text-center text-muted-foreground border-r border-gray-200 py-2">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="border-r border-gray-200 py-2">
                        <div className="font-semibold text-gray-900 line-clamp-1" title={siswa.nama}>
                          {siswa.nama}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{siswa.kelas}</div>
                      </TableCell>

                      {mode === "BULANAN" && (
                        <>
                          {daysArray.map((day) => (
                            <TableCell
                              key={`c-${siswa.nis}-${day}`}
                              className={`p-0 border-r border-gray-200 text-center align-middle border-b-0`}
                            >
                              {renderCellContent(siswa.dailyLogs[String(day)], day)}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-bold border-l border-gray-200 bg-gray-50/50 py-2 text-red-600">
                            {siswa.totalTidakHadir > 0 ? siswa.totalTidakHadir : "-"}
                          </TableCell>
                        </>
                      )}

                      {mode === "MINGGUAN" && (
                        <>
                          {weekInfo.days.map((wd) => (
                            <TableCell
                              key={`cw-${siswa.nis}-${wd.dayIndex}`}
                              className={`p-0 border-r border-gray-200 text-center align-middle border-b-0`}
                            >
                              {renderCellContent(siswa.dailyLogs[String(wd.dayIndex)], wd.dayIndex)}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-semibold text-amber-800 bg-yellow-50/30">
                            {siswa.sakit > 0 ? siswa.sakit : "-"}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-cyan-800 bg-cyan-50/30">
                            {siswa.izin > 0 ? siswa.izin : "-"}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-red-700 bg-red-50/30">
                            {siswa.alpha > 0 ? siswa.alpha : "-"}
                          </TableCell>
                          <TableCell className="text-center font-bold border-l border-gray-200 bg-gray-50/50 py-2 text-red-600">
                            {siswa.totalTidakHadir > 0 ? siswa.totalTidakHadir : "-"}
                          </TableCell>
                        </>
                      )}

                      {mode === "KUSTOM" && (
                        <>
                          {customDaysArray.map((wd) => (
                            <TableCell
                              key={`ck-${siswa.nis}-${wd.dateFull}`}
                              className="p-0 border-r border-gray-200 text-center align-middle border-b-0"
                            >
                              {renderCellContent(siswa.dailyLogs[wd.dateFull] || "", wd.dayIndex, wd.dateFull)}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-semibold text-amber-800 bg-yellow-50/30">
                            {siswa.sakit > 0 ? siswa.sakit : "-"}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-cyan-800 bg-cyan-50/30">
                            {siswa.izin > 0 ? siswa.izin : "-"}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-red-700 bg-red-50/30">
                            {siswa.alpha > 0 ? siswa.alpha : "-"}
                          </TableCell>
                          <TableCell className="text-center font-bold border-l border-gray-200 bg-gray-50/50 py-2 text-red-600">
                            {siswa.totalTidakHadir > 0 ? siswa.totalTidakHadir : "-"}
                          </TableCell>
                        </>
                      )}

                      {mode === "HARIAN" && (
                        <TableCell className="text-center py-2">
                          {(() => {
                            const dateInt = parseInt(tanggalHarian.split("-")[2], 10);
                            const statHariIni = (
                              siswa.dailyLogs[String(dateInt)] || "HADIR"
                            )
                              .toUpperCase()
                              .trim();
                            if (statHariIni === "SAKIT")
                              return (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 border-blue-200 w-[80px] justify-center"
                                >
                                  SAKIT
                                </Badge>
                              );
                            if (statHariIni === "IZIN")
                              return (
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-50 text-yellow-700 border-yellow-200 w-[80px] justify-center"
                                >
                                  IZIN
                                </Badge>
                              );
                            if (statHariIni === "ALPHA")
                              return (
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-700 border-red-200 w-[80px] justify-center"
                                >
                                  ALPHA
                                </Badge>
                              );
                            return <span className="text-green-600 font-medium text-xs">Hadir</span>;
                          })()}
                        </TableCell>
                      )}
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
