/**
 * BACKEND GOOGLE APPS SCRIPT - PRESENSI SISWA BK (v7.1 - Auth Case Insensitive)
 * -----------------------------------------------------
 */

const CONFIG = {
  SHEETS: {
    LOG_PRESENSI: "LogPresensi",
    PERINGATAN_KASUS: "PeringatanKasus",
    PENYELESAIAN_KASUS: "PenyelesaianKasus",
    SISWA_X: "Siswa_X",
    SISWA_XI: "Siswa_XI",
    SISWA_XII: "Siswa_XII",
    BANK_KASUS: "BankKasus",
    USERS: "Users"
  },
  THRESHOLDS: {
    ALERT_MULTIPLIER: 3,
    MAX_LEVEL: 4
  }
};
const DashboardController = {
  getStats: function (queryParams) {
    try {
      const targetDate = TimeHelper.valid(queryParams.date || TimeHelper.getCurrentDate());
      const studentsX = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_X);
      const studentsXI = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XI);
      const studentsXII = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS.SISWA_XII);
      const totalMurid = studentsX.length + studentsXI.length + studentsXII.length;
      const currentNis = new Set([...studentsX, ...studentsXI, ...studentsXII].map(s => s.nis));
      const rawLogs = SpreadsheetRepository.getAllLogs();
      const uniqueLogs = new Map();
      for (const row of rawLogs.slice(1)) if (currentNis.has(String(row[2]))) uniqueLogs.set(String(row[2]) + ":" + TimeHelper.date(row[1]), row);
      const logs = [rawLogs[0], ...uniqueLogs.values()];
      let absenHariIni = 0;
      let breakdown = {
        SAKIT: 0,
        IZIN: 0,
        ALPHA: 0
      };
      let weeklyData = {};
      let monthlyData = {};
      const todayObj = new Date(targetDate + "T12:00:00Z");
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayObj);
        d.setDate(d.getDate() - i);
        const key = Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
        if (TimeHelper.school(key)) weeklyData[key] = 0;
      }
      for (let i = 5; i >= 0; i--) {
        const d = new Date(todayObj);
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        monthlyData[Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM")] = 0;
      }
      for (let i = 1; i < logs.length; i++) {
        let rowDateStr = "";
        if (logs[i][1] instanceof Date) rowDateStr = Utilities.formatDate(logs[i][1], "Asia/Jakarta", "yyyy-MM-dd");else rowDateStr = String(logs[i][1]).substring(0, 10);
        const stat = String(logs[i][5]).toUpperCase().trim();
        const isAbsen = ["SAKIT", "IZIN", "ALPHA"].includes(stat) && TimeHelper.school(rowDateStr);
        if (rowDateStr === targetDate && isAbsen) {
          if (stat === "SAKIT") breakdown.SAKIT++;else if (stat === "IZIN") breakdown.IZIN++;else if (stat === "ALPHA") breakdown.ALPHA++;
          absenHariIni++;
        }
        if (isAbsen && weeklyData[rowDateStr] !== undefined) weeklyData[rowDateStr]++;
        const rowMonthStr = rowDateStr.substring(0, 7);
        if (isAbsen && monthlyData[rowMonthStr] !== undefined) monthlyData[rowMonthStr]++;
      }
      const hadirHariIni = TimeHelper.school(targetDate) ? Math.max(0, totalMurid - absenHariIni) : 0;
      let persentase = TimeHelper.school(targetDate) ? 100 : 0;
      if (totalMurid > 0 && TimeHelper.school(targetDate)) persentase = Math.round(hadirHariIni / totalMurid * 100);
      const chartWeekly = Object.keys(weeklyData).map(date => {
        const parts = date.split('-');
        return {
          label: `${parts[2]}/${parts[1]}`,
          hadir: totalMurid - weeklyData[date],
          absen: weeklyData[date]
        };
      });
      const chartMonthly = Object.keys(monthlyData).map(month => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const parts = month.split('-');
        let schoolDays = 0;
        const lastDay = new Date(Number(parts[0]), Number(parts[1]), 0).getDate();
        for (let day = 1; day <= lastDay; day++) if (TimeHelper.school(month + '-' + String(day).padStart(2, '0'))) schoolDays++;
        const avgAbsen = Math.round(monthlyData[month] / schoolDays);
        return {
          label: `${monthNames[parseInt(parts[1]) - 1]} ${parts[0]}`,
          hadir: totalMurid - avgAbsen,
          absen: avgAbsen
        };
      });
      return ResponseHelper.success({
        tanggal: targetDate,
        totalMurid,
        hadirHariIni,
        absenHariIni,
        persentaseKehadiran: persentase,
        breakdown,
        chart: {
          weekly: chartWeekly,
          monthly: chartMonthly
        }
      });
    } catch (error) {
      return ResponseHelper.error(error.message);
    }
  }
};
function doPost(e) {
  try {
    return route(JSON.parse(e.postData.contents), true);
  } catch (err) {
    return ResponseHelper.error(err.message);
  }
}
function doGet(e) {
  return route(e.parameter, false);
}
function route(p, post) {
  RequestProfile.begin(p.profile === 'true');
  const response = routeRequest_(p, post);
  if (!RequestProfile.enabled) return response;
  const body = JSON.parse(response.getContent());
  body.profile = RequestProfile.result();
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
function routeRequest_(p, post) {
  try {
    if (post && p.action === 'login') return AuthController.login(p);
    if (!AuthController.session(p.token)) return ResponseHelper.error('Sesi berakhir. Silakan login.', 'UNAUTHORIZED');
    const reads = {
      getStudents: StudentController.getListGet,
      getSiswa: StudentController.getListGet,
      getLogPresensi: AttendanceController.getLogs,
      getAttendancePageData: AttendanceController.getPageData,
      getPeringatanKasus: CaseController.getList,
      getPenyelesaianKasus: CaseController.getPenyelesaian,
      getPriorityAlerts: () => ResponseHelper.success(SpreadsheetRepository.getActiveAlerts()),
      getRekapBulanan: AttendanceController.getRekapMatrix,
      getRekapRentang: AttendanceController.getRekapRentang,
      getDashboardStats: DashboardController.getStats,
      getBankKasus: BankKasusController.getList,
      getStudentDirectory: StudentController.directory
    };
    const writes = {
      logout: () => {
        PropertiesService.getScriptProperties().deleteProperty("SESSION_" + p.token);
        CacheService.getScriptCache().remove("SESSION_" + p.token);
        return ResponseHelper.success(null, "Keluar berhasil.");
      },
      saveAttendance: AttendanceController.save,
      resolveCase: CaseController.resolve,
      saveBankKasus: BankKasusController.saveBatch
    };
    const fn = (post ? writes : reads)[p.action];
    if (!fn) throw Error('Action tidak dikenali.');
    if (!post) {
      if (p.action !== 'getAttendancePageData' || p.fresh !== 'true') return fn(p);
      const lock = LockService.getScriptLock();
      RequestProfile.measure('lockWaitMs', () => lock.waitLock(30000));
      try { return fn(p); }
      finally { lock.releaseLock(); }
    }
    const lock = LockService.getScriptLock();
    RequestProfile.measure('lockWaitMs', () => lock.waitLock(30000));
    try {
      return fn(p);
    } finally {
      try { if (p.action !== 'logout') DirectoryCache.invalidate(); }
      finally { lock.releaseLock(); }
    }
  } catch (err) {
    return ResponseHelper.error(err.message);
  }
}
const AuthController = {
  hash(password) {
    const properties = PropertiesService.getScriptProperties();
    let salt = properties.getProperty('AUTH_SALT');
    if (!salt) {
      salt = Utilities.getUuid() + Utilities.getUuid();
      properties.setProperty('AUTH_SALT', salt);
    }
    return 'sha256:' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + password, Utilities.Charset.UTF_8).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
  },
  login(p) {
    if (!p.username || !p.password || String(p.username).length > 100) throw Error('Username dan password diperlukan.');
    const attemptCache = CacheService.getScriptCache(),
      attemptKey = 'LOGIN_' + String(p.username).trim().toLowerCase();
    let attempts;
    const attemptLock = LockService.getScriptLock();
    attemptLock.waitLock(30000);
    try { attempts = Number(attemptCache.get(attemptKey) || 0); }
    finally { attemptLock.releaseLock(); }
    if (attempts >= 10) throw Error('Terlalu banyak percobaan login. Coba lagi setelah 15 menit.');
    const invalid = () => {
      attemptLock.waitLock(30000);
      try {
        const current = Number(attemptCache.get(attemptKey) || 0);
        if (current >= 10) throw Error('Terlalu banyak percobaan login. Coba lagi setelah 15 menit.');
        attemptCache.put(attemptKey, String(current + 1), 900);
      } finally { attemptLock.releaseLock(); }
      throw Error('Username atau password salah.');
    };
    const sheet = SpreadsheetRepository.getSheet(CONFIG.SHEETS.USERS),
      rows = sheet.getDataRange().getValues();
    const i = rows.findIndex((r, i) => i > 0 && String(r[1]).trim().toLowerCase() === String(p.username).trim().toLowerCase());
    if (i < 1) return invalid();
    const stored = String(rows[i][2]);
    const hashed = stored.startsWith('sha256:');
    if ((hashed ? this.hash(String(p.password)) : String(p.password).trim()) !== (hashed ? stored : stored.trim())) return invalid();
    attemptCache.remove(attemptKey);
    if (!hashed) {
      const lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        sheet.getRange(i + 1, 3).setValue(this.hash(String(p.password)));
      } finally {
        lock.releaseLock();
      }
    }
    const user = {
        id: rows[i][0],
        username: rows[i][1],
        nama: rows[i][3],
        role: rows[i][4]
      },
      token = Utilities.getUuid() + Utilities.getUuid(),
      expiresAt = Date.now() + 12 * 60 * 60 * 1000;
    // ScriptCache has a six-hour maximum; ScriptProperties keeps idle sessions valid for the requested 12 hours.
    const properties = PropertiesService.getScriptProperties();
    for (const [key, value] of Object.entries(properties.getProperties())) if (key.startsWith('SESSION_') && JSON.parse(value).expiresAt <= Date.now()) properties.deleteProperty(key);
    const serialized = JSON.stringify({
      user,
      expiresAt
    });
    PropertiesService.getScriptProperties().setProperty('SESSION_' + token, serialized);
    CacheService.getScriptCache().put('SESSION_' + token, serialized, 21600);
    return ResponseHelper.success({
      token,
      user,
      expiresAt
    });
  },
  session(token) {
    if (typeof token !== 'string' || !token) return null;
    const cache = CacheService.getScriptCache(),
      properties = PropertiesService.getScriptProperties(),
      raw = cache.get('SESSION_' + token) || properties.getProperty('SESSION_' + token);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.expiresAt !== 'number' || !s.user || !s.user.id) return null;
    if (s.expiresAt <= Date.now()) {
      properties.deleteProperty('SESSION_' + token);
      return null;
    }
    cache.put('SESSION_' + token, raw, Math.min(21600, Math.ceil((s.expiresAt - Date.now()) / 1000)));
    return s;
  }
};
const TimeHelper = {
  getCurrentDate: () => Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd'),
  getCurrentTimestamp: () => Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'),
  date(v) {
    if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Jakarta', 'yyyy-MM-dd');
    let s = String(v || '').trim().slice(0, 10);
    if (s.includes('/')) {
      const a = s.split('/');
      s = a[2] + '-' + a[1].padStart(2, '0') + '-' + a[0].padStart(2, '0');
    }
    return s;
  },
  valid(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) !== v) throw Error('Tanggal tidak valid.');
    return v;
  },
  school(v) {
    const date = new Date(v + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v && ![0, 6].includes(date.getUTCDay());
  },
  year(p = {}) {
    const now = this.getCurrentDate(),
      fallback = Number(now.slice(0, 4)) - (now.slice(5, 7) < '07' ? 1 : 0);
    const raw = p.academic_year || String(fallback),
      m = /^(\d{4})(?:[/-](\d{4}))?$/.exec(String(raw));
    if (!m || m[2] && Number(m[2]) !== Number(m[1]) + 1) throw Error('Tahun ajaran tidak valid.');
    const y = Number(m[1]);
    return {
      start: y + '-07-01',
      end: y + 1 + '-06-30',
      id: y + '-' + (y + 1)
    };
  }
};
function filterRecords(rows, p, dateField) {
  const year = p.academic_year ? TimeHelper.year(p) : p.date ? TimeHelper.year({
    academic_year: String(Number(p.date.slice(0, 4)) - (p.date.slice(5, 7) < '07' ? 1 : 0))
  }) : null;
  return rows.filter(r => (!p.nis || String(r.nis) === String(p.nis)) && (!p.kelas || p.kelas === 'SEMUA' || r.kelas === p.kelas) && (!p.date || String(r[dateField]).startsWith(p.date)) && (!p.start_date || String(r[dateField]).slice(0, 10) >= p.start_date) && (!p.end_date || String(r[dateField]).slice(0, 10) <= p.end_date) && (!year || String(r[dateField]).slice(0, 10) >= year.start && String(r[dateField]).slice(0, 10) <= year.end));
}
const RequestProfile = {
  enabled: false, started: 0, metrics: {},
  begin(enabled) { this.enabled = enabled; this.started = Date.now(); this.metrics = { openSpreadsheetMs: 0, sheetLookupMs: 0, sheetReadMs: 0, sheetReads: 0, lockWaitMs: 0, attendanceReadMs: 0, attendanceWriteMs: 0, alertReadMs: 0, alertWriteMs: 0, alertSyncMs: 0 }; },
  measure(field, read) { const start = Date.now(); try { return read(); } finally { if (this.enabled) this.metrics[field] += Date.now() - start; } },
  result() { return { ...this.metrics, gasMs: Date.now() - this.started }; }
};
const SpreadsheetRepository = {
  spreadsheet: null,
  literalText(value) {
    const text = String(value);
    return /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
  },
  getSheet(name) {
    const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) throw Error('SPREADSHEET_ID belum dikonfigurasi. Operasi dihentikan demi keamanan.');
    if (!this.spreadsheet) this.spreadsheet = RequestProfile.measure('openSpreadsheetMs', () => SpreadsheetApp.openById(id));
    const sheet = RequestProfile.measure('sheetLookupMs', () => this.spreadsheet.getSheetByName(name));
    if (!sheet) throw Error('Tab Sheet ' + name + ' tidak ditemukan.');
    return sheet;
  },
  readRows(name) {
    const sheet = this.getSheet(name);
    return this.readSheet(sheet);
  },
  readSheet(sheet, field = 'sheetReadMs') {
    if (RequestProfile.enabled) RequestProfile.metrics.sheetReads++;
    return RequestProfile.measure(field, () => sheet.getDataRange().getValues());
  },
  getStudentsBySheet(name) {
    return this.readRows(name).slice(1).filter(r => r[2] && r[3]).map(r => ({
      kelas: String(r[1]).trim(),
      nis: String(r[2]).trim(),
      nama: String(r[3]).trim()
    }));
  },
  students() {
    return ['X', 'XI', 'XII'].flatMap(tingkat => this.getStudentsBySheet(CONFIG.SHEETS['SISWA_' + tingkat]).map(s => ({
      ...s,
      tingkat
    })));
  },
  getAllLogs() {
    return this.readRows(CONFIG.SHEETS.LOG_PRESENSI);
  },
  logs() {
    return this.getAllLogs().slice(1).filter(r => r[2]).map(r => ({
      id_presensi: r[0],
      tanggal: TimeHelper.date(r[1]),
      nis: String(r[2]),
      nama: r[3],
      kelas: r[4],
      status_presensi: String(r[5] || '').trim().toUpperCase(),
      ada_surat_dokter: r[6] === true || String(r[6]).trim().toUpperCase() === 'TRUE',
      link_bukti_izin: r[7],
      waktu_simpan: r[8]
    }));
  },
  insertBatch(name, rows) {
    if (rows.length) this.getSheet(name).getRange(this.getSheet(name).getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  },
  replace(sheet, rows, width, original) {
    if (!original) {
      const count = Math.max(rows.length, sheet.getLastRow());
      if (count) sheet.getRange(1, 1, count, width).setValues(Array.from({ length: count }, (_, i) => rows[i] || Array(width).fill('')));
      return;
    }
    const count = Math.max(rows.length, original.length);
    const padded = row => Array.from({ length: width }, (_, i) => row?.[i] ?? '');
    const same = (a, b) => a.every((v, i) => v instanceof Date && b[i] instanceof Date ? v.getTime() === b[i].getTime() : v === b[i]);
    let start = -1, changed = [];
    for (let i = 0; i <= count; i++) {
      const next = padded(rows[i]);
      if (i < count && !same(next, padded(original[i]))) {
        if (start < 0) start = i;
        changed.push(next);
      } else if (start >= 0) {
        sheet.getRange(start + 1, 1, changed.length, width).setValues(changed);
        start = -1; changed = [];
      }
    }
  },
  getActiveAlerts() {
    return CaseController.list({
      status_peringatan: 'AKTIF',
      academic_year: TimeHelper.year().id
    }).filter(r => r.status_peringatan === 'AKTIF').map(r => ({
      idPeringatan: r.id_peringatan,
      nis: r.nis,
      nama: r.nama,
      kelas: r.kelas,
      tingkatKumulatif: r.tingkat_kumulatif,
      totalHariAbsen: r.total_hari_absen,
      status: r.status_peringatan,
      waktuDibuat: r.waktu_dibuat
    }));
  }
};
const DirectoryCache = {
  key(p) {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) throw Error('SPREADSHEET_ID belum dikonfigurasi. Operasi dihentikan demi keamanan.');
    const fields = ['summary', 'nis', 'tingkat', 'academic_year', 'date', 'kelas', 'start_date', 'end_date'].map(k => [k, p[k] || '']);
    const fingerprint = JSON.stringify([spreadsheetId, props.getProperty('DIRECTORY_REVISION') || '0', fields]);
    return 'DIRECTORY_' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, fingerprint).map(b => (b & 255).toString(16).padStart(2, '0')).join('');
  },
  get(key, fresh) {
    RequestProfile.metrics.cache = fresh ? 'bypass' : 'miss';
    if (fresh) return null;
    try {
      const raw = CacheService.getScriptCache().get(key);
      if (raw) { const data = JSON.parse(raw); RequestProfile.metrics.cache = 'hit'; return data; }
    } catch (_) { console.warn('Directory cache read unavailable.'); }
    return null;
  },
  respond(key, data) {
    try {
      const raw = JSON.stringify(data);
      if (Utilities.newBlob(raw).getBytes().length < 95000) CacheService.getScriptCache().put(key, raw, 30);
    } catch (_) { console.warn('Directory cache write unavailable.'); }
    return ResponseHelper.success(data);
  },
  invalidate() {
    // Revision changes make a reader finishing after a write populate an obsolete, unreachable key.
    PropertiesService.getScriptProperties().setProperty('DIRECTORY_REVISION', Utilities.getUuid());
  }
};
const StudentController = {
  getListGet(p) {
    const students = ['X', 'XI', 'XII'].includes(p.tingkat)
      ? SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS['SISWA_' + p.tingkat]).map(s => ({ ...s, tingkat: p.tingkat }))
      : SpreadsheetRepository.students();
    return ResponseHelper.success(students.filter(s => !p.kelas || p.kelas === 'SEMUA' || s.kelas === p.kelas));
  },
  directory(p) {
    p = { ...p, academic_year: p.academic_year || TimeHelper.year().id };
    const cacheKey = DirectoryCache.key(p);
    const cached = DirectoryCache.get(cacheKey, p.fresh === 'true');
    if (cached) return ResponseHelper.success(cached);
    const roster = p.nis && ['X','XI','XII'].includes(p.tingkat)
      ? SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS['SISWA_' + p.tingkat]).map(s => ({ ...s, tingkat: p.tingkat }))
      : SpreadsheetRepository.students();
    const students = roster.filter(s => !p.nis || s.nis === String(p.nis));
    const logs = filterRecords(SpreadsheetRepository.logs(), p, 'tanggal');
    const kasus = BankKasusController.list(p);
    if (p.summary === 'true') {
      const summaries = new Map(students.map(s => [s.nis, { ...s, totalAlpha: 0, totalSakit: 0, totalIzin: 0, totalPelanggaran: 0 }]));
      const days = new Map(), fields = { ALPHA: 'totalAlpha', SAKIT: 'totalSakit', IZIN: 'totalIzin' };
      for (const log of logs) {
        const student = summaries.get(log.nis), field = fields[log.status_presensi];
        if (!student || (!field && log.status_presensi !== 'HADIR') || !TimeHelper.school(log.tanggal)) continue;
        try { TimeHelper.valid(log.tanggal); } catch (_) { continue; }
        const key = log.nis + ':' + log.tanggal, previous = days.get(key);
        if (previous) student[previous]--;
        if (field) student[field]++;
        days.set(key, field);
      }
      for (const item of kasus) {
        const student = summaries.get(item.nis);
        if (student) student.totalPelanggaran++;
      }
      return DirectoryCache.respond(cacheKey, { students: [...summaries.values()] });
    }
    return DirectoryCache.respond(cacheKey, { students, logs, kasus, penyelesaian: CaseController.completed(p) });
  }

};
const AttendanceController = {
  getLogs: p => ResponseHelper.success(filterRecords(SpreadsheetRepository.logs(), p, 'tanggal')),
  getPageData(p) {
    const date = TimeHelper.valid(p.date);
    if (!['X', 'XI', 'XII'].includes(p.tingkat)) throw Error('Tingkat tidak valid.');
    const cacheKey = DirectoryCache.key({ ...p, summary: 'attendance' });
    const cached = DirectoryCache.get(cacheKey, p.fresh === 'true');
    if (cached) return ResponseHelper.success(cached);
    const students = SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS['SISWA_' + p.tingkat])
      .map(s => ({ ...s, tingkat: p.tingkat }));
    const roster = new Set(students.map(s => s.nis));
    const logs = TimeHelper.school(date)
      ? SpreadsheetRepository.logs().filter(log => log.tanggal === date && roster.has(log.nis))
      : [];
    return DirectoryCache.respond(cacheKey, { students, logs });
  },
  save(p) {
    const date = TimeHelper.valid(p.date || TimeHelper.getCurrentDate());
    if (!TimeHelper.school(date)) throw Error('Presensi hanya Senin–Jumat.');
    if (!Array.isArray(p.attendances) || !p.attendances.length) throw Error('Data presensi kosong.');
    const levels = new Set(p.attendances.map(s => {
      const level = String(s.kelas || '').trim().split(/\s+/)[0];
      return ['X', 'XI', 'XII'].includes(level) ? level : null;
    }));
    const roster = levels.size === 1 && !levels.has(null)
      ? SpreadsheetRepository.getStudentsBySheet(CONFIG.SHEETS['SISWA_' + levels.values().next().value])
      : SpreadsheetRepository.students();
    const pupils = new Map(roster.map(s => [s.nis, s])),
      seen = new Set();
    const students = p.attendances.map(s => {
      const pupil = pupils.get(String(s.nis));
      if (!pupil || seen.has(pupil.nis) || s.kelas && s.kelas !== pupil.kelas || !['HADIR', 'SAKIT', 'IZIN', 'ALPHA'].includes(s.status_presensi)) throw Error('Data siswa/status tidak valid.');
      seen.add(pupil.nis);
      if (s.fileBase64 && !s.fileName || !s.fileBase64 && s.fileName) throw Error('Lampiran tidak lengkap.');
      if (s.ada_surat_dokter !== undefined && typeof s.ada_surat_dokter !== 'boolean') throw Error('Status surat dokter harus boolean.');
      return {
        ...s,
        ...pupil
      };
    });
    const sheet = SpreadsheetRepository.getSheet(CONFIG.SHEETS.LOG_PRESENSI),
      rows = SpreadsheetRepository.readSheet(sheet, 'attendanceReadMs'),
      timestamp = TimeHelper.getCurrentTimestamp(),
      links = [];
    const existing = new Map(rows.slice(1).filter(r => TimeHelper.date(r[1]) === date).map(r => [String(r[2]), r])),
      uploaded = [];
    try {
      const updated = students.filter(s => s.status_presensi !== 'HADIR').map(s => {
        const old = existing.get(s.nis),
          file = s.fileBase64 ? FileService.uploadFile(s.fileBase64, s.fileName, 'BK_Bukti_Izin') : null;
        if (!file && s.link_bukti_izin && s.link_bukti_izin !== String(old && old[7] || '')) throw Error('Tautan bukti tidak cocok dengan data tersimpan.');
        const link = file ? (uploaded.push(file), file.url) : s.link_bukti_izin === undefined ? old && old[7] || '' : String(s.link_bukti_izin || '');
        links.push({
          nis: s.nis,
          linkBukti: link
        });
        return [old ? old[0] : 'ATT-' + Utilities.getUuid(), date, s.nis, s.nama, s.kelas, s.status_presensi, s.ada_surat_dokter === undefined ? old?.[6] === true || String(old?.[6]).trim().toUpperCase() === 'TRUE' : s.ada_surat_dokter, link, timestamp];
      });
    const pending = new Map(updated.map(r => [String(r[2]), r])),
      releasedLinks = students.map(s => {
        const old = existing.get(s.nis), next = pending.get(s.nis);
        return old && old[7] && (!next || old[7] !== next[7]) ? old[7] : '';
      }).filter(Boolean);
    const result = [rows[0]];
    for (const row of rows.slice(1)) {
      if (!row[2]) continue;
      if (TimeHelper.date(row[1]) === date && seen.has(String(row[2]))) {
        const replacement = pending.get(String(row[2]));
        if (replacement) result.push(replacement);
        pending.delete(String(row[2]));
      } else result.push(row);
    }
    result.push(...pending.values());
      RequestProfile.measure('attendanceWriteMs', () => SpreadsheetRepository.replace(sheet, result, 9, rows));
      let alertSyncPending = false;
      try { RequestProfile.measure('alertSyncMs', () => AlertService.reconcile(students, result.slice(1), date, timestamp)); }
      catch (error) { alertSyncPending = true; console.error('Presensi tersimpan, sinkronisasi alert gagal: ' + error.message); }
      FileService.cleanupManagedLinks(releasedLinks, [CONFIG.SHEETS.LOG_PRESENSI, CONFIG.SHEETS.PENYELESAIAN_KASUS], 'BK_Bukti_Izin');
      return ResponseHelper.success({ uploadedLinks: links, alertSyncPending }, alertSyncPending
        ? 'Presensi tersimpan, tetapi sinkronisasi alert belum berhasil. Simpan ulang untuk mencoba lagi.'
        : 'Presensi berhasil disimpan.');
    } catch (error) {
      FileService.cleanupUnreferenced(uploaded, [CONFIG.SHEETS.LOG_PRESENSI, CONFIG.SHEETS.PENYELESAIAN_KASUS]);
      throw error;
    }
  },
  recap(p, start, end, numeric) {
    TimeHelper.valid(start);
    TimeHelper.valid(end);
    if (start > end) throw Error('Rentang tanggal tidak valid.');
    const grouped = new Map();
    for (const r of SpreadsheetRepository.logs()) {
      if (r.tanggal < start || r.tanggal > end || !TimeHelper.school(r.tanggal) || !['SAKIT', 'IZIN', 'ALPHA'].includes(r.status_presensi)) continue;
      if (!grouped.has(r.nis)) grouped.set(r.nis, new Map());
      grouped.get(r.nis).set(r.tanggal, r.status_presensi);
    }
    return ResponseHelper.success(SpreadsheetRepository.students().filter(s => (!p.tingkat || p.tingkat === 'SEMUA' || s.tingkat === p.tingkat) && (!p.kelas || p.kelas === 'SEMUA' || s.kelas === p.kelas)).map(s => {
      const dailyLogs = {},
        counts = {
          SAKIT: 0,
          IZIN: 0,
          ALPHA: 0
        };
      for (const [d, status] of grouped.get(s.nis) || []) {
        dailyLogs[numeric ? Number(d.slice(8)) : d] = status;
        counts[status]++;
      }
      return {
        nis: s.nis,
        nama: s.nama,
        kelas: s.kelas,
        sakit: counts.SAKIT,
        izin: counts.IZIN,
        alpha: counts.ALPHA,
        totalTidakHadir: counts.SAKIT + counts.IZIN + counts.ALPHA,
        dailyLogs
      };
    }));
  },
  getRekapMatrix(p) {
    const m = p.month || TimeHelper.getCurrentDate().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) throw Error('Bulan tidak valid.');
    const end = new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();
    return AttendanceController.recap(p, m + '-01', m + '-' + end, true);
  },
  getRekapRentang: p => AttendanceController.recap(p, p.start_date, p.end_date, false)
};
const AlertService = {
  reconcile(students, logs, date, timestamp) {
    const year = TimeHelper.year({
        academic_year: String(Number(date.slice(0, 4)) - (date.slice(5, 7) < '07' ? 1 : 0))
      }),
      sheet = SpreadsheetRepository.getSheet(CONFIG.SHEETS.PERINGATAN_KASUS),
      rows = SpreadsheetRepository.readSheet(sheet, 'alertReadMs'),
      days = new Map();
    const targets = new Map(students.map(student => [String(student.nis), student]));
    for (const r of logs) {
      const d = TimeHelper.date(r[1]), nis = String(r[2]), status = String(r[5] || '').trim().toUpperCase();
      if (!targets.has(nis) || d < year.start || d > year.end || !TimeHelper.school(d) || !['HADIR', 'SAKIT', 'IZIN', 'ALPHA'].includes(status)) continue;
      if (!days.has(nis)) days.set(nis, new Set());
      if (status === 'HADIR') days.get(nis).delete(d);
      else days.get(nis).add(d);
    }
    const thresholds = new Map(students.map(student => {
      const count = (days.get(student.nis) || new Set()).size;
      return [String(student.nis), { count, level: Math.min(4, Math.floor(count / 3)) }];
    }));
    const inYear = r => /ALERT-.*-\d{4}-\d{4}-[1-4]$/.test(String(r[0])) ? String(r[0]).includes(year.id) : TimeHelper.date(r[7]) >= year.start && TimeHelper.date(r[7]) <= year.end;
    const archived = rows.some(r => targets.has(String(r[1])) && r[6] === 'AKTIF' && inYear(r))
      ? new Set(SpreadsheetRepository.readRows(CONFIG.SHEETS.PENYELESAIAN_KASUS).slice(1).filter(r => r[0]).map(r => String(r[1]) + ':' + String(r[2])))
      : new Set();
    const completed = new Set();
    for (const r of rows) if (targets.has(String(r[1])) && inYear(r) && (r[6] === 'SELESAI' || archived.has(String(r[0]) + ':' + String(r[1])))) completed.add(String(r[1]) + ':' + Number(r[4]));
    const kept = new Set(), present = new Set();
    const result = rows.filter((r, i) => i === 0 || r[0]).map(r => {
      const row = [...r], nis = String(row[1]), target = targets.get(nis);
      if (!target || !inYear(row)) return row;
      const key = nis + ':' + Number(row[4]);
      if (row[6] === 'AKTIF') {
        const threshold = thresholds.get(nis);
        if (archived.has(String(row[0]) + ':' + nis)) row[6] = 'SELESAI';
        else if (Number(row[4]) > threshold.level || completed.has(key) || kept.has(key)) return null;
        else {
          kept.add(key);
          row[5] = threshold.count;
        }
      }
      present.add(key);
      return row;
    }).filter(Boolean);
    for (const s of students) {
      const { count, level } = thresholds.get(String(s.nis));
      for (let l = 1; l <= level; l++) {
        if (!present.has(String(s.nis) + ':' + l)) {
          result.push(['ALERT-' + s.nis + '-' + year.id + '-' + l, s.nis, s.nama, s.kelas, l, count, 'AKTIF', timestamp]);
          present.add(String(s.nis) + ':' + l);
        }
      }
    }
    RequestProfile.measure('alertWriteMs', () => SpreadsheetRepository.replace(sheet, result, 8, rows));
  }
};
const BankKasusController = {
  list(p) {
    return filterRecords(SpreadsheetRepository.readRows(CONFIG.SHEETS.BANK_KASUS).slice(1).filter(r => r[0]).map(r => ({
      id_kasus: r[0],
      tanggal: TimeHelper.date(r[1]),
      nis: String(r[2]),
      nama: r[3],
      kelas: r[4],
      jenis_pelanggaran: r[5],
      waktu_simpan: r[6]
    })), p, 'tanggal');
  },
  getList: p => ResponseHelper.success(BankKasusController.list(p)),
  saveBatch(p) {
    const date = TimeHelper.valid(p.date || TimeHelper.getCurrentDate()),
      pupils = new Map(SpreadsheetRepository.students().map(s => [s.nis, s]));
    if (typeof p.pelanggaran !== 'string' || !p.pelanggaran.trim() || !Array.isArray(p.students) || !p.students.length) throw Error('Data kosong.');
    if (p.request_id && (typeof p.request_id !== 'string' || p.request_id.length > 100)) throw Error('ID permintaan tidak valid.');
    const sheet = SpreadsheetRepository.getSheet(CONFIG.SHEETS.BANK_KASUS),
      existing = sheet.getDataRange().getValues();
    if (p.request_id && existing.some(row => row[7] === p.request_id)) return ResponseHelper.success(null, 'Data sudah tersimpan.');
    if (p.request_id && existing[0]?.[7] !== 'request_id') sheet.getRange(1, 8).setValue('request_id');
    const seen = new Set(),
      rows = p.students.map(s => {
        const pupil = pupils.get(String(s.nis));
        if (!pupil || seen.has(pupil.nis) || s.kelas && s.kelas !== pupil.kelas) throw Error('Siswa tidak valid.');
        seen.add(pupil.nis);
        return ['BK-' + Utilities.getUuid(), date, pupil.nis, pupil.nama, pupil.kelas, SpreadsheetRepository.literalText(p.pelanggaran.trim()), TimeHelper.getCurrentTimestamp(), p.request_id || ''];
      });
    SpreadsheetRepository.insertBatch(CONFIG.SHEETS.BANK_KASUS, rows);
    return ResponseHelper.success(null, 'Data berhasil disimpan.');
  }
};
const CaseController = {
  list(p) {
    const year = p.academic_year || p.status_peringatan === 'AKTIF' ? TimeHelper.year(p) : null;
    const records = SpreadsheetRepository.readRows(CONFIG.SHEETS.PERINGATAN_KASUS).slice(1).filter(r => r[0]).filter(r => !year || (/ALERT-.*-\d{4}-\d{4}-[1-4]$/.test(String(r[0])) ? String(r[0]).includes(year.id) : TimeHelper.date(r[7]) >= year.start && TimeHelper.date(r[7]) <= year.end)).map(r => ({
      id_peringatan: r[0],
      nis: String(r[1]),
      nama: r[2],
      kelas: r[3],
      tingkat_kumulatif: r[4],
      total_hari_absen: r[5],
      status_peringatan: r[6],
      waktu_dibuat: r[7] instanceof Date ? Utilities.formatDate(r[7], 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') : String(r[7])
    }));
    const completedLevels = p.status_peringatan === 'AKTIF'
      ? new Set(records.filter(r => r.status_peringatan === 'SELESAI').map(r => r.nis + ':' + Number(r.tingkat_kumulatif)))
      : new Set();
    return filterRecords(records, {
      ...p,
      academic_year: undefined
    }, 'waktu_dibuat').filter(r => (!p.status_peringatan || r.status_peringatan === p.status_peringatan) && !(r.status_peringatan === 'AKTIF' && completedLevels.has(r.nis + ':' + Number(r.tingkat_kumulatif))));
  },
  getList: p => ResponseHelper.success(CaseController.list(p)),
  completed(p) {
    return filterRecords(SpreadsheetRepository.readRows(CONFIG.SHEETS.PENYELESAIAN_KASUS).slice(1).filter(r => r[0]).map(r => ({
      id_penyelesaian: r[0],
      id_peringatan: r[1],
      nis: String(r[2]),
      nama: r[3],
      kelas: r[4],
      link_bukti: r[5],
      link_pdf_drive: r[5],
      catatan_konseling: r[6],
      ditangani_oleh: r[7],
      waktu_selesai: r[8] instanceof Date ? Utilities.formatDate(r[8], 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss') : String(r[8])
    })), p, 'waktu_selesai');
  },
  getPenyelesaian: p => ResponseHelper.success(CaseController.completed(p)),
  resolve(p) {
    const sheet = SpreadsheetRepository.getSheet(CONFIG.SHEETS.PERINGATAN_KASUS),
      rows = sheet.getDataRange().getValues(),
      i = rows.findIndex((r, i) => i > 0 && r[0] === p.id_peringatan && String(r[1]) === String(p.nis));
    if (i < 1) throw Error('Peringatan aktif siswa tidak ditemukan.');
    const r = rows[i], archive = SpreadsheetRepository.getSheet(CONFIG.SHEETS.PENYELESAIAN_KASUS),
      archived = archive.getDataRange().getValues().find((row, index) => index > 0 && row[1] === r[0]);
    let link = archived && archived[5];
    if (!archived) {
      if (r[6] !== 'AKTIF') throw Error('Peringatan sudah ditutup tanpa arsip penyelesaian.');
      const file = FileService.uploadFile(p.fileBase64 || p.pdfBase64, p.fileName, 'BK_Penyelesaian_Kasus');
      link = file.url;
      try {
        SpreadsheetRepository.insertBatch(CONFIG.SHEETS.PENYELESAIAN_KASUS, [['RES-' + Utilities.getUuid(), r[0], r[1], r[2], r[3], link, SpreadsheetRepository.literalText(p.catatan_konseling || ''), String(AuthController.session(p.token).user.nama), TimeHelper.getCurrentTimestamp()]]);
      } catch (error) {
        FileService.cleanupUnreferenced([file], [CONFIG.SHEETS.PENYELESAIAN_KASUS]);
        throw error;
      }
    }
    if (r[6] !== 'SELESAI') sheet.getRange(i + 1, 7).setValue('SELESAI');
    return ResponseHelper.success({
      linkDokumen: link
    }, 'Kasus diselesaikan.');
  }
};
const FileService = {
  getMimeType(name) {
    return {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png'
    }[String(name || '').split('.').pop().toLowerCase()];
  },
  uploadFile(raw, name, folder = 'BK_Dokumen_Presensi') {
    const mime = this.getMimeType(name);
    if (typeof raw !== 'string' || !raw || !mime) throw Error('Lampiran wajib PDF, Office, JPG, atau PNG.');
    const b64 = raw.replace(/^data:[^;]+;base64,/, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 !== 0 || b64.length > 13981016) throw Error('Lampiran tidak valid atau melebihi 10 MB.');
    const bytes = Utilities.base64Decode(b64);
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw Error('Lampiran tidak valid atau melebihi 10 MB.');
    const ext = String(name).split('.').pop().toLowerCase(),
      magic = {
        pdf: [37, 80, 68, 70],
        docx: [80, 75, 3, 4],
        xlsx: [80, 75, 3, 4],
        doc: [208, 207, 17, 224, 161, 177, 26, 225],
        xls: [208, 207, 17, 224, 161, 177, 26, 225],
        jpg: [255, 216, 255],
        jpeg: [255, 216, 255],
        png: [137, 80, 78, 71, 13, 10, 26, 10]
      }[ext];
    if (!magic.every((b, i) => (bytes[i] + 256) % 256 === b)) throw Error('Isi lampiran tidak cocok dengan jenis file.');
    folder = (PropertiesService.getScriptProperties().getProperty('FILE_FOLDER_PREFIX') || '') + folder;
    const folders = DriveApp.getFoldersByName(folder),
      target = folders.hasNext() ? folders.next() : DriveApp.createFolder(folder);
    const file = target.createFile(Utilities.newBlob(bytes, mime, name));
      return { id: file.getId(), url: file.getUrl() };
  },
  cleanupUnreferenced(files, sheetNames) {
    if (!files.length) return;
    let references;
    try {
      references = sheetNames.flatMap(name => SpreadsheetRepository.readRows(name));
    } catch (error) {
      console.error('Upload cleanup skipped because reference check failed: ' + error.message);
      return;
    }
    for (const file of files) {
      if (references.some(row => row.includes(file.url))) continue;
      try { DriveApp.getFileById(file.id).setTrashed(true); }
      catch (error) { console.error('Could not trash unreferenced upload ' + file.id + ': ' + error.message); }
    }
  },
  cleanupManagedLinks(urls, sheetNames, folder) {
    const files = [];
    for (const url of urls) {
      const match = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/.exec(String(url));
      if (!match) continue;
      try {
        const driveFile = DriveApp.getFileById(match[1]),
          folderName = (PropertiesService.getScriptProperties().getProperty('FILE_FOLDER_PREFIX') || '') + folder,
          folders = DriveApp.getFoldersByName(folderName);
        if (!folders.hasNext()) continue;
        const folderId = folders.next().getId(), parents = driveFile.getParents();
        let managed = false;
        while (parents.hasNext()) if (parents.next().getId() === folderId) managed = true;
        if (managed) files.push({ id: match[1], url });
      } catch (error) { console.warn('Attachment cleanup skipped: ' + error.message); }
    }
    this.cleanupUnreferenced(files, sheetNames);
  }
};
const ResponseHelper = {
  success: (data, message = 'Success') => ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message,
    data,
    ...(RequestProfile.enabled ? { profile: RequestProfile.result() } : {})
  })).setMimeType(ContentService.MimeType.JSON),
  error: (message, code) => ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message,
    ...(RequestProfile.enabled ? { profile: RequestProfile.result() } : {}),
    ...(code ? {
      code
    } : {})
  })).setMimeType(ContentService.MimeType.JSON)
};
