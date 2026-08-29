export interface ReportItem {
  no: number;
  kelas: string;
  nis: string;
  nama: string;
  statusToday: string; // 'S' | 'I' | 'A' | '-'
  sakit: number;
  izin: number;
  alpa: number;
  total: number;
}

export interface ReportConfig {
  tingkat: string;
  bulanTahun: string; // e.g. "AGUSTUS 2026"
  hariTanggal: string; // e.g. "28/08/2026"
  namaHari: string; // e.g. "Jum'at"
  tanggalSingkat: string; // e.g. "28/08/26"
  totalTidakHadir: number;
  totalSiswa: number;
  items: ReportItem[];
}

export function generateReportCanvas(config: ReportConfig): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  const scale = 2; // Hi-DPI
  const colWidths = [45, 80, 75, 290, 85, 60, 60, 60, 60];
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRowHeight = 34;
  const subHeaderHeight = 22;
  const rowHeight = 26;
  const footerHeight = 26;
  const padding = 20;

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

  // 1. MAIN HEADER
  const tingkatLabel = config.tingkat === "SEMUA" ? "SEMUA TINGKAT" : `KELAS ${config.tingkat}`;
  const title = `PRESENSI ${tingkatLabel} ${config.bulanTahun}`.toUpperCase();
  const wTitle = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3];
  drawCell(startX, currentY, wTitle, headerRowHeight, "#bbf7d0", title, "center", '15px "Segoe UI", Arial, sans-serif', "#064e3b", true);

  drawCell(startX + wTitle, currentY, colWidths[4], headerRowHeight, "#f8fafc", `TANGGAL ${config.tanggalSingkat}`, "center", '10px "Segoe UI", Arial, sans-serif', "#334155", true);

  const wKet = colWidths[5] + colWidths[6] + colWidths[7] + colWidths[8];
  drawCell(startX + wTitle + colWidths[4], currentY, wKet, headerRowHeight, "#f1f5f9", "JUMLAH KETIDAKHADIRAN", "center", '11px "Segoe UI", Arial, sans-serif', "#1e293b", true);

  currentY += headerRowHeight;

  // 2. SUBHEADERS (Rows 2 & 3)
  let colX = startX;
  drawCell(colX, currentY, colWidths[0], subHeaderHeight * 2, "#f8fafc", "NO", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
  colX += colWidths[0];

  drawCell(colX, currentY, colWidths[1], subHeaderHeight * 2, "#f8fafc", "KELAS", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
  colX += colWidths[1];

  drawCell(colX, currentY, colWidths[2], subHeaderHeight * 2, "#f8fafc", "NIS", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
  colX += colWidths[2];

  drawCell(colX, currentY, colWidths[3], subHeaderHeight * 2, "#f8fafc", "NAMA", "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
  colX += colWidths[3];

  drawCell(colX, currentY, colWidths[4], subHeaderHeight, "#f8fafc", config.namaHari, "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
  drawCell(colX, currentY + subHeaderHeight, colWidths[4], subHeaderHeight, "#f8fafc", config.tanggalSingkat, "center", '11px "Segoe UI", Arial, sans-serif', "#000000", true);
  colX += colWidths[4];

  drawCell(colX, currentY, colWidths[5], subHeaderHeight * 2, "#fef08a", "Sakit", "center", '12px "Segoe UI", Arial, sans-serif', "#854d0e", true);
  colX += colWidths[5];

  drawCell(colX, currentY, colWidths[6], subHeaderHeight * 2, "#67e8f9", "Izin", "center", '12px "Segoe UI", Arial, sans-serif', "#155e75", true);
  colX += colWidths[6];

  drawCell(colX, currentY, colWidths[7], subHeaderHeight * 2, "#ef4444", "Alpa", "center", '12px "Segoe UI", Arial, sans-serif', "#ffffff", true);
  colX += colWidths[7];

  drawCell(colX, currentY, colWidths[8], subHeaderHeight * 2, "#e2e8f0", "Total", "center", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);

  currentY += subHeaderHeight * 2;

  // 3. DATA ROWS
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
    if (row.statusToday === "S") { statBg = "#fef08a"; statColor = "#854d0e"; }
    else if (row.statusToday === "I") { statBg = "#67e8f9"; statColor = "#155e75"; }
    else if (row.statusToday === "A") { statBg = "#ef4444"; statColor = "#ffffff"; }
    drawCell(x, currentY, colWidths[4], rowHeight, statBg, row.statusToday, "center", '12px "Segoe UI", Arial, sans-serif', statColor, true);
    x += colWidths[4];

    const sBg = row.sakit > 0 ? "#fef08a" : defaultBg;
    drawCell(x, currentY, colWidths[5], rowHeight, sBg, row.sakit, "center", '12px "Segoe UI", Arial, sans-serif', "#000000", row.sakit > 0);
    x += colWidths[5];

    const iBg = row.izin > 0 ? "#67e8f9" : defaultBg;
    drawCell(x, currentY, colWidths[6], rowHeight, iBg, row.izin, "center", '12px "Segoe UI", Arial, sans-serif', "#000000", row.izin > 0);
    x += colWidths[6];

    const aBg = row.alpa > 0 ? "#ef4444" : defaultBg;
    const aColor = row.alpa > 0 ? "#ffffff" : "#000000";
    drawCell(x, currentY, colWidths[7], rowHeight, aBg, row.alpa, "center", '12px "Segoe UI", Arial, sans-serif', aColor, row.alpa > 0);
    x += colWidths[7];

    drawCell(x, currentY, colWidths[8], rowHeight, "#f8fafc", row.total, "center", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);

    currentY += rowHeight;
  });

  // 4. FOOTERS
  const percentage = config.totalSiswa > 0
    ? ((config.totalTidakHadir / config.totalSiswa) * 100).toFixed(2).replace(".", ",") + "%"
    : "0%";

  drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "TOTAL SISWA TIDAK HADIR", "right", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
  drawCell(startX + wTitle, currentY, colWidths[4], footerHeight, "#fed7aa", config.totalTidakHadir, "center", '13px "Segoe UI", Arial, sans-serif', "#7c2d12", true);
  drawCell(startX + wTitle + colWidths[4], currentY, wKet, footerHeight, "#f8fafc", "", "center");

  currentY += footerHeight;

  drawCell(startX, currentY, wTitle, footerHeight, "#f8fafc", "PROSENTASE KETIDAKHADIRAN", "right", '12px "Segoe UI", Arial, sans-serif', "#0f172a", true);
  drawCell(startX + wTitle, currentY, colWidths[4], footerHeight, "#fed7aa", percentage, "center", '13px "Segoe UI", Arial, sans-serif', "#7c2d12", true);
  drawCell(startX + wTitle + colWidths[4], currentY, wKet, footerHeight, "#f8fafc", "", "center");

  return canvas;
}

export async function downloadReportImage(config: ReportConfig): Promise<void> {
  const canvas = generateReportCanvas(config);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeDate = config.tanggalSingkat.replace(/\//g, "-");
    a.download = `Rekap_Presensi_${config.tingkat}_${safeDate}.png`;
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
