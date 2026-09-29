import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ReportConfig } from "./reportImage";

export async function downloadReportExcel(config: ReportConfig): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Presensi Siswa BK";
  const ws = wb.addWorksheet("Rekap Presensi");

  const borderAll: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF475569" } },
    left: { style: "thin", color: { argb: "FF475569" } },
    bottom: { style: "thin", color: { argb: "FF475569" } },
    right: { style: "thin", color: { argb: "FF475569" } },
  };

  const centerAlign: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center" };
  const leftAlign: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "left", indent: 1 };
  const rightAlign: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "right", indent: 1 };

  function applyStyle(cell: ExcelJS.Cell, bg: string, fontColor: string, bold: boolean, align: Partial<ExcelJS.Alignment>, border = borderAll) {
    if (bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg.replace("#", "FF") } };
    cell.font = { name: "Segoe UI", size: 11, bold: bold, color: { argb: fontColor.replace("#", "FF") } };
    cell.alignment = align;
    cell.border = border;
  }

  const tingkatLabel = config.tingkat === "SEMUA" ? "SEMUA TINGKAT" : `KELAS ${config.tingkat}`;
  let currentRow = 1;

  if (config.mode === "HARIAN") {
    ws.columns = [
      { width: 5 }, // NO
      { width: 12 }, // KELAS
      { width: 12 }, // NIS
      { width: 35 }, // NAMA
      { width: 15 }, // TANGGAL
    ];

    ws.mergeCells(`A${currentRow}:D${currentRow}`);
    const titleCell = ws.getCell(`A${currentRow}`);
    titleCell.value = `PRESENSI ${tingkatLabel} ${config.bulanTahun}`.toUpperCase();
    applyStyle(titleCell, "FFBBF7D0", "FF064E3B", true, centerAlign);
    
    const dCell = ws.getCell(`E${currentRow}`);
    dCell.value = `TANGGAL ${config.tanggalSingkat || ""}`;
    applyStyle(dCell, "FFF8FAFC", "FF334155", true, centerAlign);
    
    ws.getRow(currentRow).height = 25;
    currentRow++;

    // Subheaders
    const headers = ["NO", "KELAS", "NIS", "NAMA"];
    headers.forEach((h, i) => {
      const colChar = String.fromCharCode(65 + i);
      ws.mergeCells(`${colChar}${currentRow}:${colChar}${currentRow + 1}`);
      const c = ws.getCell(`${colChar}${currentRow}`);
      c.value = h;
      applyStyle(c, "FFF8FAFC", "FF000000", true, centerAlign);
    });

    const dTitle = ws.getCell(`E${currentRow}`);
    dTitle.value = config.namaHari || "";
    applyStyle(dTitle, "FFF8FAFC", "FF000000", true, centerAlign);
    
    const dSub = ws.getCell(`E${currentRow + 1}`);
    dSub.value = config.tanggalSingkat || "";
    applyStyle(dSub, "FFF8FAFC", "FF000000", true, centerAlign);

    ws.getRow(currentRow).height = 16;
    ws.getRow(currentRow + 1).height = 16;
    currentRow += 2;

    // Rows
    config.items.forEach((row, i) => {
      const isEven = i % 2 === 0;
      const defaultBg = isEven ? "FFFFFFFF" : "FFFCFCFC";
      
      const r = ws.getRow(currentRow);
      r.height = 20;

      r.getCell(1).value = row.no;
      applyStyle(r.getCell(1), defaultBg, "FF334155", false, centerAlign);

      r.getCell(2).value = row.kelas;
      applyStyle(r.getCell(2), defaultBg, "FF0F172A", true, centerAlign);

      r.getCell(3).value = row.nis;
      applyStyle(r.getCell(3), defaultBg, "FF475569", false, centerAlign);
      r.getCell(3).font.name = "Courier New";

      r.getCell(4).value = row.nama;
      applyStyle(r.getCell(4), defaultBg, "FF0F172A", true, leftAlign);

      let statBg = "FFFFFFFF";
      let statColor = "FF000000";
      const st = row.statusToday || "-";
      let fullStatus = st;
      
      if (st === "S") { statBg = "FFFEF08A"; statColor = "FF854D0E"; fullStatus = "Sakit"; }
      else if (st === "I") { statBg = "FF67E8F9"; statColor = "FF155E75"; fullStatus = "Izin"; }
      else if (st === "A") { statBg = "FFEF4444"; statColor = "FFFFFFFF"; fullStatus = "Alpa"; }

      r.getCell(5).value = fullStatus;
      applyStyle(r.getCell(5), statBg, statColor, true, centerAlign);

      currentRow++;
    });

    const foot1 = ws.getRow(currentRow);
    foot1.height = 20;
    ws.mergeCells(`A${currentRow}:D${currentRow}`);
    foot1.getCell(1).value = "TOTAL SISWA TIDAK HADIR";
    applyStyle(foot1.getCell(1), "FFF8FAFC", "FF0F172A", true, rightAlign);
    foot1.getCell(5).value = config.totalTidakHadir;
    applyStyle(foot1.getCell(5), "FFFED7AA", "FF7C2D12", true, centerAlign);
    currentRow++;

    const foot2 = ws.getRow(currentRow);
    foot2.height = 20;
    ws.mergeCells(`A${currentRow}:D${currentRow}`);
    foot2.getCell(1).value = "PROSENTASE KETIDAKHADIRAN";
    applyStyle(foot2.getCell(1), "FFF8FAFC", "FF0F172A", true, rightAlign);
    const percentage = config.totalSiswa > 0 ? ((config.totalTidakHadir / config.totalSiswa) * 100).toFixed(2).replace(".", ",") + "%" : "0%";
    foot2.getCell(5).value = percentage;
    applyStyle(foot2.getCell(5), "FFFED7AA", "FF7C2D12", true, centerAlign);

  } else if (config.mode === "MINGGUAN") {
    ws.columns = [
      { width: 5 }, { width: 12 }, { width: 12 }, { width: 35 },
      { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, // 5 days
      { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 } // S I A Tot
    ];

    ws.mergeCells(`A${currentRow}:D${currentRow}`);
    const titleCell = ws.getCell(`A${currentRow}`);
    titleCell.value = `PRESENSI ${tingkatLabel} ${config.bulanTahun}`.toUpperCase();
    applyStyle(titleCell, "FFBBF7D0", "FF064E3B", true, centerAlign);

    ws.mergeCells(`E${currentRow}:I${currentRow}`);
    const wWeek = ws.getCell(`E${currentRow}`);
    wWeek.value = config.periodeMinggu || "PERIODE MINGGUAN";
    applyStyle(wWeek, "FFF8FAFC", "FF334155", true, centerAlign);

    ws.mergeCells(`J${currentRow}:M${currentRow}`);
    const wKet = ws.getCell(`J${currentRow}`);
    wKet.value = "JUMLAH KETIDAKHADIRAN";
    applyStyle(wKet, "FFF1F5F9", "FF1E293B", true, centerAlign);

    ws.getRow(currentRow).height = 25;
    currentRow++;

    const headers = ["NO", "KELAS", "NIS", "NAMA"];
    headers.forEach((h, i) => {
      const colChar = String.fromCharCode(65 + i);
      ws.mergeCells(`${colChar}${currentRow}:${colChar}${currentRow + 1}`);
      const c = ws.getCell(`${colChar}${currentRow}`);
      c.value = h;
      applyStyle(c, "FFF8FAFC", "FF000000", true, centerAlign);
    });

    const weekList = config.weekDays || [
      { dayName: "Senin", dateShort: "-" }, { dayName: "Selasa", dateShort: "-" },
      { dayName: "Rabu", dateShort: "-" }, { dayName: "Kamis", dateShort: "-" },
      { dayName: "Jum'at", dateShort: "-" }
    ];

    weekList.forEach((wd, idx) => {
      const colChar = String.fromCharCode(69 + idx); // E, F, G, H, I
      const c1 = ws.getCell(`${colChar}${currentRow}`);
      c1.value = wd.dayName;
      applyStyle(c1, "FFF8FAFC", "FF000000", true, centerAlign);
      c1.font.size = 10;
      const c2 = ws.getCell(`${colChar}${currentRow + 1}`);
      c2.value = wd.dateShort;
      applyStyle(c2, "FFF8FAFC", "FF000000", true, centerAlign);
      c2.font.size = 10;
    });

    const ketHeaders = [
      { label: "Sakit", bg: "FFFEF08A", fc: "FF854D0E" },
      { label: "Izin", bg: "FF67E8F9", fc: "FF155E75" },
      { label: "Alpa", bg: "FFEF4444", fc: "FFFFFFFF" },
      { label: "Total", bg: "FFE2E8F0", fc: "FF0F172A" }
    ];

    ketHeaders.forEach((k, idx) => {
      const colChar = String.fromCharCode(74 + idx); // J, K, L, M
      ws.mergeCells(`${colChar}${currentRow}:${colChar}${currentRow + 1}`);
      const c = ws.getCell(`${colChar}${currentRow}`);
      c.value = k.label;
      applyStyle(c, k.bg, k.fc, true, centerAlign);
    });

    ws.getRow(currentRow).height = 16;
    ws.getRow(currentRow + 1).height = 16;
    currentRow += 2;

    config.items.forEach((row, i) => {
      const isEven = i % 2 === 0;
      const defaultBg = isEven ? "FFFFFFFF" : "FFFCFCFC";
      const r = ws.getRow(currentRow);
      r.height = 20;

      r.getCell(1).value = row.no;
      applyStyle(r.getCell(1), defaultBg, "FF334155", false, centerAlign);
      r.getCell(2).value = row.kelas;
      applyStyle(r.getCell(2), defaultBg, "FF0F172A", true, centerAlign);
      r.getCell(3).value = row.nis;
      applyStyle(r.getCell(3), defaultBg, "FF475569", false, centerAlign);
      r.getCell(3).font.name = "Courier New";
      r.getCell(4).value = row.nama;
      applyStyle(r.getCell(4), defaultBg, "FF0F172A", true, leftAlign);

      const statuses = row.weeklyStatuses || ["-", "-", "-", "-", "-"];
      statuses.forEach((st, idx) => {
        let statBg = defaultBg;
        let statColor = "FF000000";
        if (st === "S") { statBg = "FFFEF08A"; statColor = "FF854D0E"; }
        else if (st === "I") { statBg = "FF67E8F9"; statColor = "FF155E75"; }
        else if (st === "A") { statBg = "FFEF4444"; statColor = "FFFFFFFF"; }
        else if (st === "H") { statBg = "FFDCFCE7"; statColor = "FF166534"; }
        r.getCell(5 + idx).value = st === "-" ? "" : st;
        applyStyle(r.getCell(5 + idx), statBg, statColor, true, centerAlign);
      });

      r.getCell(10).value = row.sakit;
      applyStyle(r.getCell(10), row.sakit > 0 ? "FFFEF08A" : defaultBg, "FF000000", row.sakit > 0, centerAlign);
      r.getCell(11).value = row.izin;
      applyStyle(r.getCell(11), row.izin > 0 ? "FF67E8F9" : defaultBg, "FF000000", row.izin > 0, centerAlign);
      r.getCell(12).value = row.alpa;
      applyStyle(r.getCell(12), row.alpa > 0 ? "FFEF4444" : defaultBg, row.alpa > 0 ? "FFFFFFFF" : "FF000000", row.alpa > 0, centerAlign);
      r.getCell(13).value = row.total;
      applyStyle(r.getCell(13), "FFF8FAFC", "FF0F172A", true, centerAlign);

      currentRow++;
    });

    const foot1 = ws.getRow(currentRow);
    foot1.height = 20;
    ws.mergeCells(`A${currentRow}:D${currentRow}`);
    foot1.getCell(1).value = "TOTAL SISWA TIDAK HADIR";
    applyStyle(foot1.getCell(1), "FFF8FAFC", "FF0F172A", true, rightAlign);
    ws.mergeCells(`E${currentRow}:I${currentRow}`);
    foot1.getCell(5).value = config.totalTidakHadir;
    applyStyle(foot1.getCell(5), "FFFED7AA", "FF7C2D12", true, centerAlign);
    ws.mergeCells(`J${currentRow}:M${currentRow}`);
    applyStyle(foot1.getCell(10), "FFF8FAFC", "FF000000", false, centerAlign);
    currentRow++;

    const foot2 = ws.getRow(currentRow);
    foot2.height = 20;
    ws.mergeCells(`A${currentRow}:D${currentRow}`);
    foot2.getCell(1).value = "PROSENTASE KETIDAKHADIRAN";
    applyStyle(foot2.getCell(1), "FFF8FAFC", "FF0F172A", true, rightAlign);
    ws.mergeCells(`E${currentRow}:I${currentRow}`);
    const percentage = config.totalSiswa > 0 ? ((config.totalTidakHadir / config.totalSiswa) * 100).toFixed(2).replace(".", ",") + "%" : "0%";
    foot2.getCell(5).value = percentage;
    applyStyle(foot2.getCell(5), "FFFED7AA", "FF7C2D12", true, centerAlign);
    ws.mergeCells(`J${currentRow}:M${currentRow}`);
    applyStyle(foot2.getCell(10), "FFF8FAFC", "FF000000", false, centerAlign);

  } else {
    // BULANAN (Sesuai PDF SMK Gajah Mungkur 1)
    const dim = config.daysInMonth || 31;
    ws.columns = [
      { width: 5 }, // NO
      { width: 10 }, // KELAS
      { width: 10 }, // NIS
      { width: 35 }, // NAMA
      { width: 10 }, // Sakit
      { width: 10 }, // Izin
      { width: 10 }, // Alpa
      { width: 15 }, // Total Tidak Hadir
      { width: 15 }, // PERSENTASE TIDAK HADIR
      { width: 15 }  // PERSENTASE HADIR
    ];

    ws.mergeCells(`A${currentRow}:J${currentRow}`);
    const titleCell = ws.getCell(`A${currentRow}`);
    titleCell.value = `SMK GAJAH MUNGKUR 1 WURYANTORO TAHUN AJARAN 2025/2026`;
    applyStyle(titleCell, "FFBBF7D0", "FF064E3B", true, centerAlign);

    ws.getRow(currentRow).height = 25;
    currentRow++;

    // Header Tabel Atas
    const headers = ["NO", "KELAS", "NIS", "NAMA"];
    headers.forEach((h, i) => {
      ws.mergeCells(currentRow, i + 1, currentRow + 1, i + 1);
      const c = ws.getCell(currentRow, i + 1);
      c.value = h;
      applyStyle(c, "FFF8FAFC", "FF000000", true, centerAlign);
      c.font.size = 10;
    });

    // Alasan Tidak Hadir
    ws.mergeCells(currentRow, 5, currentRow, 7);
    const alasanCell = ws.getCell(currentRow, 5);
    alasanCell.value = "Alasan Tidak Hadir";
    applyStyle(alasanCell, "FFF8FAFC", "FF000000", true, centerAlign);
    alasanCell.font.size = 10;

    // Total Tidak Hadir
    ws.mergeCells(currentRow, 8, currentRow + 1, 8);
    const totalCell = ws.getCell(currentRow, 8);
    totalCell.value = "Total Tidak Hadir";
    applyStyle(totalCell, "FFF8FAFC", "FF000000", true, centerAlign);
    totalCell.font.size = 10;
    totalCell.alignment = { ...centerAlign, wrapText: true };

    // Persentase
    ws.mergeCells(currentRow, 9, currentRow, 10);
    const persentaseCell = ws.getCell(currentRow, 9);
    persentaseCell.value = "PERSENTASE";
    applyStyle(persentaseCell, "FFF8FAFC", "FF000000", true, centerAlign);
    persentaseCell.font.size = 10;

    // Sub-Header (Baris 2)
    const ketHeaders = [
      { label: "Sakit", bg: "FFFEF08A", fc: "FF854D0E", col: 5 },
      { label: "Izin", bg: "FF67E8F9", fc: "FF155E75", col: 6 },
      { label: "Alpa", bg: "FFEF4444", fc: "FFFFFFFF", col: 7 },
    ];

    ketHeaders.forEach((k) => {
      const c = ws.getCell(currentRow + 1, k.col);
      c.value = k.label;
      applyStyle(c, k.bg, k.fc, true, centerAlign);
      c.font.size = 10;
    });

    const pTidakHadir = ws.getCell(currentRow + 1, 9);
    pTidakHadir.value = "TIDAK HADIR";
    applyStyle(pTidakHadir, "FFFFE4E6", "FFBE123C", true, centerAlign); // Merah pudar
    pTidakHadir.font.size = 9;

    const pHadir = ws.getCell(currentRow + 1, 10);
    pHadir.value = "HADIR";
    applyStyle(pHadir, "FFDCFCE7", "FF166534", true, centerAlign); // Hijau pudar
    pHadir.font.size = 9;

    ws.getRow(currentRow).height = 18;
    ws.getRow(currentRow + 1).height = 18;
    currentRow += 2;

    // Rows Data Siswa
    let totalSiswaBermasalah = 0; // <90% hadir
    const countPerKelas: Record<string, number> = {};

    config.items.forEach((row, i) => {
      const isEven = i % 2 === 0;
      const defaultBg = isEven ? "FFFFFFFF" : "FFFCFCFC";
      const r = ws.getRow(currentRow);
      r.height = 18;

      r.getCell(1).value = row.no;
      applyStyle(r.getCell(1), defaultBg, "FF334155", false, centerAlign);
      r.getCell(1).font.size = 10;
      
      r.getCell(2).value = row.kelas;
      applyStyle(r.getCell(2), defaultBg, "FF0F172A", true, centerAlign);
      r.getCell(2).font.size = 10;
      
      r.getCell(3).value = row.nis;
      applyStyle(r.getCell(3), defaultBg, "FF475569", false, centerAlign);
      r.getCell(3).font.name = "Courier New";
      r.getCell(3).font.size = 10;
      
      r.getCell(4).value = row.nama;
      applyStyle(r.getCell(4), defaultBg, "FF0F172A", true, leftAlign);
      r.getCell(4).font.size = 10;

      r.getCell(5).value = row.sakit;
      applyStyle(r.getCell(5), row.sakit > 0 ? "FFFEF08A" : defaultBg, "FF000000", row.sakit > 0, centerAlign);
      r.getCell(5).font.size = 10;
      
      r.getCell(6).value = row.izin;
      applyStyle(r.getCell(6), row.izin > 0 ? "FF67E8F9" : defaultBg, "FF000000", row.izin > 0, centerAlign);
      r.getCell(6).font.size = 10;
      
      r.getCell(7).value = row.alpa;
      applyStyle(r.getCell(7), row.alpa > 0 ? "FFEF4444" : defaultBg, row.alpa > 0 ? "FFFFFFFF" : "FF000000", row.alpa > 0, centerAlign);
      r.getCell(7).font.size = 10;
      
      const totalAbsen = row.sakit + row.izin + row.alpa;
      r.getCell(8).value = totalAbsen;
      applyStyle(r.getCell(8), "FFF8FAFC", "FF0F172A", true, centerAlign);
      r.getCell(8).font.size = 10;

      // Kalkulasi persentase per anak
      const persenTidakHadir = (totalAbsen / dim) * 100;
      const persenHadir = 100 - persenTidakHadir;

      if (persenHadir < 90) {
        totalSiswaBermasalah++;
        countPerKelas[row.kelas] = (countPerKelas[row.kelas] || 0) + 1;
      }

      r.getCell(9).value = persenTidakHadir === 0 ? "-" : persenTidakHadir.toFixed(2) + "%";
      applyStyle(r.getCell(9), defaultBg, "FFBE123C", false, centerAlign);
      r.getCell(9).font.size = 10;

      r.getCell(10).value = persenHadir.toFixed(2) + "%";
      applyStyle(r.getCell(10), persenHadir < 90 ? "FFFEF08A" : defaultBg, persenHadir < 90 ? "FFB45309" : "FF166534", persenHadir < 90, centerAlign);
      r.getCell(10).font.size = 10;

      currentRow++;
    });

    // Spacer 1 baris
    currentRow++;

    // Footer Ringkasan (Meniru format PDF)
    ws.mergeCells(`A${currentRow}:C${currentRow}`);
    const footTitle = ws.getCell(`A${currentRow}`);
    footTitle.value = "Jumlah Siswa dengan Ketidakhadiran <90%";
    applyStyle(footTitle, "FFFFFFFF", "FF000000", true, leftAlign);
    footTitle.border = {}; // Hapus border

    const footTotal = ws.getCell(`D${currentRow}`);
    footTotal.value = totalSiswaBermasalah;
    applyStyle(footTotal, "FFFFFFFF", "FF000000", true, leftAlign);
    footTotal.border = {};
    currentRow++;

    // List kelas yang ada di tabel ini
    const kelasUnik = Array.from(new Set(config.items.map(s => s.kelas))).sort();
    
    kelasUnik.forEach((kls) => {
      ws.mergeCells(`A${currentRow}:C${currentRow}`);
      const cKls = ws.getCell(`A${currentRow}`);
      cKls.value = kls;
      applyStyle(cKls, "FFFFFFFF", "FF000000", false, leftAlign);
      cKls.border = {};

      const cJml = ws.getCell(`D${currentRow}`);
      cJml.value = countPerKelas[kls] || 0;
      applyStyle(cJml, "FFFFFFFF", "FF000000", false, leftAlign);
      cJml.border = {};

      currentRow++;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const safeDate = (config.tanggalSingkat || config.bulanTahun).replace(/[\/\s]/g, "-");
  saveAs(new Blob([buffer]), `Rekap_Presensi_${config.mode}_${config.tingkat}_${safeDate}.xlsx`);
}