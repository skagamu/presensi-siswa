export interface ReportItem {
  no: number;
  kelas: string;
  nis: string;
  nama: string;
  // For Harian: status on today ('S' | 'I' | 'A' | '-')
  statusToday?: string;
  // For Mingguan: status for 5 days [Senin, Selasa, Rabu, Kamis, Jumat]
  weeklyStatuses?: string[]; // length 5
  // For Bulanan: status for 1..daysInMonth
  monthlyStatuses?: string[]; // length daysInMonth
  sakit: number;
  izin: number;
  alpa: number;
  total: number;
}

export interface DayInfo {
  dateObj?: Date; // optional Date instance for rendering
  dayIndex: number; // e.g. 24
  dayName: string; // e.g. "Senin"
  dateShort: string; // e.g. "24/08"
  dateFull: string; // e.g. "2026-08-24"
}

export interface ReportConfig {
  mode: "HARIAN" | "MINGGUAN" | "BULANAN" | "KUSTOM";
  tingkat: string;
  bulanTahun: string; // e.g. "AGUSTUS 2026"
  // For Harian
  namaHari?: string;
  tanggalSingkat?: string;
  // For Mingguan
  periodeMinggu?: string; // e.g. "PERIODE 24 AGUSTUS - 28 AGUSTUS"
  weekDays?: DayInfo[]; // 5 days (MINGGUAN) or N days (KUSTOM)
  // For Bulanan
  daysInMonth?: number;
  // For Kustom: ordered list of days in the range
  customDays?: DayInfo[];
  // Stats
  totalTidakHadir: number;
  totalSiswa: number;
  items: ReportItem[];
}

export function generateReportCanvas(config: ReportConfig): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  const scale = 2; // Hi-DPI
  const padding = 20;
  const headerRowHeight = 34;
  const subHeaderHeight = 22;
  const rowHeight = 26;
  const footerHeight = 26;

  let colWidths: number[] = [];

  if (config.mode === "HARIAN") {
    // NO(45), KELAS(80), NIS(75), NAMA(290), TANGGAL(120)
    colWidths = [45, 80, 75, 290, 120];
  } else if (config.mode === "MINGGUAN") {
    // NO(45), KELAS(80), NIS(75), NAMA(270), 5 DAYS (55 each = 275), Sakit(55), Izin(55), Alpa(55), Total(55)
    colWidths = [45, 80, 75, 270, 55, 55, 55, 55, 55, 55, 55, 55, 55];
  } else if (config.mode === "KUSTOM") {
    // NO(45), KELAS(80), NIS(75), NAMA(270), N DAYS (55 each), Sakit(55), Izin(55), Alpa(55), Total(55)
    const nDays = (config.customDays || []).length || 1;
    const dayCols = Array(nDays).fill(55);
    colWidths = [45, 80, 75, 270, ...dayCols, 55, 55, 55, 55];
  } else {
    // BULANAN: NO(35), KELAS(70), NIS(65), NAMA(220), 31 DAYS (24 each = 744), S(35), I(35), A(35), Tot(40)
    const dim = config.daysInMonth || 31;
    const dayCols = Array(dim).fill(24);
    colWidths = [35, 70, 65, 220, ...dayCols, 35, 35, 35, 42];
  }

  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const totalHeight =
    padding * 2 +
    headerRowHeight +
    subHeaderHeight * 2 +
    config.items.length * rowHeight +
    footerHeight * 2;

  canvas.width = (totalWidth + padding * 2) * scale;
  canvas.height = totalHeight * scale;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalWidth + padding * 2, totalHeight);

  const startX = padding;
  let currentY = padding;

  function drawCell(
    x: number,
    y: number,
    w: number,
    h: number,
    bg: string,
    text: string | number,
    align: "left" | "center" | "right" = "center",
    font = '12px "Segoe UI", Arial, sans-serif',
    textColor = "#000000",
    bold = false
  ) {
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    if (text !== undefined && text !== null && text !== "") {
      ctx.fillStyle = textColor;
      ctx.font = (bold ? "bold " : "") + font;
      ctx.textBaseline = "middle";
      let textX = x + w / 2;
      if (align === "left") {
        ctx.textAlign = "left";
        textX = x + 8;
      } else if (align === "right") {
        ctx.textAlign = "right";
        textX = x + w - 8;
      } else {
        ctx.textAlign = "center";
      }
      ctx.fillText(String(text), textX, y + h / 2);
    }
  }

  const tingkatLabel = config.tingkat === "SEMUA" ? "SEMUA TINGKAT" : `KELAS ${config.tingkat}`;

  // ==========================================
  // MODE 1: HARIAN
  // ==========================================
  if (config.mode === "HARIAN") {
    const title = `PRESENSI ${tingkatLabel} ${config.bulanTahun}`.toUpperCase();
    const wTitle = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    drawCell(startX, currentY, wTitle, headerRowHeight, "#bbf7d0", title, "center", '15px "Segoe UI", Arial, sans-serif', "#064e3b", true);
    drawCell(startX + wTitle, currentY, colWidths[4], headerRowHeight, "#f8fafc", `TANGGAL ${config.tanggalSingkat || ""}`, "center", '11px "Segoe UI", Arial, sans-serif', "#334155", true);

    currentY += headerRowHeight;

    // Subheaders
    let colX = startX;
    drawCell(colX, currentY, colWidths[0], subHeaderHeight * 2, "#f8fafc", "NO", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[0];
    drawCell(colX, currentY, colWidths[1], subHeaderHeight * 2, "#f8fafc", "KELAS", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[1];
    drawCell(colX, currentY, colWidths[2], subHeaderHeight * 2, "#f8fafc", "NIS", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[2];
    drawCell(colX, currentY, colWidths[3], subHeaderHeight * 2, "#f8fafc", "NAMA", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[3];
    drawCell(colX, currentY, colWidths[4], subHeaderHeight, "#f8fafc", config.namaHari || "", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    drawCell(colX, currentY + subHeaderHeight, colWidths[4], subHeaderHeight, "#f8fafc", config.tanggalSingkat || "", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);

    currentY += subHeaderHeight * 2;

    // Rows
    config.items.forEach((row, i) => {
      let x = startX;
      const isEven = i % 2 === 0;
      const defaultBg = isEven ? "#ffffff" : "#fcfcfc";

      drawCell(x, currentY, colWidths[0], rowHeight, defaultBg, row.no, "center", '12px "Segoe UI", Arial, sans-serif', "#334155");
      x += colWidths[0];
      drawCell(x, currentY, colWidths[1], rowHeight, defaultBg, row.kelas, "center", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      x += colWidths[1];
      drawCell(x, currentY, colWidths[2], rowHeight, defaultBg, row.nis, "center", '11px "Courier New", monospace', "#475569");
      x += colWidths[2];
      drawCell(x, currentY, colWidths[3], rowHeight, defaultBg, row.nama, "left", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      x += colWidths[3];

      let statBg = "#ffffff";
      let statColor = "#000000";
      const st = row.statusToday || "-";
      if (st === "S") { statBg = "#fef08a"; statColor = "#854d0e"; }
      else if (st === "I") { statBg = "#67e8f9"; statColor = "#155e75"; }
      else if (st === "A") { statBg = "#ef4444"; statColor = "#ffffff"; }
      
      let fullStatus = st;
      if (st === "S") fullStatus = "Sakit";
      if (st === "I") fullStatus = "Izin";
      if (st === "A") fullStatus = "Alpa";
      
      drawCell(x, currentY, colWidths[4], rowHeight, statBg, fullStatus, "center", '12px "Segoe UI", Arial, sans-serif', statColor, true);
      
      currentY += rowHeight;
    });

    // Footer
    const percentage = config.totalSiswa > 0 ? ((config.totalTidakHadir / config.totalSiswa) * 100).toFixed(2).replace(".", ",") + "%" : "0%";
    drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "TOTAL SISWA TIDAK HADIR", "right", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
    drawCell(startX + wTitle, currentY, colWidths[4], footerHeight, "#fed7aa", config.totalTidakHadir, "center", '13px "Segoe UI", Arial, sans-serif', "#7c2d12", true);

    currentY += footerHeight;
    drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "PROSENTASE KETIDAKHADIRAN", "right", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
    drawCell(startX + wTitle, currentY, colWidths[4], footerHeight, "#fed7aa", percentage, "center", '13px "Segoe UI", Arial, sans-serif', "#7c2d12", true);
  }

  // ==========================================
  // MODE 2: MINGGUAN (5 HARI KERJA)
  // ==========================================
  else if (config.mode === "MINGGUAN") {
    const title = `PRESENSI ${tingkatLabel} ${config.bulanTahun}`.toUpperCase();
    const wTitle = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    drawCell(startX, currentY, wTitle, headerRowHeight, "#bbf7d0", title, "center", '15px "Segoe UI", Arial, sans-serif', "#064e3b", true);

    const wWeek = colWidths[4] + colWidths[5] + colWidths[6] + colWidths[7] + colWidths[8];
    drawCell(startX + wTitle, currentY, wWeek, headerRowHeight, "#f8fafc", config.periodeMinggu || "PERIODE MINGGUAN", "center", '11px "Segoe UI", Arial, sans-serif', "#334155", true);

    const wKet = colWidths[9] + colWidths[10] + colWidths[11] + colWidths[12];
    drawCell(startX + wTitle + wWeek, currentY, wKet, headerRowHeight, "#f1f5f9", "JUMLAH KETIDAKHADIRAN", "center", '11px "Segoe UI", Arial, sans-serif', "#1e293b", true);

    currentY += headerRowHeight;

    // Subheaders
    let colX = startX;
    drawCell(colX, currentY, colWidths[0], subHeaderHeight * 2, "#f8fafc", "NO", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[0];
    drawCell(colX, currentY, colWidths[1], subHeaderHeight * 2, "#f8fafc", "KELAS", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[1];
    drawCell(colX, currentY, colWidths[2], subHeaderHeight * 2, "#f8fafc", "NIS", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[2];
    drawCell(colX, currentY, colWidths[3], subHeaderHeight * 2, "#f8fafc", "NAMA", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[3];

    // 5 Days Header
    const weekList = config.weekDays || [
      { dayName: "Senin", dateShort: "-" },
      { dayName: "Selasa", dateShort: "-" },
      { dayName: "Rabu", dateShort: "-" },
      { dayName: "Kamis", dateShort: "-" },
      { dayName: "Jum'at", dateShort: "-" },
    ];

    weekList.forEach((wd, idx) => {
      drawCell(colX, currentY, colWidths[4 + idx], subHeaderHeight, "#f8fafc", wd.dayName, "center", '10px "Segoe UI", Arial, sans-serif', "#000000", true);
      drawCell(colX, currentY + subHeaderHeight, colWidths[4 + idx], subHeaderHeight, "#f8fafc", wd.dateShort, "center", '10px "Segoe UI", Arial, sans-serif', "#000000", true);
      colX += colWidths[4 + idx];
    });

    drawCell(colX, currentY, colWidths[9], subHeaderHeight * 2, "#fef08a", "Sakit", "center", '12px "Segoe UI", Arial, sans-serif', "#854d0e", true);
    colX += colWidths[9];
    drawCell(colX, currentY, colWidths[10], subHeaderHeight * 2, "#67e8f9", "Izin", "center", '12px "Segoe UI", Arial, sans-serif', "#155e75", true);
    colX += colWidths[10];
    drawCell(colX, currentY, colWidths[11], subHeaderHeight * 2, "#ef4444", "Alpa", "center", '12px "Segoe UI", Arial, sans-serif', "#ffffff", true);
    colX += colWidths[11];
    drawCell(colX, currentY, colWidths[12], subHeaderHeight * 2, "#e2e8f0", "Total", "center", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);

    currentY += subHeaderHeight * 2;

    // Rows
    config.items.forEach((row, i) => {
      let x = startX;
      const isEven = i % 2 === 0;
      const defaultBg = isEven ? "#ffffff" : "#fcfcfc";

      drawCell(x, currentY, colWidths[0], rowHeight, defaultBg, row.no, "center", '12px "Segoe UI", Arial, sans-serif', "#334155");
      x += colWidths[0];
      drawCell(x, currentY, colWidths[1], rowHeight, defaultBg, row.kelas, "center", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      x += colWidths[1];
      drawCell(x, currentY, colWidths[2], rowHeight, defaultBg, row.nis, "center", '11px "Courier New", monospace', "#475569");
      x += colWidths[2];
      drawCell(x, currentY, colWidths[3], rowHeight, defaultBg, row.nama, "left", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      x += colWidths[3];

      // 5 Week Day Statuses
      const statuses = row.weeklyStatuses || ["-", "-", "-", "-", "-"];
      statuses.forEach((st, idx) => {
        let statBg = defaultBg;
        let statColor = "#000000";
        if (st === "S") { statBg = "#fef08a"; statColor = "#854d0e"; }
        else if (st === "I") { statBg = "#67e8f9"; statColor = "#155e75"; }
        else if (st === "A") { statBg = "#ef4444"; statColor = "#ffffff"; }
        else if (st === "H") { statBg = "#dcfce7"; statColor = "#166534"; }

        drawCell(x, currentY, colWidths[4 + idx], rowHeight, statBg, st === "-" ? "" : st, "center", '11px "Segoe UI", Arial, sans-serif', statColor, true);
        x += colWidths[4 + idx];
      });

      const sBg = row.sakit > 0 ? "#fef08a" : defaultBg;
      drawCell(x, currentY, colWidths[9], rowHeight, sBg, row.sakit, "center", '12px "Segoe UI", Arial, sans-serif', "#000000", row.sakit > 0);
      x += colWidths[9];
      const iBg = row.izin > 0 ? "#67e8f9" : defaultBg;
      drawCell(x, currentY, colWidths[10], rowHeight, iBg, row.izin, "center", '12px "Segoe UI", Arial, sans-serif', "#000000", row.izin > 0);
      x += colWidths[10];
      const aBg = row.alpa > 0 ? "#ef4444" : defaultBg;
      const aColor = row.alpa > 0 ? "#ffffff" : "#000000";
      drawCell(x, currentY, colWidths[11], rowHeight, aBg, row.alpa, "center", '12px "Segoe UI", Arial, sans-serif', aColor, row.alpa > 0);
      x += colWidths[11];

      drawCell(x, currentY, colWidths[12], rowHeight, "#f8fafc", row.total, "center", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      currentY += rowHeight;
    });

    // Footer
    const percentage = config.totalSiswa > 0 ? ((config.totalTidakHadir / config.totalSiswa) * 100).toFixed(2).replace(".", ",") + "%" : "0%";
    drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "TOTAL SISWA TIDAK HADIR", "right", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
    drawCell(startX + wTitle, currentY, wWeek, footerHeight, "#fed7aa", config.totalTidakHadir, "center", '13px "Segoe UI", Arial, sans-serif', "#7c2d12", true);
    drawCell(startX + wTitle + wWeek, currentY, wKet, footerHeight, "#f8fafc", "", "center");

    currentY += footerHeight;
    drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "PROSENTASE KETIDAKHADIRAN", "right", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
    drawCell(startX + wTitle, currentY, wWeek, footerHeight, "#fed7aa", percentage, "center", '13px "Segoe UI", Arial, sans-serif', "#7c2d12", true);
    drawCell(startX + wTitle + wWeek, currentY, wKet, footerHeight, "#f8fafc", "", "center");
  }

  // ==========================================
  // MODE 3: KUSTOM (N DAYS RANGE)
  // ==========================================
  else if (config.mode === "KUSTOM") {
    const customDayList = config.customDays || [];
    const nDays = customDayList.length;
    const title = `PRESENSI ${tingkatLabel} ${config.bulanTahun}`.toUpperCase();
    const wTitle = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    drawCell(startX, currentY, wTitle, headerRowHeight, "#bbf7d0", title, "center", '15px "Segoe UI", Arial, sans-serif', "#064e3b", true);

    const wWeek = colWidths.slice(4, 4 + nDays).reduce((a, b) => a + b, 0);
    drawCell(startX + wTitle, currentY, wWeek, headerRowHeight, "#f8fafc", config.periodeMinggu || "PERIODE KUSTOM", "center", '11px "Segoe UI", Arial, sans-serif', "#334155", true);

    const wKet = colWidths.slice(4 + nDays).reduce((a, b) => a + b, 0);
    drawCell(startX + wTitle + wWeek, currentY, wKet, headerRowHeight, "#f1f5f9", "JUMLAH KETIDAKHADIRAN", "center", '11px "Segoe UI", Arial, sans-serif', "#1e293b", true);

    currentY += headerRowHeight;

    // Subheaders
    let colX = startX;
    drawCell(colX, currentY, colWidths[0], subHeaderHeight * 2, "#f8fafc", "NO", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[0];
    drawCell(colX, currentY, colWidths[1], subHeaderHeight * 2, "#f8fafc", "KELAS", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[1];
    drawCell(colX, currentY, colWidths[2], subHeaderHeight * 2, "#f8fafc", "NIS", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[2];
    drawCell(colX, currentY, colWidths[3], subHeaderHeight * 2, "#f8fafc", "NAMA", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[3];

    customDayList.forEach((wd, idx) => {
      drawCell(colX, currentY, colWidths[4 + idx], subHeaderHeight, "#f8fafc", wd.dayName, "center", '10px "Segoe UI", Arial, sans-serif', "#000000", true);
      drawCell(colX, currentY + subHeaderHeight, colWidths[4 + idx], subHeaderHeight, "#f8fafc", wd.dateShort, "center", '10px "Segoe UI", Arial, sans-serif', "#000000", true);
      colX += colWidths[4 + idx];
    });

    const kIdx = 4 + nDays;
    drawCell(colX, currentY, colWidths[kIdx], subHeaderHeight * 2, "#fef08a", "Sakit", "center", '12px "Segoe UI", Arial, sans-serif', "#854d0e", true);
    colX += colWidths[kIdx];
    drawCell(colX, currentY, colWidths[kIdx + 1], subHeaderHeight * 2, "#67e8f9", "Izin", "center", '12px "Segoe UI", Arial, sans-serif', "#155e75", true);
    colX += colWidths[kIdx + 1];
    drawCell(colX, currentY, colWidths[kIdx + 2], subHeaderHeight * 2, "#ef4444", "Alpa", "center", '12px "Segoe UI", Arial, sans-serif', "#ffffff", true);
    colX += colWidths[kIdx + 2];
    drawCell(colX, currentY, colWidths[kIdx + 3], subHeaderHeight * 2, "#e2e8f0", "Total", "center", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);

    currentY += subHeaderHeight * 2;

    // Rows
    config.items.forEach((row, i) => {
      let x = startX;
      const isEven = i % 2 === 0;
      const defaultBg = isEven ? "#ffffff" : "#fcfcfc";

      drawCell(x, currentY, colWidths[0], rowHeight, defaultBg, row.no, "center", '12px "Segoe UI", Arial, sans-serif', "#334155");
      x += colWidths[0];
      drawCell(x, currentY, colWidths[1], rowHeight, defaultBg, row.kelas, "center", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      x += colWidths[1];
      drawCell(x, currentY, colWidths[2], rowHeight, defaultBg, row.nis, "center", '11px "Courier New", monospace', "#475569");
      x += colWidths[2];
      drawCell(x, currentY, colWidths[3], rowHeight, defaultBg, row.nama, "left", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      x += colWidths[3];

      const statuses = row.weeklyStatuses || [];
      statuses.forEach((st, idx) => {
        let statBg = defaultBg;
        let statColor = "#000000";
        if (st === "S") { statBg = "#fef08a"; statColor = "#854d0e"; }
        else if (st === "I") { statBg = "#67e8f9"; statColor = "#155e75"; }
        else if (st === "A") { statBg = "#ef4444"; statColor = "#ffffff"; }
        else if (st === "H") { statBg = "#dcfce7"; statColor = "#166534"; }

        drawCell(x, currentY, colWidths[4 + idx], rowHeight, statBg, st === "-" ? "" : st, "center", '11px "Segoe UI", Arial, sans-serif', statColor, true);
        x += colWidths[4 + idx];
      });

      const sBg = row.sakit > 0 ? "#fef08a" : defaultBg;
      drawCell(x, currentY, colWidths[kIdx], rowHeight, sBg, row.sakit, "center", '12px "Segoe UI", Arial, sans-serif', "#000000", row.sakit > 0);
      x += colWidths[kIdx];
      const iBg = row.izin > 0 ? "#67e8f9" : defaultBg;
      drawCell(x, currentY, colWidths[kIdx + 1], rowHeight, iBg, row.izin, "center", '12px "Segoe UI", Arial, sans-serif', "#000000", row.izin > 0);
      x += colWidths[kIdx + 1];
      const aBg = row.alpa > 0 ? "#ef4444" : defaultBg;
      const aColor = row.alpa > 0 ? "#ffffff" : "#000000";
      drawCell(x, currentY, colWidths[kIdx + 2], rowHeight, aBg, row.alpa, "center", '12px "Segoe UI", Arial, sans-serif', aColor, row.alpa > 0);
      x += colWidths[kIdx + 2];
      drawCell(x, currentY, colWidths[kIdx + 3], rowHeight, "#f8fafc", row.total, "center", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      currentY += rowHeight;
    });

    // Footer
    const percentage = config.totalSiswa > 0 ? ((config.totalTidakHadir / config.totalSiswa) * 100).toFixed(2).replace(".", ",") + "%" : "0%";
    drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "TOTAL SISWA TIDAK HADIR", "right", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
    drawCell(startX + wTitle, currentY, wWeek, footerHeight, "#fed7aa", config.totalTidakHadir, "center", '13px "Segoe UI", Arial, sans-serif', "#7c2d12", true);
    drawCell(startX + wTitle + wWeek, currentY, wKet, footerHeight, "#f8fafc", "", "center");
    currentY += footerHeight;
    drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "PROSENTASE KETIDAKHADIRAN", "right", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
    drawCell(startX + wTitle, currentY, wWeek, footerHeight, "#fed7aa", percentage, "center", '13px "Segoe UI", Arial, sans-serif', "#7c2d12", true);
    drawCell(startX + wTitle + wWeek, currentY, wKet, footerHeight, "#f8fafc", "", "center");
  }

  // ==========================================
  // MODE 4: BULANAN (MATRIX 1..31)
  // ==========================================
  else {
    const dim = config.daysInMonth || 31;
    const title = `REKAPITULASI PRESENSI ${tingkatLabel} ${config.bulanTahun}`.toUpperCase();
    const wTitle = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
    drawCell(startX, currentY, wTitle, headerRowHeight, "#bbf7d0", title, "center", '13px "Segoe UI", Arial, sans-serif', "#064e3b", true);

    const wDays = colWidths.slice(4, 4 + dim).reduce((a, b) => a + b, 0);
    drawCell(startX + wTitle, currentY, wDays, headerRowHeight, "#f8fafc", `TANGGAL 1 S.D ${dim}`, "center", '11px "Segoe UI", Arial, sans-serif', "#334155", true);

    const wKet = colWidths.slice(4 + dim).reduce((a, b) => a + b, 0);
    drawCell(startX + wTitle + wDays, currentY, wKet, headerRowHeight, "#f1f5f9", "TOTAL", "center", '11px "Segoe UI", Arial, sans-serif', "#1e293b", true);

    currentY += headerRowHeight;

    // Subheaders
    let colX = startX;
    drawCell(colX, currentY, colWidths[0], subHeaderHeight * 2, "#f8fafc", "NO", "center", '10px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[0];
    drawCell(colX, currentY, colWidths[1], subHeaderHeight * 2, "#f8fafc", "KELAS", "center", '10px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[1];
    drawCell(colX, currentY, colWidths[2], subHeaderHeight * 2, "#f8fafc", "NIS", "center", '10px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[2];
    drawCell(colX, currentY, colWidths[3], subHeaderHeight * 2, "#f8fafc", "NAMA SISWA", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
    colX += colWidths[3];

    // Day numbers 1..dim
    for (let d = 1; d <= dim; d++) {
      drawCell(colX, currentY, colWidths[3 + d], subHeaderHeight * 2, "#f8fafc", d, "center", '10px "Segoe UI", Arial, sans-serif', "#000000", true);
      colX += colWidths[3 + d];
    }

    const lastIdx = 4 + dim;
    drawCell(colX, currentY, colWidths[lastIdx], subHeaderHeight * 2, "#fef08a", "S", "center", '10px "Segoe UI", Arial, sans-serif', "#854d0e", true);
    colX += colWidths[lastIdx];
    drawCell(colX, currentY, colWidths[lastIdx + 1], subHeaderHeight * 2, "#67e8f9", "I", "center", '10px "Segoe UI", Arial, sans-serif', "#155e75", true);
    colX += colWidths[lastIdx + 1];
    drawCell(colX, currentY, colWidths[lastIdx + 2], subHeaderHeight * 2, "#ef4444", "A", "center", '10px "Segoe UI", Arial, sans-serif', "#ffffff", true);
    colX += colWidths[lastIdx + 2];
    drawCell(colX, currentY, colWidths[lastIdx + 3], subHeaderHeight * 2, "#e2e8f0", "Tot", "center", '10px "Segoe UI", Arial, sans-serif', "#0f172a", true);

    currentY += subHeaderHeight * 2;

    // Rows
    config.items.forEach((row, i) => {
      let x = startX;
      const isEven = i % 2 === 0;
      const defaultBg = isEven ? "#ffffff" : "#fcfcfc";

      drawCell(x, currentY, colWidths[0], rowHeight, defaultBg, row.no, "center", '10px "Segoe UI", Arial, sans-serif', "#334155");
      x += colWidths[0];
      drawCell(x, currentY, colWidths[1], rowHeight, defaultBg, row.kelas, "center", '10px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      x += colWidths[1];
      drawCell(x, currentY, colWidths[2], rowHeight, defaultBg, row.nis, "center", '10px "Courier New", monospace', "#475569");
      x += colWidths[2];
      drawCell(x, currentY, colWidths[3], rowHeight, defaultBg, row.nama, "left", '11px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      x += colWidths[3];

      // Monthly Statuses (1..dim)
      const mStatuses = row.monthlyStatuses || [];
      for (let d = 1; d <= dim; d++) {
        const st = mStatuses[d - 1] || "";
        let statBg = defaultBg;
        let statColor = "#000000";
        if (st === "S") { statBg = "#fef08a"; statColor = "#854d0e"; }
        else if (st === "I") { statBg = "#67e8f9"; statColor = "#155e75"; }
        else if (st === "A") { statBg = "#ef4444"; statColor = "#ffffff"; }
        else if (st === "H") { statBg = "#dcfce7"; statColor = "#166534"; }

        drawCell(x, currentY, colWidths[3 + d], rowHeight, statBg, st === "H" ? "" : st, "center", '9px "Segoe UI", Arial, sans-serif', statColor, true);
        x += colWidths[3 + d];
      }

      const sBg = row.sakit > 0 ? "#fef08a" : defaultBg;
      drawCell(x, currentY, colWidths[lastIdx], rowHeight, sBg, row.sakit, "center", '10px "Segoe UI", Arial, sans-serif', "#000000", row.sakit > 0);
      x += colWidths[lastIdx];
      const iBg = row.izin > 0 ? "#67e8f9" : defaultBg;
      drawCell(x, currentY, colWidths[lastIdx + 1], rowHeight, iBg, row.izin, "center", '10px "Segoe UI", Arial, sans-serif', "#000000", row.izin > 0);
      x += colWidths[lastIdx + 1];
      const aBg = row.alpa > 0 ? "#ef4444" : defaultBg;
      const aColor = row.alpa > 0 ? "#ffffff" : "#000000";
      drawCell(x, currentY, colWidths[lastIdx + 2], rowHeight, aBg, row.alpa, "center", '10px "Segoe UI", Arial, sans-serif', aColor, row.alpa > 0);
      x += colWidths[lastIdx + 2];

      drawCell(x, currentY, colWidths[lastIdx + 3], rowHeight, "#f8fafc", row.total, "center", '10px "Segoe UI", Arial, sans-serif', "#0f172a", true);
      currentY += rowHeight;
    });

    // Footers
    const percentage = config.totalSiswa > 0 ? ((config.totalTidakHadir / config.totalSiswa) * 100).toFixed(2).replace(".", ",") + "%" : "0%";
    drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "TOTAL SISWA TIDAK HADIR", "right", '11px "Segoe UI", Arial, sans-serif', "#0f172a", true);
    drawCell(startX + wTitle, currentY, wDays, footerHeight, "#fed7aa", config.totalTidakHadir, "center", '12px "Segoe UI", Arial, sans-serif', "#7c2d12", true);
    drawCell(startX + wTitle + wDays, currentY, wKet, footerHeight, "#f8fafc", "", "center");

    currentY += footerHeight;
    drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "PROSENTASE KETIDAKHADIRAN", "right", '11px "Segoe UI", Arial, sans-serif', "#0f172a", true);
    drawCell(startX + wTitle, currentY, wDays, footerHeight, "#fed7aa", percentage, "center", '12px "Segoe UI", Arial, sans-serif', "#7c2d12", true);
    drawCell(startX + wTitle + wDays, currentY, wKet, footerHeight, "#f8fafc", "", "center");
  }

  return canvas;
}

export async function downloadReportImage(config: ReportConfig): Promise<void> {
  const canvas = generateReportCanvas(config);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeDate = (config.tanggalSingkat || config.bulanTahun).replace(/[\/\s]/g, "-");
    a.download = `Rekap_Presensi_${config.mode}_${config.tingkat}_${safeDate}.png`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export async function copyReportImageToClipboard(config: ReportConfig): Promise<boolean> {
  const canvas = generateReportCanvas(config);
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return resolve(false);
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        resolve(true);
      } catch (err) {
        console.error("Gagal copy image ke clipboard:", err);
        resolve(false);
      }
    }, "image/png");
  });
}
