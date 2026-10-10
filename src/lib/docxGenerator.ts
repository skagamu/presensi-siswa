import { getLogPresensi } from "@/lib/api";
import { todayWib } from "@/lib/date";
import JSZip from "jszip";
import { toast } from "sonner";

export interface StudentAlert {
  idPeringatan: string;
  nis: string;
  nama: string;
  kelas: string;
  tingkatKumulatif: number;
  totalHariAbsen: number;
}

export interface AbsenceDetail {
  tanggal: string;
  status: string;
}

export function escapeXml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]!));
}

async function fetchStudentAbsenceLogs(nis: string): Promise<AbsenceDetail[]> {
  const res = await getLogPresensi({ nis });
  if (res.status !== "success" || !res.data) throw new Error(res.message || "Gagal mengambil histori absen.");
  return res.data.filter(log => log.nis === nis && ["SAKIT", "IZIN", "ALPHA"].includes(log.status_presensi))
    .map(log => ({ tanggal: log.tanggal, status: log.status_presensi }));
}

export async function generateSuratTugasDocx(alert: StudentAlert) {
  const toastId = toast.loading(`Menyiapkan Surat Tugas .docx untuk ${alert.nama}...`);

  try {
    // 1. Ambil histori absen siswa
    const absenceLogs = await fetchStudentAbsenceLogs(alert.nis);

    // 2. Format tanggal & nomor surat
    const now = new Date(`${todayWib()}T12:00:00+07:00`);
    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const currentMonthRoman = romanMonths[Number(todayWib().slice(5, 7)) - 1];
    const currentYear = Number(todayWib().slice(0, 4));

    const formattedDate = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta"
    }).format(now);

    const nomorSurat = `421.5/${alert.nis.slice(-3) || "001"}/SMK-GM1/BK/${currentMonthRoman}/${currentYear}`;

    // 3. Ambil binary logo skagamu
    let logoBase64 = "";
    try {
      const imgRes = await fetch("/presensi-siswa/logo-skagamu.png");
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        logoBase64 = window.btoa(binary);
      }
    } catch (e) {
      console.warn("Logo tidak dapat di-embed", e);
    }

    // 4. Generate baris tabel rincian absen
    let absenceRowsXml = "";
    if (absenceLogs.length > 0) {
      absenceLogs.forEach((item, index) => {
        absenceRowsXml += `
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:t>${index + 1}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="4200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(item.tanggal)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(item.status)}</w:t></w:r></w:p></w:tc>
        </w:tr>`;
      });
    } else {
      absenceRowsXml = `
      <w:tr>
        <w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="8800" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i/><w:sz w:val="20"/></w:rPr><w:t>Total ketidakhadiran tercatat: ${escapeXml(alert.totalHariAbsen)} hari.</w:t></w:r></w:p></w:tc>
      </w:tr>`;
    }

    // 5. OpenXML Document definition
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <!-- KOP SURAT TABLE -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9200" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="double" w:sz="18" w:space="8" w:color="000000"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="1600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            ${logoBase64 ? `
            <w:r>
              <w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                  <wp:extent cx="685800" cy="685800"/>
                  <wp:docPr id="1" name="Logo Skagamu"/>
                  <a:graphic>
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic>
                        <pic:nvPicPr><pic:cNvPr id="0" name="Logo"/><pic:cNvPicPr/></pic:nvPicPr>
                        <pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
                        <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="685800" cy="685800"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>` : ''}
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="7600" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>YAYASAN PENDIDIKAN GAJAH MUNGKUR II WONOGIRI</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="40" w:line="260" w:lineRule="auto"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="30"/><w:color w:val="003399"/></w:rPr><w:t>SMK GAJAH MUNGKUR 1 WURYANTORO</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:after="100" w:line="220" w:lineRule="auto"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t>Jl. Tangkil Tromol Pos 04 Wuryantoro, Wonogiri Kode Pos 57661</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <!-- JUDUL SURAT TUGAS -->
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="40"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:u w:val="single"/><w:sz w:val="26"/></w:rPr><w:t>SURAT TUGAS KUNJUNGAN RUMAH (HOME VISIT)</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="220"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Nomor: ${escapeXml(nomorSurat)}</w:t></w:r>
    </w:p>

    <!-- PENGANTAR -->
    <w:p>
      <w:pPr><w:spacing w:after="140"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Yang bertanda tangan di bawah ini Kepala SMK Gajah Mungkur 1 Wuryantoro, memberikan tugas kepada:</w:t></w:r>
    </w:p>

    <!-- TABEL PETUGAS BK -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="8800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Nama Petugas BK</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Cahyo Adi Setyo, S.Pd.</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Jabatan</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Guru Bimbingan dan Konseling (BK)</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Waktu Pelaksanaan</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(formattedDate)} s.d. Selesai</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <!-- IDENTITAS SISWA PENGANTAR -->
    <w:p>
      <w:pPr><w:spacing w:before="160" w:after="120"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Untuk melaksanakan kunjungan rumah (Home Visit) dan koordinasi penanganan terhadap siswa:</w:t></w:r>
    </w:p>

    <!-- TABEL IDENTITAS SISWA -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="8800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Nama Siswa</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(alert.nama)}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>NIS</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(alert.nis)}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Kelas</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(alert.kelas)}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Total Ketidakhadiran</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(alert.totalHariAbsen)} Hari</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <!-- RINCIAN TANGGAL & STATUS KETIDAKHADIRAN -->
    <w:p>
      <w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Rincian Tanggal dan Status Ketidakhadiran:</w:t></w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="8800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>No</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4200" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>Tanggal Ketidakhadiran</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="3800" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="20"/></w:rPr><w:t>Status (S/I/A)</w:t></w:r></w:p></w:tc>
      </w:tr>
      ${absenceRowsXml}
    </w:tbl>

    <!-- PENUTUP -->
    <w:p>
      <w:pPr><w:spacing w:before="200" w:after="200"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab.</w:t></w:r>
    </w:p>

    <!-- TANDA TANGAN -->
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="8800" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="4400" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Petugas / Guru BK,</w:t></w:r></w:p>
          <w:p><w:pPr><w:spacing w:after="800"/></w:pPr></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:u w:val="single"/><w:sz w:val="22"/></w:rPr><w:t>Cahyo Adi Setyo, S.Pd.</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:t>Guru Bimbingan Konseling</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4400" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Wuryantoro, ${escapeXml(formattedDate)}</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Kepala Sekolah,</w:t></w:r></w:p>
          <w:p><w:pPr><w:spacing w:after="800"/></w:pPr></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:u w:val="single"/><w:sz w:val="22"/></w:rPr><w:t>Drs. Guruh Sarang Murtiyoso, S.Pd., M.M.</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:t>Kepala SMK Gajah Mungkur 1</w:t></w:r></w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    // 6. Relationships (word/_rels/document.xml.rels)
    const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyle" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${logoBase64 ? '<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>' : ''}
</Relationships>`;

    // 7. Package-level Rels (_rels/.rels)
    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    // 8. Content Types ([Content_Types].xml)
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

    // 9. Styles (word/styles.xml)
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="22"/>
        <w:lang w:val="id-ID"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

    // 10. Assemble strict .docx ZIP container
    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.file("_rels/.rels", rootRelsXml);
    zip.file("word/document.xml", documentXml);
    zip.file("word/_rels/document.xml.rels", documentRelsXml);
    zip.file("word/styles.xml", stylesXml);

    if (logoBase64) {
      zip.file("word/media/image1.png", logoBase64, { base64: true });
    }

    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    });

    const fileName = `Surat_Tugas_Home_Visit_${alert.nama.replace(/[^a-zA-Z0-9]/g, "_")}_${alert.kelas.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;

    // 11. Trigger Download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success(`Surat Tugas (.docx) untuk ${alert.nama} berhasil diunduh!`, { id: toastId });
  } catch (error: unknown) {
    console.error("Error generating .docx", error);
    toast.error(`Gagal membuat surat tugas: ${error instanceof Error ? error.message : String(error)}`, { id: toastId });
  }
}
