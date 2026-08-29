/**
 * BACKEND GOOGLE APPS SCRIPT - PRESENSI SISWA BK (v7.1 - Auth Case Insensitive)
 * -----------------------------------------------------
 */

const CONFIG = {
  SHEETS: { LOG_PRESENSI: "LogPresensi", PERINGATAN_KASUS: "PeringatanKasus", PENYELESAIAN_KASUS: "PenyelesaianKasus", SISWA_X: "Siswa_X", SISWA_XI: "Siswa_XI", SISWA_XII: "Siswa_XII", BANK_KASUS: "BankKasus", USERS: "Users" },
  THRESHOLDS: { ALERT_MULTIPLIER: 3, MAX_LEVEL: 4 }
};

function doPost(e) { try { return Router.handlePostRequest(JSON.parse(e.postData.contents)); } catch (err) { return ResponseHelper.error("Server Error POST: " + err.message); } }
function doGet(e) { try { return Router.handleGetRequest(e.parameter.action, e.parameter); } catch (err) { return ResponseHelper.error("Server Error GET: " + err.message); } }

const Router = {
  handlePostRequest: function (body) {
    switch (body.action) {
      case "login": return AuthController.login(body);
      case "saveAttendance": return AttendanceController.save(body);
      case "resolveCase": return CaseController.resolve(body);
      case "saveBankKasus": return BankKasusController.saveBatch(body);
      case "injectMassiveDummy": return MassiveInjector.run();
      default: return ResponseHelper.error("Action POST tidak dikenali.");
    }
  },
  handleGetRequest: function (action, queryParams) {
    switch (action) {
      case "getStudents": return StudentController.getListGet(queryParams);
      case "getPriorityAlerts": return CaseController.getAlerts();
      case "getRekapBulanan": return AttendanceController.getRekapMatrix(queryParams);
      case "getDashboardStats": return DashboardController.getStats(queryParams);
      case "setupDatabase": return DatabaseSetup.init();
      case "injectMassiveDummy": return MassiveInjector.run();
      default: return ResponseHelper.error("Action GET tidak dikenali.");
    }
  }
};

const DatabaseSetup = {
  init: function() {
    const ss = SpreadsheetApp.openById("1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY");
    const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG_PRESENSI);
    if (logSheet) {
      logSheet.getRange(1, 1, 1, 9).setValues([["id_presensi", "tanggal", "nis", "nama", "kelas", "status_presensi", "ada_surat_dokter", "link_bukti_izin", "waktu_simpan"]]);
      logSheet.getRange("H:H").setNumberFormat("@");
      const data = logSheet.getDataRange().getValues();
      for (let r = 1; r < data.length; r++) {
        const val = data[r][7];
        // If it was an old date/timestamp in col 8 instead of link, move to col 9
        if (val instanceof Date || (typeof val === "string" && val.includes(":") && !val.startsWith("http"))) {
          logSheet.getRange(r + 1, 8).setValue("");
          logSheet.getRange(r + 1, 9).setValue(val);
        }
      }
    }
    let sheetKasus = ss.getSheetByName(CONFIG.SHEETS.BANK_KASUS);
    if (!sheetKasus) {
      sheetKasus = ss.insertSheet(CONFIG.SHEETS.BANK_KASUS);
      sheetKasus.appendRow(["id_kasus", "tanggal", "nis", "nama", "kelas", "jenis_pelanggaran", "waktu_simpan"]);
    }
    let sheetUsers = ss.getSheetByName(CONFIG.SHEETS.USERS);
    if (!sheetUsers) {
      sheetUsers = ss.insertSheet(CONFIG.SHEETS.USERS);
      sheetUsers.appendRow(["user_id", "username", "password", "nama_lengkap", "role"]);
      sheetUsers.appendRow([`USR-1`, "admin", "123456", "Guru BK Utama", "ADMIN"]);
    }
    return ResponseHelper.success(null, "Database setup selesai!");
  }
};

const AuthController = {
  login: function(body) {
    try {
      const { username, password } = body;
      if (!username || !password) return ResponseHelper.error("Username dan Password tidak boleh kosong.");
      
      const data = SpreadsheetRepository.getSheet(CONFIG.SHEETS.USERS).getDataRange().getValues();
      
      // CASE INSENSITIVE: Ubah semua inputan user menjadi huruf kecil (lowercase)
      const inputUsername = String(username).trim().toLowerCase();

      for (let i = 1; i < data.length; i++) {
        // [1] = username di database. Ubah juga jadi huruf kecil saat mencocokkan.
        const dbUsername = String(data[i][1]).trim().toLowerCase();

        if (dbUsername === inputUsername) {
          // Jika username ketemu, cocokkan password (Password TETAP Case Sensitive demi keamanan)
          if(String(data[i][2]).trim() === String(password).trim()) {
            return ResponseHelper.success({ token: `TKN-${Date.now()}`, user: { id: data[i][0], username: data[i][1], nama: data[i][3], role: data[i][4] } });
          } else {
            return ResponseHelper.error("Password salah.");
          }
        }
      }
      return ResponseHelper.error("Username tidak ditemukan.");
    } catch(err) { return ResponseHelper.error(err.message); }
  }
};

const MassiveInjector = {
  run: function() {
    try {
      const x = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_X);
      const xi = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XI);
      const xii = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XII);
      
      if(x.length < 5 || xi.length < 5 || xii.length < 5) return ResponseHelper.error("Data siswa kurang. Isi dulu Sheet Siswa.");

      const timestamp = TimeHelper.getCurrentTimestamp();
      const randArr = (arr) => arr[Math.floor(Math.random() * arr.length)];
      
      const korbanAlert = [x[0], xi[1], xii[2], x[3], xi[4], xii[5], x[6], xii[7]];
      const korbanKasus = [xi[0], xii[1], x[2], xi[3], xii[4]];
      const korbanSelesai = [x[8], xi[8], xii[8]];

      let alertRecords = []; let kasusRecords = []; let selesaiRecords = [];

      korbanAlert.forEach((s, idx) => {
         const level = (idx % 4) + 1; const totalAbsen = level * 3;
         alertRecords.push([ `ALT-MASSIVE-${Date.now()}-${s.nis}`, s.nis, s.nama, s.kelas, level, totalAbsen, "AKTIF", timestamp ]);
      });

      const jenisKasus = ["Merokok di Kantin", "Atribut Tidak Lengkap", "Terlambat Masuk Jam Pertama", "Melompat Pagar Sekolah", "Membawa Ponsel saat Ujian"];
      korbanKasus.forEach((s, idx) => {
         kasusRecords.push([ `BK-MASSIVE-${Date.now()}-${s.nis}`, TimeHelper.getCurrentDate(), s.nis, s.nama, s.kelas, randArr(jenisKasus), timestamp ]);
      });

      const cat = ["Diberikan SP 1 dan peringatan lisan", "Home visit dilakukan, orang tua menyanggupi pengawasan", "Siswa setuju membuat surat pernyataan bermaterai"];
      korbanSelesai.forEach((s, idx) => {
         selesaiRecords.push([ `RES-MASSIVE-${Date.now()}-${s.nis}`, `ALT-OLD-${s.nis}`, s.nis, s.nama, s.kelas, "https://drive.google.com/file/d/dummy_pdf/view", randArr(cat), "Bapak Budi (BK)", timestamp ]);
      });

      if(alertRecords.length > 0) SpreadsheetRepository.insertBatch(CONFIG.SHEETS.PERINGATAN_KASUS, alertRecords);
      if(kasusRecords.length > 0) SpreadsheetRepository.insertBatch(CONFIG.SHEETS.BANK_KASUS, kasusRecords);
      if(selesaiRecords.length > 0) SpreadsheetRepository.insertBatch(CONFIG.SHEETS.PENYELESAIAN_KASUS, selesaiRecords);

      return ResponseHelper.success(null, "Massive Injection Berhasil! Silakan cek Dashboard.");
    } catch(err) { return ResponseHelper.error(err.message); }
  }
};

const DashboardController = {
  getStats: function(queryParams) {
    try {
      const targetDate = queryParams.date || TimeHelper.getCurrentDate();
      const studentsX = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_X);
      const studentsXI = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XI);
      const studentsXII = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XII);
      const totalMurid = studentsX.length + studentsXI.length + studentsXII.length;
      
      const logs = SpreadsheetRepository.getAllLogs();
      let absenHariIni = 0; let breakdown = { SAKIT: 0, IZIN: 0, ALPHA: 0 };
      let weeklyData = {}; let monthlyData = {};

      const todayObj = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayObj); d.setDate(d.getDate() - i);
        weeklyData[Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd")] = 0;
      }
      for (let i = 5; i >= 0; i--) {
        const d = new Date(todayObj); d.setMonth(d.getMonth() - i);
        monthlyData[Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM")] = 0;
      }

      for (let i = 1; i < logs.length; i++) {
        let rowDateStr = "";
        if(logs[i][1] instanceof Date) rowDateStr = Utilities.formatDate(logs[i][1], "Asia/Jakarta", "yyyy-MM-dd");
        else rowDateStr = String(logs[i][1]).substring(0,10);

        const stat = String(logs[i][5]).toUpperCase().trim();
        const isAbsen = ["SAKIT", "IZIN", "ALPHA"].includes(stat);

        if (rowDateStr === targetDate && isAbsen) {
          if (stat === "SAKIT") breakdown.SAKIT++; else if (stat === "IZIN") breakdown.IZIN++; else if (stat === "ALPHA") breakdown.ALPHA++;
          absenHariIni++;
        }
        if (isAbsen && weeklyData[rowDateStr] !== undefined) weeklyData[rowDateStr]++;
        const rowMonthStr = rowDateStr.substring(0, 7);
        if (isAbsen && monthlyData[rowMonthStr] !== undefined) monthlyData[rowMonthStr]++;
      }

      const hadirHariIni = totalMurid - absenHariIni;
      let persentase = 100; if (totalMurid > 0) persentase = Math.round((hadirHariIni / totalMurid) * 100);

      const chartWeekly = Object.keys(weeklyData).map(date => {
         const parts = date.split('-'); return { label: `${parts[2]}/${parts[1]}`, hadir: totalMurid - weeklyData[date], absen: weeklyData[date] };
      });
      const chartMonthly = Object.keys(monthlyData).map(month => {
         const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
         const parts = month.split('-'); const avgAbsen = Math.round(monthlyData[month] / 22); 
         return { label: `${monthNames[parseInt(parts[1])-1]} ${parts[0]}`, hadir: totalMurid - avgAbsen, absen: avgAbsen };
      });

      return ResponseHelper.success({ tanggal: targetDate, totalMurid, hadirHariIni, absenHariIni, persentaseKehadiran: persentase, breakdown, chart: { weekly: chartWeekly, monthly: chartMonthly } });
    } catch (error) { return ResponseHelper.error(error.message); }
  }
};

const BankKasusController = {
  saveBatch: function(body) {
    try {
      const { date, pelanggaran, students } = body;
      const validDate = date || TimeHelper.getCurrentDate();
      const timestamp = TimeHelper.getCurrentTimestamp();
      if (!pelanggaran || !students || students.length === 0) return ResponseHelper.error("Data kosong.");

      const recordsToInsert = students.map(s => [ `BK-${new Date().getTime()}-${s.nis}`, validDate, s.nis, s.nama, s.kelas, pelanggaran, timestamp ]);
      SpreadsheetRepository.insertBatch(CONFIG.SHEETS.BANK_KASUS, recordsToInsert);
      return ResponseHelper.success(null, `${students.length} data berhasil disimpan.`);
    } catch (error) { return ResponseHelper.error(error.message); }
  }
};

const StudentController = {
  getListGet: function (queryParams) {
    try {
      if (queryParams.tingkat === "SEMUA") {
        const x = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_X);
        const xi = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XI);
        const xii = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XII);
        return ResponseHelper.success([...x, ...xi, ...xii]);
      } else {
        const sheetName = CONFIG.SHEETS[`SISWA_${queryParams.tingkat || "X"}`];
        return ResponseHelper.success(SpreadsheetRepository.getStudentsBySheet(sheetName));
      }
    } catch (error) { return ResponseHelper.error(error.message); }
  }
};

const AttendanceController = {
  save: function (body) {
    try {
      const validDate = body.date || TimeHelper.getCurrentDate();
      const timestamp = TimeHelper.getCurrentTimestamp();
      const absentStudents = (body.attendances || []).filter(s => s.status_presensi !== "HADIR");
      let uploadedLinks = [];
      if (absentStudents.length > 0) {
        uploadedLinks = SpreadsheetRepository.upsertLogAbsence(validDate, absentStudents, timestamp);
        AlertService.processAbsences(absentStudents, timestamp);
      }
      return ResponseHelper.success({ uploadedLinks }, "Presensi berhasil disimpan.");
    } catch (error) { return ResponseHelper.error(error.message); }
  },

  getRekapMatrix: function(queryParams) {
    try {
      const month = queryParams.month || TimeHelper.getCurrentDate().substring(0, 7); 
      const tingkat = queryParams.tingkat || "SEMUA"; 
      const kelas = queryParams.kelas; 
      
      let students = [];
      if (tingkat === "SEMUA") {
         const x = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_X);
         const xi = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XI);
         const xii = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XII);
         students = [...x, ...xi, ...xii];
      } else {
         students = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS[`SISWA_${tingkat}`]);
      }
      
      const logs = SpreadsheetRepository.getAllLogs();
      let rekapResult = [];

      students.forEach(siswa => {
        if(kelas && siswa.kelas !== kelas && kelas !== "SEMUA") return;
        
        let logsHarian = {}; 
        let sakit = 0, izin = 0, alpha = 0;
        
        const cleanSiswaNis = String(siswa.nis).replace(/[^0-9]/g, '');

        for(let i=1; i < logs.length; i++) {
          const logDateRaw = logs[i][1];
          let logDateStr = "";
          
          if(logDateRaw instanceof Date) {
            const yyyy = logDateRaw.getFullYear();
            const mm = String(logDateRaw.getMonth() + 1).padStart(2, '0');
            const dd = String(logDateRaw.getDate()).padStart(2, '0');
            logDateStr = `${yyyy}-${mm}-${dd}`;
          } else {
            logDateStr = String(logDateRaw).trim();
            if(logDateStr.includes("/")) {
                let parts = logDateStr.split("/");
                if(parts.length === 3 && parts[2].length === 4) logDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            if(logDateStr.includes("T")) logDateStr = logDateStr.split("T")[0];
            logDateStr = logDateStr.substring(0, 10);
          }
          
          const cleanLogNis = String(logs[i][2]).replace(/[^0-9]/g, '');

          if(cleanLogNis === cleanSiswaNis && logDateStr.startsWith(month)) {
            const stat = String(logs[i][5]).toUpperCase().trim();
            const dateSaja = parseInt(logDateStr.split("-")[2], 10); 
            
            logsHarian[dateSaja] = stat;
            if(stat === "SAKIT") sakit++; else if(stat === "IZIN") izin++; else if(stat === "ALPHA") alpha++;
          }
        }
        
        rekapResult.push({
          nis: cleanSiswaNis, 
          nama: siswa.nama,
          kelas: siswa.kelas,
          sakit, izin, alpha,
          totalTidakHadir: sakit + izin + alpha,
          dailyLogs: logsHarian
        });
      });
      return ResponseHelper.success(rekapResult);
    } catch(error) { return ResponseHelper.error(error.message); }
  }
};

const CaseController = {
  getAlerts: function () {
    try { return ResponseHelper.success(SpreadsheetRepository.getActiveAlerts()); } 
    catch (error) { return ResponseHelper.error(error.message); }
  },
  resolve: function (body) {
    try {
      const { id_peringatan, nis, nama, kelas, catatan_konseling, ditangani_oleh, pdfBase64, fileBase64, fileName } = body;
      const timestamp = TimeHelper.getCurrentTimestamp();
      const rawBase64 = fileBase64 || pdfBase64;
      const linkDokumen = FileService.uploadFile(rawBase64, fileName, "BK_Penyelesaian_Kasus");
      SpreadsheetRepository.insertRow(CONFIG.SHEETS.PENYELESAIAN_KASUS, [
        `RES-${new Date().getTime()}`, id_peringatan, nis || "-", nama || "-", 
        kelas || "-", linkDokumen, catatan_konseling || "", ditangani_oleh || "Guru BK", timestamp
      ]);
      SpreadsheetRepository.updateAlertStatus(id_peringatan, "SELESAI");
      return ResponseHelper.success({ linkDokumen }, "Kasus diselesaikan.");
    } catch (error) { return ResponseHelper.error(error.message); }
  }
};

const AlertService = {
  processAbsences: function (absentStudents, timestamp) {
    const allLogs = SpreadsheetRepository.getAllLogs();
    absentStudents.forEach(siswa => {
      let count = 0;
      const cleanSiswaNis = String(siswa.nis).replace(/[^0-9]/g, '');
      for (let i = 1; i < allLogs.length; i++) {
        const cleanLogNis = String(allLogs[i][2]).replace(/[^0-9]/g, '');
        if (cleanLogNis === cleanSiswaNis && allLogs[i][5] !== "HADIR") count++;
      }
      count = count + 1; 
      if (count > 0 && count % CONFIG.THRESHOLDS.ALERT_MULTIPLIER === 0) {
        let level = Math.floor(count / CONFIG.THRESHOLDS.ALERT_MULTIPLIER);
        if (level > CONFIG.THRESHOLDS.MAX_LEVEL) level = CONFIG.THRESHOLDS.MAX_LEVEL;
        SpreadsheetRepository.insertRow(CONFIG.SHEETS.PERINGATAN_KASUS, [
          `ALERT-${new Date().getTime()}-${siswa.nis}`, siswa.nis, siswa.nama, siswa.kelas, level, count, "AKTIF", timestamp
        ]);
      }
    });
  }
};

const FileService = {
  getMimeType: function (fileName) {
    const ext = (fileName || "").split(".").pop().toLowerCase();
    const map = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png"
    };
    return map[ext] || "application/octet-stream";
  },
  getOrCreateFolder: function (folderName) {
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) return folders.next();
    return DriveApp.createFolder(folderName);
  },
  uploadFile: function (base64String, fileName, folderName = "BK_Dokumen_Presensi") {
    if (!base64String || !fileName || base64String === "dummy") return "-";
    try {
      const cleanBase64 = base64String.replace(/^data:.*?;base64,/, "");
      const mimeType = this.getMimeType(fileName);
      const blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), mimeType, fileName);
      const targetFolder = this.getOrCreateFolder(folderName);
      const file = targetFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getUrl();
    } catch (error) {
      return "Gagal upload: " + error.message;
    }
  },
  uploadPdf: function (base64String, fileName) {
    return this.uploadFile(base64String, fileName, "BK_Dokumen_Resolusi");
  }
};

const SpreadsheetRepository = {
  getSheet: function (sheetName) {
    let ss = SpreadsheetApp.openById("1i3Nxqmsy7T6D4N17MdRgT3x7l0L_Lr3TcbthPbnPwWY");
    if (!ss) throw new Error(`Spreadsheet tidak aktif.`);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet && sheetName === CONFIG.SHEETS.BANK_KASUS) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["id_kasus", "tanggal", "nis", "nama", "kelas", "jenis_pelanggaran", "waktu_simpan"]);
    }
    if (!sheet) throw new Error(`Tab Sheet '${sheetName}' tidak ditemukan.`);
    return sheet;
  },

  getStudentsBySheet: function (sheetName) {
    try {
      const data = this.getSheet(sheetName).getDataRange().getValues();
      const students = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][2] && data[i][3]) students.push({ kelas: data[i][1].toString().trim(), nis: data[i][2].toString().trim(), nama: data[i][3].toString().trim() });
      }
      return students;
    } catch(e) { return []; }
  },
  insertRow: function (sheetName, rowData) { this.getSheet(sheetName).appendRow(rowData); },
  insertBatch: function (sheetName, multiRowData) {
    if (multiRowData.length === 0) return;
    const sheet = this.getSheet(sheetName);
    sheet.getRange(sheet.getLastRow() + 1, 1, multiRowData.length, multiRowData[0].length).setValues(multiRowData);
  },
  upsertLogAbsence: function(dateStr, absentStudents, timestamp) {
    const sheet = this.getSheet(CONFIG.SHEETS.LOG_PRESENSI);
    const data = sheet.getDataRange().getValues();
    let recordsToInsert = [];
    
    // Ensure 9-column standard header: id_presensi | tanggal | nis | nama | kelas | status_presensi | ada_surat_dokter | link_bukti_izin | waktu_simpan
    if (data.length > 0) {
      const headers = ["id_presensi", "tanggal", "nis", "nama", "kelas", "status_presensi", "ada_surat_dokter", "link_bukti_izin", "waktu_simpan"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    absentStudents.forEach(student => {
      let isFound = false;
      const cleanStudentNis = String(student.nis).replace(/[^0-9]/g, '');

      let linkBukti = "";
      if (student.fileBase64 && student.fileName) {
        linkBukti = FileService.uploadFile(student.fileBase64, student.fileName, "BK_Bukti_Izin");
      }
      const adaDokter = Boolean(student.ada_surat_dokter || (linkBukti && linkBukti.indexOf("http") !== -1));

      for(let i = data.length - 1; i >= 1; i--) {
        let rowDateStr = "";
        if(data[i][1] instanceof Date) {
            const dt = data[i][1];
            rowDateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
        } else {
          rowDateStr = String(data[i][1]);
          if(rowDateStr.includes("T")) rowDateStr = rowDateStr.split("T")[0];
        }
        
        const cleanLogNis = String(data[i][2]).replace(/[^0-9]/g, '');

        if(rowDateStr.substring(0,10) === dateStr && cleanLogNis === cleanStudentNis) {
          sheet.getRange(i + 1, 6).setValue(student.status_presensi);
          sheet.getRange(i + 1, 7).setValue(adaDokter);
          sheet.getRange(i + 1, 8).setValue(linkBukti || "");
          sheet.getRange(i + 1, 9).setValue(timestamp);
          isFound = true;
          break;
        }
      }
      if(!isFound) {
        recordsToInsert.push([`ATT-${new Date().getTime()}-${student.nis}`, dateStr, student.nis, student.nama, student.kelas, student.status_presensi, adaDokter, linkBukti ? String(linkBukti) : "", timestamp]);
      }
    });

    if(recordsToInsert.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, recordsToInsert.length, recordsToInsert[0].length).setValues(recordsToInsert);
    return absentStudents.map(s => {
      let debugLink = "";
      if (s.fileBase64 && s.fileName) {
        debugLink = FileService.uploadFile(s.fileBase64, s.fileName, "BK_Bukti_Izin");
      }
      return { nis: s.nis, debugLink: debugLink };
    });
  },
  getAllLogs: function () { return this.getSheet(CONFIG.SHEETS.LOG_PRESENSI).getDataRange().getValues(); },
  getActiveAlerts: function () {
    const data = this.getSheet(CONFIG.SHEETS.PERINGATAN_KASUS).getDataRange().getValues();
    const alerts = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][6] === "AKTIF") {
        alerts.push({ idPeringatan: data[i][0], nis: data[i][1], nama: data[i][2], kelas: data[i][3], tingkatKumulatif: data[i][4], totalHariAbsen: data[i][5], status: data[i][6], waktuDibuat: data[i][7] });
      }
    }
    return alerts;
  },
  updateAlertStatus: function (id, newStatus) {
    const sheet = this.getSheet(CONFIG.SHEETS.PERINGATAN_KASUS);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id && data[i][6] === "AKTIF") {
        sheet.getRange(i + 1, 7).setValue(newStatus);
        break;
      }
    }
  }
};

const TimeHelper = { getCurrentDate: () => Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"), getCurrentTimestamp: () => Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss") };
const ResponseHelper = {
  success: function (data, message = "Success") { return ContentService.createTextOutput(JSON.stringify({ status: "success", message, data })).setMimeType(ContentService.MimeType.JSON); },
  error: function (message) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message })).setMimeType(ContentService.MimeType.JSON); }
};
