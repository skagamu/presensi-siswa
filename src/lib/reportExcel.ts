import type * as ExcelJS from "exceljs";
import { absenceRate } from "./reportData";
import { saveAs } from "file-saver";
import type { ReportConfig } from "./reportImage";

export async function downloadReportExcel(config: ReportConfig): Promise<void> {
  const Excel = await import("exceljs");
  const wb = new Excel.Workbook();
  wb.creator = "Presensi Siswa BK";
  wb.calcProperties.fullCalcOnLoad = true;
  if (config.mode === "KUSTOM") {
    await downloadCustomReportExcel(wb, config);
    return;
  }
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
    const dailyEndRow = currentRow - 2;
    const dailyPct = config.totalSiswa > 0 ? absenceRate(config.totalTidakHadir, config.totalSiswa * config.schoolDays) : 0;
    foot2.getCell(5).value = config.items.length ? {
      formula: `IFERROR((COUNTIF(E4:E${dailyEndRow},"Sakit")+COUNTIF(E4:E${dailyEndRow},"Izin")+COUNTIF(E4:E${dailyEndRow},"Alpa"))/(COUNTA(E4:E${dailyEndRow})*${config.schoolDays}),0)`,
      result: dailyPct,
    } : dailyPct;
    foot2.getCell(5).numFmt = "0.00%";
    applyStyle(foot2.getCell(5), "FFFED7AA", "FF7C2D12", true, centerAlign);

  } else if (config.mode === "MINGGUAN") {
    ws.columns = [
      { width: 5 }, { width: 12 }, { width: 12 }, { width: 35 },
      { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, // 5 days
      { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, // S I A Tot
      { width: 14 }, { width: 14 }, // % TIDAK HADIR, % HADIR
    ];

    ws.mergeCells(currentRow, 1, currentRow, 4);
    const titleCell = ws.getCell(currentRow, 1);
    titleCell.value = `PRESENSI ${tingkatLabel} ${config.bulanTahun}`.toUpperCase();
    applyStyle(titleCell, "FFBBF7D0", "FF064E3B", true, centerAlign);

    ws.mergeCells(currentRow, 5, currentRow, 9);
    const wWeek = ws.getCell(currentRow, 5);
    wWeek.value = config.periodeMinggu || "PERIODE MINGGUAN";
    applyStyle(wWeek, "FFF8FAFC", "FF334155", true, centerAlign);

    ws.mergeCells(currentRow, 10, currentRow, 13);
    const wKet = ws.getCell(currentRow, 10);
    wKet.value = "JUMLAH KETIDAKHADIRAN";
    applyStyle(wKet, "FFF1F5F9", "FF1E293B", true, centerAlign);

    ws.mergeCells(currentRow, 14, currentRow, 15);
    const wPersen = ws.getCell(currentRow, 14);
    wPersen.value = "PERSENTASE";
    applyStyle(wPersen, "FFF1F5F9", "FF1E293B", true, centerAlign);

    ws.getRow(currentRow).height = 25;
    currentRow++;

    const headers = ["NO", "KELAS", "NIS", "NAMA"];
    headers.forEach((h, i) => {
      ws.mergeCells(currentRow, i + 1, currentRow + 1, i + 1);
      const c = ws.getCell(currentRow, i + 1);
      c.value = h;
      applyStyle(c, "FFF8FAFC", "FF000000", true, centerAlign);
    });

    const weekList = config.weekDays || [
      { dayName: "Senin", dateShort: "-" }, { dayName: "Selasa", dateShort: "-" },
      { dayName: "Rabu", dateShort: "-" }, { dayName: "Kamis", dateShort: "-" },
      { dayName: "Jum'at", dateShort: "-" }
    ];

    weekList.forEach((wd, idx) => {
      const c1 = ws.getCell(currentRow, 5 + idx);
      c1.value = wd.dayName;
      applyStyle(c1, "FFF8FAFC", "FF000000", true, centerAlign);
      c1.font.size = 10;
      const c2 = ws.getCell(currentRow + 1, 5 + idx);
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
      ws.mergeCells(currentRow, 10 + idx, currentRow + 1, 10 + idx);
      const c = ws.getCell(currentRow, 10 + idx);
      c.value = k.label;
      applyStyle(c, k.bg, k.fc, true, centerAlign);
    });

    // PERSENTASE subheaders
    ws.mergeCells(currentRow, 14, currentRow + 1, 14);
    const ph1 = ws.getCell(currentRow, 14);
    ph1.value = "TIDAK HADIR";
    applyStyle(ph1, "FFFFE4E6", "FFBE123C", true, centerAlign);
    ph1.font.size = 9;

    ws.mergeCells(currentRow, 15, currentRow + 1, 15);
    const ph2 = ws.getCell(currentRow, 15);
    ph2.value = "HADIR";
    applyStyle(ph2, "FFDCFCE7", "FF166534", true, centerAlign);
    ph2.font.size = 9;

    ws.getRow(currentRow).height = 16;
    ws.getRow(currentRow + 1).height = 16;
    currentRow += 2;

    const firstDataRow = currentRow;
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

      const statusesForRate = row.weeklyStatuses || [];
      const recordedDays = statusesForRate.filter(status => ["H", "S", "I", "A"].includes(status)).length;
      const tidakHadirMinggu = statusesForRate.filter(status => ["S", "I", "A"].includes(status)).length;
      const pctTidakHadirMinggu = absenceRate(tidakHadirMinggu, recordedDays);
      const pctHadirMinggu = 1 - pctTidakHadirMinggu;

      const cPTH = r.getCell(14);
      cPTH.value = { formula: `IFERROR((COUNTIF(E${currentRow}:I${currentRow},"S")+COUNTIF(E${currentRow}:I${currentRow},"I")+COUNTIF(E${currentRow}:I${currentRow},"A"))/COUNTIF(E${currentRow}:I${currentRow},"<>"),0)`, result: pctTidakHadirMinggu };
      cPTH.numFmt = "0.00%";
      applyStyle(cPTH, defaultBg, "FFBE123C", false, centerAlign);

      const cPH = r.getCell(15);
      cPH.value = { formula: `IFERROR(COUNTIF(E${currentRow}:I${currentRow},"H")/COUNTIF(E${currentRow}:I${currentRow},"<>"),0)`, result: pctHadirMinggu };
      cPH.numFmt = "0.00%";
      if (pctHadirMinggu < 0.90) {
        applyStyle(cPH, "FFFFFFEE58".replace("FF", "FF"), "FF9C0006", true, centerAlign);
        cPH.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEE58" } };
      } else {
        applyStyle(cPH, defaultBg, "FF166534", false, centerAlign);
      }
      cPH.numFmt = "0.00%";

      currentRow++;
    });

    const foot1 = ws.getRow(currentRow);
    foot1.height = 20;
    ws.mergeCells(currentRow, 1, currentRow, 4);
    foot1.getCell(1).value = "TOTAL SISWA TIDAK HADIR";
    applyStyle(foot1.getCell(1), "FFF8FAFC", "FF0F172A", true, rightAlign);
    ws.mergeCells(currentRow, 5, currentRow, 9);
    foot1.getCell(5).value = config.totalTidakHadir;
    applyStyle(foot1.getCell(5), "FFFED7AA", "FF7C2D12", true, centerAlign);
    ws.mergeCells(currentRow, 10, currentRow, 15);
    applyStyle(foot1.getCell(10), "FFF8FAFC", "FF000000", false, centerAlign);
    currentRow++;

    const foot2 = ws.getRow(currentRow);
    foot2.height = 20;
    ws.mergeCells(currentRow, 1, currentRow, 4);
    foot2.getCell(1).value = "PROSENTASE KETIDAKHADIRAN";
    applyStyle(foot2.getCell(1), "FFF8FAFC", "FF0F172A", true, rightAlign);
    ws.mergeCells(currentRow, 5, currentRow, 9);
    const lastDataRow = currentRow - 2;
    const weeklyRate = config.totalSiswa > 0 ? absenceRate(config.totalTidakHadir, config.totalSiswa * config.schoolDays) : 0;
    foot2.getCell(5).value = config.items.length ? {
      formula: `IFERROR((COUNTIF(E${firstDataRow}:I${lastDataRow},"S")+COUNTIF(E${firstDataRow}:I${lastDataRow},"I")+COUNTIF(E${firstDataRow}:I${lastDataRow},"A"))/COUNTIF(E${firstDataRow}:I${lastDataRow},"<>"),0)`,
      result: weeklyRate,
    } : weeklyRate;
    foot2.getCell(5).numFmt = "0.00%";
    applyStyle(foot2.getCell(5), "FFFED7AA", "FF7C2D12", true, centerAlign);
    ws.mergeCells(currentRow, 10, currentRow, 15);
    applyStyle(foot2.getCell(10), "FFF8FAFC", "FF000000", false, centerAlign);

  } else {
    // BULANAN (Sesuai PDF SMK Gajah Mungkur 1)
    const dim = config.schoolDays;
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
    titleCell.value = `SMK GAJAH MUNGKUR 1 WURYANTORO — ${config.bulanTahun}`;
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
      const persenTidakHadir = absenceRate(totalAbsen, dim);
      const persenHadir = 1 - persenTidakHadir;

      if (persenHadir < 0.90) {
        totalSiswaBermasalah++;
        countPerKelas[row.kelas] = (countPerKelas[row.kelas] || 0) + 1;
      }

      const c9 = r.getCell(9);
      c9.value = { formula: `IFERROR(H${currentRow}/${dim},0)`, result: persenTidakHadir };
      c9.numFmt = "0.00%";
      applyStyle(c9, defaultBg, "FFBE123C", false, centerAlign);
      c9.numFmt = "0.00%";
      r.getCell(9).font.size = 10;

      const c10 = r.getCell(10);
      c10.value = { formula: `IFERROR(1-I${currentRow},0)`, result: persenHadir };
      c10.numFmt = "0.00%";
      if (persenHadir < 0.90) {
        applyStyle(c10, "FFFFEE58", "FF9C0006", true, centerAlign);
        c10.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEE58" } };
      } else {
        applyStyle(c10, defaultBg, "FF166534", false, centerAlign);
      }
      c10.numFmt = "0.00%";
      c10.font.size = 10;

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

async function downloadCustomReportExcel(wb: ExcelJS.Workbook, config: ReportConfig): Promise<void> {
  const ws = wb.addWorksheet("Rekap Presensi");
  const days = config.customDays || [];
  const dateStartColumn = 5;
  const dateEndColumn = dateStartColumn + days.length - 1;
  const countStartColumn = dateStartColumn + days.length;
  const totalColumn = countStartColumn + 3;
  const absenceColumn = totalColumn + 1;
  const presenceColumn = totalColumn + 2;
  const lastColumn = presenceColumn;
  const firstDataRow = 4;
  const lastDataRow = firstDataRow + config.items.length - 1;
  const totalRow = lastDataRow + 1;
  const percentageRow = totalRow + 1;
  const border: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF475569" } }, left: { style: "thin", color: { argb: "FF475569" } },
    bottom: { style: "thin", color: { argb: "FF475569" } }, right: { style: "thin", color: { argb: "FF475569" } },
  };
  const center: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center" };
  const left: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "left", indent: 1 };
  const style = (cell: ExcelJS.Cell, fill: string, color: string, bold = false, alignment: Partial<ExcelJS.Alignment> = center) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.font = { name: "Segoe UI", size: 11, bold, color: { argb: color } };
    cell.alignment = alignment;
    cell.border = border;
  };
  const mergeLabel = (row: number, from: number, to: number, value: string, fill: string, color: string, bold: boolean) => {
    if (to > from) ws.mergeCells(row, from, row, to);
    const cell = ws.getCell(row, from);
    cell.value = value;
    style(cell, fill, color, bold);
  };
  const fullDate = (value: string) => value.slice(8, 10) + "/" + value.slice(5, 7) + "/" + value.slice(0, 4);
  const dayCount = days.length;
  const absenceCount = (item: ReportConfig["items"][number], status: string) => item.weeklyStatuses?.filter(value => value === status).length || 0;
  const recordedCount = (item: ReportConfig["items"][number]) => item.weeklyStatuses?.filter(value => ["H", "S", "I", "A"].includes(value)).length || 0;
  const firstDate = days[0] ? fullDate(days[0].dateFull) : "";
  const lastDate = days.length ? fullDate(days[days.length - 1].dateFull) : "";
  const tierLabel = config.tingkat === "SEMUA" ? "SEMUA TINGKAT" : config.tingkat;
  const totalAbsenceFor = (item: ReportConfig["items"][number]) => absenceCount(item, "S") + absenceCount(item, "I") + absenceCount(item, "A");
  const totalAbsenceValue = config.items.reduce((sum, item) => sum + totalAbsenceFor(item), 0);

  ws.columns = [
    { width: 5 }, { width: 12 }, { width: 12 }, { width: 35 },
    ...days.map(() => ({ width: 12 })),
    { width: 8 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 14 }, { width: 14 },
  ];
  mergeLabel(1, 1, 4, `PRESENSI KELAS ${tierLabel} ${config.bulanTahun}\nKeterangan: H=Hadir | S=Sakit | I=Izin | A=Alpha`.toUpperCase(), "FFBBF7D0", "FF064E3B", true);
  ws.getCell("A1").alignment = { ...center, wrapText: true };
  if (dayCount) mergeLabel(1, dateStartColumn, dateEndColumn, `PERIODE ${firstDate} - ${lastDate}`, "FFF8FAFC", "FF334155", true);
  mergeLabel(1, countStartColumn, totalColumn, "JUMLAH KETIDAKHADIRAN", "FFF1F5F9", "FF1E293B", true);
  mergeLabel(1, absenceColumn, presenceColumn, "PERSENTASE", "FFF1F5F9", "FF1E293B", true);
  ws.getRow(1).height = 42;

  const identityHeaders = ["NO", "KELAS", "NIS", "NAMA"];
  identityHeaders.forEach((value, index) => {
    const column = index + 1;
    ws.mergeCells(2, column, 3, column);
    const cell = ws.getCell(2, column);
    cell.value = value;
    style(cell, "FFF8FAFC", "FF000000", true);
  });
  days.forEach((day, index) => {
    const column = dateStartColumn + index;
    const dayCell = ws.getCell(2, column);
    dayCell.value = day.dayName;
    style(dayCell, "FFF8FAFC", "FF000000", true);
    dayCell.font.size = 10;
    const dateCell = ws.getCell(3, column);
    dateCell.value = fullDate(day.dateFull);
    style(dateCell, "FFF8FAFC", "FF000000", true);
    dateCell.font.size = 10;
  });
  ["Sakit", "Izin", "Alpa", "Total"].forEach((value, index) => {
    const column = countStartColumn + index;
    ws.mergeCells(2, column, 3, column);
    const cell = ws.getCell(2, column);
    cell.value = value;
    style(cell, "FFF8FAFC", "FF000000", true);
  });
  [["TIDAK HADIR", absenceColumn, "FFFFE4E6", "FFBE123C"], ["HADIR", presenceColumn, "FFDCFCE7", "FF166534"]].forEach(([label, column, fill, color]) => {
    ws.mergeCells(2, Number(column), 3, Number(column));
    const cell = ws.getCell(2, Number(column));
    cell.value = label;
    style(cell, String(fill), String(color), true);
    cell.font.size = 9;
  });
  ws.getRow(2).height = 21.25;
  ws.getRow(3).height = 21.25;

  config.items.forEach((item, index) => {
    const row = firstDataRow + index;
    const background = index % 2 ? "FFFCFCFC" : "FFFFFFFF";
    const identity = [item.no, item.kelas, item.nis, item.nama];
    identity.forEach((value, column) => {
      const cell = ws.getCell(row, column + 1);
      cell.value = value;
      style(cell, background, column === 2 ? "FF475569" : "FF0F172A", column === 1 || column === 3, column === 3 ? left : center);
      if (column === 2) cell.font.name = "Courier New";
    });
    days.forEach((_, dayIndex) => {
      const status = item.weeklyStatuses?.[dayIndex] || "";
      const column = dateStartColumn + dayIndex;
      const cell = ws.getCell(row, column);
      cell.value = status === "-" ? "" : status;
      const colors = status === "S" ? ["FFFEF08A", "FF854D0E"] : status === "I" ? ["FF67E8F9", "FF155E75"] : status === "A" ? ["FFEF4444", "FFFFFFFF"] : status === "H" ? ["FFDCFCE7", "FF166534"] : [background, "FF000000"];
      style(cell, colors[0], colors[1], Boolean(status));
    });
    const statusRange = dayCount ? `${ws.getColumn(dateStartColumn).letter}${row}:${ws.getColumn(dateEndColumn).letter}${row}` : "";
    ["S", "I", "A"].forEach((status, offset) => {
      const value = dayCount ? { formula: `COUNTIF(${statusRange},"${status}")`, result: absenceCount(item, status) } : absenceCount(item, status);
      const cell = ws.getCell(row, countStartColumn + offset);
      cell.value = value;
      style(cell, background, "FF000000", false);
    });
    const totalCell = ws.getCell(row, totalColumn);
    totalCell.value = dayCount
      ? { formula: `SUM(${ws.getColumn(countStartColumn).letter}${row}:${ws.getColumn(countStartColumn + 2).letter}${row})`, result: absenceCount(item, "S") + absenceCount(item, "I") + absenceCount(item, "A") }
      : item.total;
    style(totalCell, "FFF8FAFC", "FF0F172A", true);
    const absenceCell = ws.getCell(row, absenceColumn);
    const absenceRateValue = recordedCount(item) ? totalAbsenceFor(item) / recordedCount(item) : 0;
    absenceCell.value = dayCount
      ? { formula: `IFERROR(${ws.getColumn(totalColumn).letter}${row}/COUNTIF(${statusRange},"<>"),0)`, result: absenceRateValue }
      : 0;
    absenceCell.numFmt = "0.00%";
    style(absenceCell, background, "FFBE123C");
    const presenceCell = ws.getCell(row, presenceColumn);
    presenceCell.value = dayCount ? { formula: `IFERROR(1-${ws.getColumn(absenceColumn).letter}${row},0)`, result: 1 - absenceRateValue } : 0;
    presenceCell.numFmt = "0.00%";
    style(presenceCell, background, "FF166534");
    ws.getRow(row).height = 26.75;
  });

  const totalLabel = ws.getCell(totalRow, 1);
  totalLabel.value = "TOTAL SISWA TIDAK HADIR";
  if (totalColumn > 1) ws.mergeCells(totalRow, 1, totalRow, 4);
  style(totalLabel, "FFF8FAFC", "FF0F172A", true, left);
  if (dayCount && config.items.length) {
    ws.mergeCells(totalRow, dateStartColumn, totalRow, dateEndColumn);
    ws.getCell(totalRow, dateStartColumn).value = { formula: `SUM(${ws.getColumn(totalColumn).letter}${firstDataRow}:${ws.getColumn(totalColumn).letter}${lastDataRow})`, result: totalAbsenceValue };
  } else {
    ws.getCell(totalRow, countStartColumn).value = totalAbsenceValue;
  }
  style(ws.getCell(totalRow, dateStartColumn), "FFFED7AA", "FF7C2D12", true);
  ws.mergeCells(totalRow, countStartColumn, totalRow, lastColumn);
  ws.getRow(totalRow).height = 26.75;

  const rateLabel = ws.getCell(percentageRow, 1);
  rateLabel.value = "PROSENTASE KETIDAKHADIRAN";
  ws.mergeCells(percentageRow, 1, percentageRow, 4);
  style(rateLabel, "FFF8FAFC", "FF0F172A", true, left);
  if (dayCount && config.items.length) {
    ws.mergeCells(percentageRow, dateStartColumn, percentageRow, dateEndColumn);
    const denominator = config.items.reduce((sum, item) => sum + recordedCount(item), 0);
    ws.getCell(percentageRow, dateStartColumn).value = {
      formula: `IFERROR(${ws.getColumn(totalColumn).letter}${totalRow}/COUNTIF(${ws.getColumn(dateStartColumn).letter}${firstDataRow}:${ws.getColumn(dateEndColumn).letter}${lastDataRow},"<>"),0)`,
      result: denominator ? totalAbsenceValue / denominator : 0,
    };
    ws.getCell(percentageRow, dateStartColumn).numFmt = "0.00%";
  } else {
    ws.getCell(percentageRow, dateStartColumn).value = 0;
  }
  style(ws.getCell(percentageRow, dateStartColumn), "FFFED7AA", "FF7C2D12", true);
  ws.mergeCells(percentageRow, countStartColumn, percentageRow, lastColumn);
  ws.getRow(percentageRow).height = 26.75;
  ws.views = [{ state: "frozen", xSplit: 4, ySplit: 3, topLeftCell: "E4", activeCell: "E4", zoomScale: 75 }];

  const buffer = await wb.xlsx.writeBuffer();
  const safeDate = config.bulanTahun.replace(/[\/\s]/g, "-");
  saveAs(new Blob([buffer]), `Rekap_Presensi_${config.mode}_${config.tingkat}_${safeDate}.xlsx`);
}
