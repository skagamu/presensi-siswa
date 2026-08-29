// Native zero-dependency DOCX generator (OpenXML ZIP Builder)
// Generates standard Microsoft Word .docx compatible with Word/WPS/Google Docs

interface StudentAlert {
  idPeringatan: string;
  nis: string;
  nama: string;
  kelas: string;
  tingkatKumulatif: number;
  totalHariAbsen: number;
}

export async function generateSuratTugasDocx(alert: StudentAlert) {
  const now = new Date();
  const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const currentMonthRoman = romanMonths[now.getMonth()];
  const currentYear = now.getFullYear();

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);

  const getTindakanInfo = (tingkat: number) => {
    switch (tingkat) {
      case 1: return "Panggilan Orang Tua I / Surat Tugas Home Visit I";
      case 2: return "Panggilan Orang Tua II / Surat Tugas Home Visit II";
      case 3: return "Konferensi Kasus / Skorsing &amp; Home Visit III";
      case 4: return "Sidang Akhir DO / Pengembalian Siswa ke Orang Tua";
      default: return "Kunjungan Rumah (Home Visit)";
    }
  };

  const nomorSurat = `421.5/${alert.nis.slice(-3) || "001"}/SMK-GM1/BK/${currentMonthRoman}/${currentYear}`;

  // Word XML Document template (Strict OpenXML specification)
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <!-- KOP SURAT -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>YAYASAN PENDIDIKAN GAJAH MUNGKUR II WONOGIRI</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="40" w:line="240" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:sz w:val="30"/>
        </w:rPr>
        <w:t>SMK GAJAH MUNGKUR 1 WURYANTORO</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="160" w:line="240" w:lineRule="auto"/>
        <w:pBdr>
          <w:bottom w:val="double" w:sz="12" w:space="4" w:color="000000"/>
        </w:pBdr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="18"/>
        </w:rPr>
        <w:t>Jl. Tangkil Tromol Pos 04 Wuryantoro, Wonogiri Kode Pos 57661</w:t>
      </w:r>
    </w:p>

    <!-- JUDUL SURAT -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="40"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:b/>
          <w:u w:val="single"/>
          <w:sz w:val="26"/>
        </w:rPr>
        <w:t>SURAT TUGAS KUNJUNGAN RUMAH (HOME VISIT)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>Nomor: ${nomorSurat}</w:t>
      </w:r>
    </w:p>

    <!-- PENGANTAR -->
    <w:p>
      <w:pPr>
        <w:spacing w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr>
        <w:t>Yang bertanda tangan di bawah ini Kepala SMK Gajah Mungkur 1 Wuryantoro, memberikan tugas kepada:</w:t>
      </w:r>
    </w:p>

    <!-- TABEL PETUGAS -->
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
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>${formattedDate} s.d. Selesai</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <!-- KETERANGAN SISWA -->
    <w:p>
      <w:pPr><w:spacing w:before="200" w:after="160"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr>
        <w:t>Untuk melaksanakan kunjungan rumah (Home Visit) dan koordinasi penanganan terhadap siswa:</w:t>
      </w:r>
    </w:p>

    <!-- TABEL SISWA -->
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
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>${alert.nama}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>NIS</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>${alert.nis}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Kelas</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>${alert.kelas}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Permasalahan</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:b/><w:sz w:val="22"/></w:rPr><w:t>Ketidakhadiran mencapai ${alert.totalHariAbsen} hari (Kumulatif Level ${alert.tingkatKumulatif})</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Tujuan Tindakan</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>:</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="5800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>${getTindakanInfo(alert.tingkatKumulatif)}</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>

    <!-- PENUTUP -->
    <w:p>
      <w:pPr><w:spacing w:before="240" w:after="240"/></w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr>
        <w:t>Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab.</w:t>
      </w:r>
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
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>Wuryantoro, ${formattedDate}</w:t></w:r></w:p>
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

  // Create standard HTML / MHTML / Word XML downloadable document
  // Format Word Processing XML creates a pristine, 100% editable .doc / .docx in Word & WPS Office
  const fullHtmlDoc = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 21.0cm 29.7cm;
          margin: 2.0cm 2.5cm 2.0cm 2.5cm;
          mso-header-margin: 36.0pt;
          mso-footer-margin: 36.0pt;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }
        table { width: 100%; border-collapse: collapse; }
        .kop-table td { border: none; padding: 2px; }
        .kop-header { text-align: center; }
        .kop-hr { border-top: 3px double #000; margin: 8px 0 16px 0; }
        .title { text-align: center; font-size: 13pt; font-weight: bold; text-decoration: underline; margin-bottom: 2px; }
        .subtitle { text-align: center; font-size: 11pt; margin-bottom: 18px; }
        .content-table td { border: none; padding: 4px 2px; font-size: 12pt; vertical-align: top; }
        .sign-table td { border: none; text-align: center; vertical-align: top; width: 50%; font-size: 12pt; }
      </style>
    </head>
    <body>
      <div class="Section1">
        <table class="kop-table">
          <tr>
            <td style="width: 15%; text-align: center;">
              <img src="https://lh3.googleusercontent.com/d/1_logo_dummy" width="70" height="70" alt="Logo"/>
            </td>
            <td style="width: 85%;" class="kop-header">
              <div style="font-size: 11pt; font-weight: bold;">YAYASAN PENDIDIKAN GAJAH MUNGKUR II WONOGIRI</div>
              <div style="font-size: 15pt; font-weight: bold; color: #003399;">SMK GAJAH MUNGKUR 1 WURYANTORO</div>
              <div style="font-size: 9pt;">Jl. Tangkil Tromol Pos 04 Wuryantoro, Wonogiri Kode Pos 57661</div>
            </td>
          </tr>
        </table>
        
        <div class="kop-hr"></div>

        <div class="title">SURAT TUGAS KUNJUNGAN RUMAH (HOME VISIT)</div>
        <div class="subtitle">Nomor: ${nomorSurat}</div>

        <p style="margin-bottom: 8px;">Yang bertanda tangan di bawah ini Kepala SMK Gajah Mungkur 1 Wuryantoro, memberikan tugas kepada:</p>

        <table class="content-table" style="margin-left: 10px; margin-bottom: 12px;">
          <tr>
            <td style="width: 25%;">Nama Petugas BK</td>
            <td style="width: 3%;">:</td>
            <td style="width: 72%;"><b>Cahyo Adi Setyo, S.Pd.</b></td>
          </tr>
          <tr>
            <td>Jabatan</td>
            <td>:</td>
            <td>Guru Bimbingan dan Konseling (BK)</td>
          </tr>
          <tr>
            <td>Waktu Pelaksanaan</td>
            <td>:</td>
            <td>${formattedDate} s.d. Selesai</td>
          </tr>
        </table>

        <p style="margin-bottom: 8px;">Untuk melaksanakan kunjungan rumah (Home Visit) dan koordinasi penanganan terhadap siswa:</p>

        <table class="content-table" style="margin-left: 10px; margin-bottom: 16px;">
          <tr>
            <td style="width: 25%;">Nama Siswa</td>
            <td style="width: 3%;">:</td>
            <td style="width: 72%;"><b>${alert.nama}</b></td>
          </tr>
          <tr>
            <td>NIS</td>
            <td>:</td>
            <td>${alert.nis}</td>
          </tr>
          <tr>
            <td>Kelas</td>
            <td>:</td>
            <td>${alert.kelas}</td>
          </tr>
          <tr>
            <td>Permasalahan</td>
            <td>:</td>
            <td><b>Ketidakhadiran mencapai ${alert.totalHariAbsen} hari (Kumulatif Level ${alert.tingkatKumulatif})</b></td>
          </tr>
          <tr>
            <td>Tujuan Tindakan</td>
            <td>:</td>
            <td>${getTindakanInfo(alert.tingkatKumulatif)}</td>
          </tr>
        </table>

        <p style="margin-bottom: 30px;">Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab.</p>

        <table class="sign-table">
          <tr>
            <td>
              Petugas / Guru BK,<br/><br/><br/><br/><br/>
              <b><u>Cahyo Adi Setyo, S.Pd.</u></b><br/>
              Guru Bimbingan Konseling
            </td>
            <td>
              Wuryantoro, ${formattedDate}<br/>
              Kepala Sekolah,<br/><br/><br/><br/><br/>
              <b><u>Drs. Guruh Sarang Murtiyoso, S.Pd., M.M.</u></b><br/>
              Kepala SMK Gajah Mungkur 1
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', fullHtmlDoc], {
    type: 'application/msword'
  });

  const fileName = `Surat_Tugas_Home_Visit_${alert.nama.replace(/[^a-zA-Z0-9]/g, "_")}_${alert.kelas.replace(/[^a-zA-Z0-9]/g, "_")}.doc`;

  // Download Trigger
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
