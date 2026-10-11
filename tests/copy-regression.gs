// Run only in the isolated Apps Script bound to the authorized spreadsheet copy.
function runCopyRegression() {
  const copyId = '16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== copyId) throw new Error('Tes hanya boleh dijalankan pada spreadsheet salinan.');
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('SPREADSHEET_ID', copyId);
  properties.setProperty('FILE_FOLDER_PREFIX', 'TEST_PRESENSI_');
  const nis = '999' + String(Date.now()).slice(-9);
  const pupilSheet = ss.getSheetByName('Siswa_X');
  if (SpreadsheetRepository.students().some(s => s.nis === nis)) throw new Error('NIS uji sudah ada; tidak mengubah datanya.');
  const token = Utilities.getUuid() + Utilities.getUuid();
  const bankRequestId = Utilities.getUuid();
  properties.setProperty('SESSION_' + token, JSON.stringify({ user: { id: 'TEST', username: 'test', nama: 'Pengujian Salinan', role: 'ADMIN' }, expiresAt: Date.now() + 3600000 }));
  const checks = [];
  const timings = [];
  const check = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  const call = (action, payload) => {
    const start = Date.now();
    const result = JSON.parse(route({ ...payload, action, token }, true).getContent());
    timings.push({ action, elapsedMs: Date.now() - start, status: result.status });
    return result;
  };
  const dates = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'];
  const docs = new Set();
  let inserted = false;
  const started = Date.now();
  let summary;
  try {
    pupilSheet.appendRow([99999, 'X UJI', nis, 'SISWA UJI CODEX', '', '', '']);
    inserted = true;
    const read = (action, payload = {}) => {
      const start = Date.now();
      const result = JSON.parse(route({ ...payload, action, token }, false).getContent());
      timings.push({ action, elapsedMs: Date.now() - start, status: result.status });
      return result;
    };
    const anonymous = JSON.parse(route({ action: 'getSiswa' }, false).getContent());
    check(anonymous.code === 'UNAUTHORIZED', 'Akses admin tanpa sesi harus ditolak.');
    const roster = read('getSiswa', { tingkat: 'X', kelas: 'X UJI' });
    check(roster.status === 'success' && roster.data.some(s => s.nis === nis) && roster.data.every(s => s.kelas === 'X UJI'), 'Filter siswa kelas uji harus tepat.');
    check(call('saveAttendance', { date: '2026-10-10', attendances: [{ nis, status_presensi: 'ALPHA' }] }).status === 'error', 'Presensi Sabtu harus ditolak.');
    const student = { nis, nama: 'SISWA UJI CODEX', kelas: 'X UJI', status_presensi: 'SAKIT', ada_surat_dokter: true };
    for (const date of dates) {
      const result = call('saveAttendance', { date, attendances: [student] });
      check(result.status === 'success', result.message);
    }
    let alerts = CaseController.list({ nis, academic_year: '2026-2027' });
    check(alerts.length === 2, 'Seharusnya tepat dua alert pada enam hari sakit.');
    check(call('saveAttendance', { date: dates[5], attendances: [student] }).status === 'success', 'Simpan ulang gagal.');
    check(CaseController.list({ nis, academic_year: '2026-2027' }).length === 2, 'Simpan ulang membuat alert duplikat.');
    check(call('saveAttendance', { date: dates[5], attendances: [{ ...student, status_presensi: 'HADIR' }] }).status === 'success', 'Koreksi HADIR gagal.');
    check(SpreadsheetRepository.logs().filter(r => r.nis === nis).length === 5, 'Koreksi HADIR tidak menghapus log.');
    alerts = CaseController.list({ nis, academic_year: '2026-2027' });
    check(alerts.length === 1 && alerts[0].total_hari_absen === 5, 'Rekonsiliasi alert salah.');
    const blank = call('resolveCase', { id_peringatan: alerts[0].id_peringatan, nis });
    check(blank.status === 'error', 'Kasus tertutup tanpa file.');
    const pdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF';
    const result = call('resolveCase', { id_peringatan: alerts[0].id_peringatan, nis, fileName: 'TEST_CODEX.pdf', fileBase64: Utilities.base64Encode(pdf), catatan_konseling: 'DATA UJI' });
    check(result.status === 'success', result.message);
    docs.add(result.data.linkDokumen);
    check(CaseController.completed({ nis }).length === 1, 'Arsip penyelesaian tidak tercatat.');
    check(CaseController.list({ nis })[0].status_peringatan === 'SELESAI', 'Alert tidak ditutup.');
    const logs = read('getLogPresensi', { nis, date: '2026-10' });
    check(logs.status === 'success' && logs.data.length === 5, 'Filter log harus mengembalikan lima hari.');
    const recap = read('getRekapRentang', { start_date: dates[0], end_date: dates[5], kelas: 'X UJI' });
    check(recap.status === 'success' && recap.data.some(s => s.nis === nis && s.sakit === 5), 'Rekap periode harus menghitung lima hari sakit.');
    const bank = call('saveBankKasus', { date: dates[5], pelanggaran: '=1+1', request_id: bankRequestId, students: [{ nis, kelas: 'X UJI' }] });
    check(bank.status === 'success', 'Simpan bank kasus harus berhasil.');
    const bankSheet = ss.getSheetByName('BankKasus'), bankRows = bankSheet.getDataRange().getValues();
    const bankRowIndex = bankRows.findIndex(row => row[7] === bankRequestId);
    const bankRow = bankRows[bankRowIndex];
    check(bankRowIndex >= 0 && ['=1+1', "'=1+1"].includes(bankRow[5]) && !bankSheet.getRange(bankRowIndex + 1, 6).getFormula(), 'Teks formula harus disimpan sebagai literal dan ID operasi tercatat.');
    const bankCount = bankSheet.getLastRow();
    check(call('saveBankKasus', { date: dates[5], pelanggaran: '=1+1', request_id: bankRequestId, students: [{ nis, kelas: 'X UJI' }] }).status === 'success' && bankSheet.getLastRow() === bankCount, 'Retry bank kasus tidak boleh membuat duplikat.');
    const directory = read('getStudentDirectory', { nis });
    check(directory.status === 'success' && directory.data.students.length === 1 && directory.data.logs.length === 5, 'Detail siswa harus terbatas pada siswa uji.');
    const summaryRows = read('getStudentDirectory', { summary: 'true', nis });
    check(summaryRows.status === 'success' && summaryRows.data.students[0].totalSakit === 5 && !summaryRows.data.logs, 'Ringkasan harus ringan dan menghitung lima sakit.');
    summary = { status: 'PASS', checks: checks.length, timings, elapsedMs: Date.now() - started, spreadsheetId: copyId };

  } finally {
    if (inserted) {
      const lock = LockService.getScriptLock(); lock.waitLock(30000);
      try {
        for (const [name, column, width] of [['LogPresensi', 2, 9], ['PeringatanKasus', 1, 8], ['PenyelesaianKasus', 2, 9], ['Siswa_X', 2, 7]]) {
          const sheet = ss.getSheetByName(name), rows = sheet.getDataRange().getValues();
          for (let i = rows.length - 1; i >= 1; i--) if (String(rows[i][column]) === nis) sheet.deleteRow(i + 1);
        }
        const bankSheet = ss.getSheetByName('BankKasus'), bankRows = bankSheet.getDataRange().getValues();
        for (let i = bankRows.length - 1; i >= 1; i--) if (bankRows[i][7] === bankRequestId) bankSheet.deleteRow(i + 1);
      } finally { lock.releaseLock(); }
    }
    properties.deleteProperty('SESSION_' + token);
    CacheService.getScriptCache().remove('SESSION_' + token);
    for (const url of docs) {
      const match = url.match(/[-\w]{25,}/);
      if (match) DriveApp.getFileById(match[0]).setTrashed(true);
    }
  }
  console.log(JSON.stringify(summary));
  return summary;
}

function runCopyFileFormatRegression() {
  const copyId = '16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== copyId) throw new Error('Tes hanya boleh dijalankan pada spreadsheet salinan.');
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('SPREADSHEET_ID', copyId);
  properties.setProperty('FILE_FOLDER_PREFIX', 'TEST_PRESENSI_');
  const formats = [
    ['pdf', 'JVBERi0xLjQK', 'application/pdf'],
    ['docx', 'UEsDBA==', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['xlsx', 'UEsDBA==', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['jpg', '/9j/AA==', 'image/jpeg'],
    ['png', 'iVBORw0KGgo=', 'image/png']
  ];
  const uploaded = [];
  let checks = 0;
  let summary;
  try {
    for (const [extension, base64, mimeType] of formats) {
      const file = FileService.uploadFile(base64, `CODEX_FORMAT_${Date.now()}.${extension}`, 'BK_Bukti_Izin');
      const match = String(file && file.url || file).match(/[-\w]{25,}/);
      const id = file && file.id || match && match[0];
      if (!id) throw new Error('Drive file ID tidak ditemukan.');
      uploaded.push(id);
      if (DriveApp.getFileById(id).getMimeType() !== mimeType) throw new Error(`MIME ${extension} tidak sesuai.`);
      checks++;
    }
    let spoofRejected = false;
    try { FileService.uploadFile('UEsDBA==', 'CODEX_FORMAT_SPOOF.pdf', 'BK_Bukti_Izin'); }
    catch (_) { spoofRejected = true; }
    if (!spoofRejected) throw new Error('File dengan signature palsu diterima.');
    checks++;
    let oversizedRejected = false;
    try { FileService.uploadFile('A'.repeat(13981020), 'CODEX_FORMAT_OVERSIZED.pdf', 'BK_Bukti_Izin'); }
    catch (_) { oversizedRejected = true; }
    if (!oversizedRejected) throw new Error('File lebih dari 10 MB diterima.');
    checks++;
    summary = { status: 'PASS', checks, formats: formats.map(([extension]) => extension) };
  } finally {
    for (const id of uploaded) DriveApp.getFileById(id).setTrashed(true);
    for (const folderName of ['TEST_PRESENSI_BK_Bukti_Izin', 'BK_Bukti_Izin']) {
      const folders = DriveApp.getFoldersByName(folderName);
      while (folders.hasNext()) {
        const files = folders.next().getFiles();
        while (files.hasNext()) {
          const file = files.next();
          if (file.getName().startsWith('CODEX_FORMAT_')) file.setTrashed(true);
        }
      }
    }
  }
  console.log(JSON.stringify(summary));
  return summary;
}

// Requires script.external_request; run only in the TEST copy after Google authorization.
function runCopyConcurrencyRegression() {
  const copyId = '16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ';
  const endpoint = 'https://script.google.com/macros/s/AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q/exec';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== copyId) throw new Error('Tes hanya boleh dijalankan pada spreadsheet salinan.');
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('SPREADSHEET_ID', copyId);
  properties.setProperty('FILE_FOLDER_PREFIX', 'TEST_PRESENSI_');
  const nis = '998' + String(Date.now()).slice(-9), date = '2026-10-19';
  const students = ss.getSheetByName('Siswa_X');
  if (SpreadsheetRepository.students().some(student => student.nis === nis)) throw new Error('NIS uji sudah ada; tidak mengubah datanya.');
  const token = Utilities.getUuid() + Utilities.getUuid();
  const serialized = JSON.stringify({ user: { id: 'TEST', username: 'test', nama: 'Pengujian Salinan', role: 'ADMIN' }, expiresAt: Date.now() + 3600000 });
  properties.setProperty('SESSION_' + token, serialized);
  CacheService.getScriptCache().put('SESSION_' + token, serialized, 3600);
  let inserted = false;
  let summary;
  const loginAttemptKey = 'LOGIN_codex-concurrency-test';
  try {
    students.appendRow([99999, 'X UJI', nis, 'SISWA UJI CODEX', '', '', '']);
    inserted = true;
    const responses = UrlFetchApp.fetchAll(['SAKIT', 'IZIN'].map(status => ({
      url: endpoint,
      method: 'post',
      contentType: 'text/plain;charset=utf-8',
      muteHttpExceptions: true,
      payload: JSON.stringify({ action: 'saveAttendance', token, date, attendances: [{ nis, kelas: 'X UJI', status_presensi: status }] })
    })));
    const results = responses.map(response => JSON.parse(response.getContentText()));
    if (results.length !== 2 || results.some(result => result.status !== 'success')) throw new Error('Kedua request bersamaan harus berhasil.');
    const logs = SpreadsheetRepository.logs().filter(row => row.nis === nis && row.tanggal === date);
    if (logs.length !== 1 || !['SAKIT', 'IZIN'].includes(logs[0].status_presensi)) throw new Error('Request bersamaan menggandakan atau merusak log presensi.');
    const loginResults = UrlFetchApp.fetchAll(Array.from({ length: 20 }, () => ({
      url: endpoint, method: 'post', contentType: 'text/plain;charset=utf-8', muteHttpExceptions: true,
      payload: JSON.stringify({ action: 'login', username: 'codex-concurrency-test', password: 'incorrect' })
    })));
    const attempts = Number(CacheService.getScriptCache().get(loginAttemptKey) || 0);
    if (loginResults.length !== 20 || attempts !== 10) throw new Error('Throttle login bersamaan kehilangan atau melebihi hitungan: ' + attempts);
    summary = { status: 'PASS', requests: results.length, finalLogCount: logs.length, finalStatus: logs[0].status_presensi, concurrentLoginAttempts: loginResults.length, throttleCount: attempts, date };
  } finally {
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    try {
      for (const [name, column] of [['LogPresensi', 2], ['PeringatanKasus', 1], ['PenyelesaianKasus', 2], ['Siswa_X', 2]]) {
        const sheet = ss.getSheetByName(name), rows = sheet.getDataRange().getValues();
        for (let i = rows.length - 1; i >= 1; i--) if (String(rows[i][column]) === nis) sheet.deleteRow(i + 1);
      }
    } finally { lock.releaseLock(); }
    properties.deleteProperty('SESSION_' + token);
    CacheService.getScriptCache().remove('SESSION_' + token);
    CacheService.getScriptCache().remove(loginAttemptKey);
  }
  console.log(JSON.stringify(summary));
  return summary;
}


function runCopyPerformanceProfile() {
  const copyId = '16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId() !== copyId) throw Error('Hanya spreadsheet TEST.');
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SPREADSHEET_ID') !== copyId) throw Error('Database TEST tidak cocok.');
  const token = Utilities.getUuid() + Utilities.getUuid();
  const nis = '995' + String(Date.now()).slice(-9);
  const students = ss.getSheetByName('Siswa_X');
  const profileDate = '2026-10-12';
  if (SpreadsheetRepository.students().some(s => s.nis === nis)) throw Error('NIS uji sudah ada.');
  students.appendRow([99999, 'X PERF', nis, 'SISWA UJI PERF', '', '', '']);
  props.setProperty('SESSION_' + token, JSON.stringify({ user: { id: 'TEST', username: 'test', role: 'ADMIN' }, expiresAt: Date.now() + 600000 }));
  const results = [];
  const invoke = (action, payload = {}, post = false) => {
    SpreadsheetRepository.spreadsheet = null;
    const started = Date.now();
    const result = JSON.parse(route({ ...payload, action, token, profile: 'true' }, post).getContent());
    return { result, routeMs: Date.now() - started };
  };
  try {
    DirectoryCache.invalidate();
    for (const params of [{ summary: 'true', fresh: 'true' }, { summary: 'true' }, { nis, tingkat: 'X', fresh: 'true' }, { nis, tingkat: 'X' }]) {
      const { result: response, routeMs } = invoke('getStudentDirectory', params);
      if (response.status !== 'success' || !response.profile) throw Error('Profil tidak tersedia.');
      results.push({ kind: params.summary ? 'summary' : 'detail', studentCount: response.data.students.length, fresh: !!params.fresh, routeMs, ...response.profile });
    }
    DirectoryCache.invalidate();
    for (const fresh of ['true', 'false']) {
      const { result: response, routeMs } = invoke('getAttendancePageData', { tingkat: 'X', date: profileDate, fresh });
      if (response.status !== 'success' || !response.profile || response.data.students.length === 0) throw Error('Profil presensi gabungan tidak tersedia.');
      results.push({ kind: 'attendance-page', fresh: fresh === 'true', routeMs, ...response.profile });
    }
    const { result: saved, routeMs } = invoke('saveAttendance', { date: profileDate, attendances: [{ nis, kelas: 'X PERF', status_presensi: 'SAKIT' }] }, true);
    if (saved.status !== 'success' || !saved.profile) throw Error('Profil simpan presensi tidak tersedia: ' + saved.message);
    results.push({ kind: 'attendance-save', routeMs, ...saved.profile });
  } finally {
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    try {
      for (const [sheetName, column] of [['LogPresensi', 2], ['PeringatanKasus', 1]]) {
        const target = ss.getSheetByName(sheetName), rows = target.getDataRange().getValues();
        for (let i = rows.length - 1; i >= 1; i--) if (String(rows[i][column]) === nis) target.deleteRow(i + 1);
      }
      const rows = students.getDataRange().getValues(); for (let i = rows.length - 1; i >= 1; i--) if (String(rows[i][2]) === nis) students.deleteRow(i + 1);
      DirectoryCache.invalidate();
    }
    finally { lock.releaseLock(); props.deleteProperty('SESSION_' + token); CacheService.getScriptCache().remove('SESSION_' + token); }
  }
  console.log(JSON.stringify({status:'PASS',results}));
  return results;
}

function runCopyMultiClassRegression() {
  const copyId='16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ';
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if (!ss || ss.getId()!==copyId) throw Error('Hanya spreadsheet TEST.');
  const props=PropertiesService.getScriptProperties();
  if(props.getProperty('SPREADSHEET_ID')!==copyId) throw Error('Database tidak cocok.');
  const endpoint='https://script.google.com/macros/s/AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q/exec';
  const pupils=['X','XI','XII'].map((level,i)=>({nis:'996'+String(Date.now()).slice(-8)+i,kelas:level+' QA',sheet:'Siswa_'+level}));
  const token=Utilities.getUuid()+Utilities.getUuid();
  const session=JSON.stringify({user:{id:'TEST',username:'test',role:'ADMIN'},expiresAt:Date.now()+600000});
  props.setProperty('SESSION_'+token,session);CacheService.getScriptCache().put('SESSION_'+token,session,600);
  let result;
  const inserted = new Set();
  try {
    for(const pupil of pupils){if(SpreadsheetRepository.students().some(s=>s.nis===pupil.nis))throw Error('NIS sudah ada.');pupil.token=Utilities.getUuid()+Utilities.getUuid();props.setProperty('SESSION_'+pupil.token,session);inserted.add(pupil.nis);ss.getSheetByName(pupil.sheet).appendRow([99999,pupil.kelas,pupil.nis,'SISWA QA MULTIKELAS','','','']);}
    const start=Date.now();
    const responses=UrlFetchApp.fetchAll(pupils.flatMap(pupil=>['SAKIT','IZIN'].map(status=>({url:endpoint,method:'post',contentType:'text/plain;charset=utf-8',muteHttpExceptions:true,payload:JSON.stringify({action:'saveAttendance',token:pupil.token,date:'2026-10-20',attendances:[{nis:pupil.nis,kelas:pupil.kelas,status_presensi:status}]})}))));
    const elapsedMs=Date.now()-start;
    const outcomes=responses.map(r=>JSON.parse(r.getContentText()));
    if(outcomes.some(r=>r.status!=='success'))throw Error('Request serentak gagal: '+JSON.stringify(outcomes.map(r=>({status:r.status,message:r.message}))));
    const logs=SpreadsheetRepository.logs();
    if(pupils.some(p=>logs.filter(l=>l.nis===p.nis&&l.tanggal==='2026-10-20').length!==1))throw Error('Duplikasi atau log hilang.');
    result={status:'PASS',classes:3,users:3,requests:6,finalLogs:3,elapsedMs};
  } finally {
    const lock=LockService.getScriptLock();lock.waitLock(30000);
    try {for(const [name,col] of [['LogPresensi',2],['PeringatanKasus',1],['PenyelesaianKasus',2],['Siswa_X',2],['Siswa_XI',2],['Siswa_XII',2]]) {const sheet=ss.getSheetByName(name),rows=sheet.getDataRange().getValues();for(let i=rows.length-1;i>=1;i--)if(pupils.some(p=>inserted.has(p.nis)&&String(rows[i][col])===p.nis))sheet.deleteRow(i+1);}DirectoryCache.invalidate();}
    finally{lock.releaseLock();for(const pupil of pupils)if(pupil.token){props.deleteProperty('SESSION_'+pupil.token);CacheService.getScriptCache().remove('SESSION_'+pupil.token);}props.deleteProperty('SESSION_'+token);CacheService.getScriptCache().remove('SESSION_'+token);}
  }
  console.log(JSON.stringify(result));return result;
}

function runCopyRetryRegression() {
  const copyId='16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ',ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss||ss.getId()!==copyId)throw Error('Hanya spreadsheet TEST.');
  const props=PropertiesService.getScriptProperties();if(props.getProperty('SPREADSHEET_ID')!==copyId)throw Error('Database tidak cocok.');
  const endpoint='https://script.google.com/macros/s/AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q/exec';
  const nis='997'+String(Date.now()).slice(-9),token=Utilities.getUuid()+Utilities.getUuid();
  if(SpreadsheetRepository.students().some(s=>s.nis===nis))throw Error('NIS sudah ada.');
  props.setProperty('SESSION_'+token,JSON.stringify({user:{id:'TEST',username:'test',role:'ADMIN'},expiresAt:Date.now()+600000}));
  const request=status=>JSON.parse(UrlFetchApp.fetch(endpoint,{method:'post',contentType:'text/plain;charset=utf-8',muteHttpExceptions:true,payload:JSON.stringify({action:'saveAttendance',token,date:'2026-10-20',attendances:[{nis,kelas:'X QA',status_presensi:status}]})}).getContentText());
  let result;
  try{
    ss.getSheetByName('Siswa_X').appendRow([99999,'X QA',nis,'SISWA QA RETRY','','','']);
    const start=Date.now();const first=request('SAKIT');if(first.status!=='success')throw Error('Simpan awal gagal.');
    if(SpreadsheetRepository.logs().filter(l=>l.nis===nis).length!==1)throw Error('Simpan awal tidak tercatat.');
    const retry=request('SAKIT');if(retry.status!=='success'||SpreadsheetRepository.logs().filter(l=>l.nis===nis).length!==1)throw Error('Retry menggandakan data.');
    if(request('HADIR').status!=='success'||SpreadsheetRepository.logs().some(l=>l.nis===nis))throw Error('Koreksi gagal.');
    result={status:'PASS',duplicateRetryNoDuplicate:true,correctionRemainingLogs:0,elapsedMs:Date.now()-start};
  }finally{
    const lock=LockService.getScriptLock();lock.waitLock(30000);
    try{for(const [name,col]of [['LogPresensi',2],['PeringatanKasus',1],['PenyelesaianKasus',2],['Siswa_X',2]]){const sheet=ss.getSheetByName(name),rows=sheet.getDataRange().getValues();for(let i=rows.length-1;i>=1;i--)if(String(rows[i][col])===nis)sheet.deleteRow(i+1);}DirectoryCache.invalidate();}
    finally{lock.releaseLock();props.deleteProperty('SESSION_'+token);CacheService.getScriptCache().remove('SESSION_'+token);}
  }
  console.log(JSON.stringify(result));return result;
}

function runCopyGauntletRegression() {
  const copyId = '16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ';
  const ss = SpreadsheetApp.getActiveSpreadsheet(), props = PropertiesService.getScriptProperties();
  if (ScriptApp.getScriptId() !== '1-NpiLFzPdn5d-NkuXVcv1A8Aijaux4eueJYT5gymCuPJM92zaKZ84fkH' || !ss || ss.getId() !== copyId || props.getProperty('SPREADSHEET_ID') !== copyId) throw Error('Hanya project dan spreadsheet TEST.');
  const base = '994' + String(Date.now()).slice(-8), pupils = [base + '1', base + '2'];
  if (SpreadsheetRepository.students().some(s => pupils.includes(s.nis))) throw Error('NIS uji sudah ada.');
  const token = Utilities.getUuid() + Utilities.getUuid(), checks = [];
  const check = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  const call = (action, payload = {}, post = false) => JSON.parse(route({ ...payload, action, token }, post).getContent());
  const save = (nis, date, status = 'SAKIT', extra = {}) => call('saveAttendance', { date, attendances: [{ nis, kelas: 'X GAUNTLET', status_presensi: status, ...extra }] }, true);
  try {
    props.setProperty('SESSION_' + token, JSON.stringify({ user: { id: 'TEST', username: 'test', nama: 'TEST', role: 'ADMIN' }, expiresAt: Date.now() + 600000 }));
    for (const nis of pupils) ss.getSheetByName('Siswa_X').appendRow([99999, 'X GAUNTLET', nis, 'SISWA UJI GAUNTLET', '', '', '']);
    const logs = ss.getSheetByName('LogPresensi');
    for (const date of ['2026-10-05', '2026-10-06']) logs.appendRow(['RAW-' + Utilities.getUuid(), date, pupils[0], 'SISWA UJI GAUNTLET', 'X GAUNTLET', ' sakit ', 'FALSE', '', '2026-10-08']);
    for (const nis of pupils) logs.appendRow(['INVALID-' + Utilities.getUuid(), '2026-10-00', nis, 'SISWA UJI GAUNTLET', 'X GAUNTLET', 'SAKIT', false, '', '2026-10-08']);
    for (const status of ['SAKIT', 'HADIR']) logs.appendRow(['DUP-' + Utilities.getUuid(), '2026-10-07', pupils[0], 'SISWA UJI GAUNTLET', 'X GAUNTLET', status, false, '', '2026-10-08']);
    DirectoryCache.invalidate();
    check(save(pupils[0], '2026-10-08').status === 'success', 'Simpan status legacy berhasil');
    let alerts = CaseController.list({ nis: pupils[0], academic_year: '2026-2027' });
    check(alerts.length === 1 && Number(alerts[0].total_hari_absen) === 3, 'Alert hitung 3 hari valid, status normal, HADIR terakhir');
    const summary = call('getStudentDirectory', { nis: pupils[0], tingkat: 'X', summary: 'true', fresh: 'true' });
    check(summary.status === 'success' && summary.data.students[0].totalSakit === 3, 'Direktori dan alert konsisten');
    for (const date of ['2026-10-05', '2026-10-06']) check(save(pupils[1], date).status === 'success', 'Simpan hari valid ' + date);
    check(CaseController.list({ nis: pupils[1], academic_year: '2026-2027' }).length === 0, 'Tanggal invalid tidak memicu alert');
    check(save(pupils[0], '2026-10-05').status === 'success', 'Simpan ulang boolean legacy');
    check(SpreadsheetRepository.logs().find(r => r.nis === pupils[0] && r.tanggal === '2026-10-05').ada_surat_dokter === false, 'FALSE tetap false');
    check(save(pupils[0], '2026-10-05', 'SAKIT', { ada_surat_dokter: 'false' }).status === 'error', 'String boolean ditolak');
    const alertId = alerts[0].id_peringatan, setupLock = LockService.getScriptLock();
    setupLock.waitLock(30000);
    try {
      const alertSheet = ss.getSheetByName('PeringatanKasus'), rows = alertSheet.getDataRange().getValues();
      const original = rows.findIndex(r => r[0] === alertId);
      if (original < 1) throw Error('Alert sintetis tidak ditemukan.');
      alertSheet.insertRowBefore(original + 1);
      try { alertSheet.getRange(original + 1, 1, 1, 8).setValues([['LEGACY-' + Utilities.getUuid(), pupils[0], 'SISWA UJI GAUNTLET', 'X GAUNTLET', 1, 3, 'AKTIF', '2026-10-05']]); }
      catch (error) { alertSheet.deleteRow(original + 1); throw error; }
      ss.getSheetByName('PenyelesaianKasus').appendRow(['RES-' + Utilities.getUuid(), alertId, pupils[0], 'SISWA UJI GAUNTLET', 'X GAUNTLET', 'https://example.invalid/TEST_GAUNTLET', 'ARSIP SINTETIS', 'TEST', '2026-10-08']);
    } finally { setupLock.releaseLock(); }
    check(save(pupils[0], '2026-10-08').status === 'success', 'Sinkronisasi arsip partial berhasil');
    check(!CaseController.list({ nis: pupils[0], academic_year: '2026-2027' }).some(r => r.status_peringatan === 'AKTIF'), 'Arsip menutup duplikat aktif tanpa bergantung urutan');
    check(save(pupils[0], '2026-10-08', 'HADIR').status === 'success', 'Koreksi setelah arsip berhasil');
    check(CaseController.list({ nis: pupils[0], academic_year: '2026-2027' }).some(r => r.id_peringatan === alertId && r.status_peringatan === 'SELESAI'), 'Koreksi mempertahankan alert arsip');
    check(call('resolveCase', { id_peringatan: alertId, nis: pupils[0] }, true).status === 'success', 'Retry resolusi memakai arsip tanpa upload');
    check(CaseController.completed({ nis: pupils[0] }).length === 1, 'Tidak ada duplikat arsip');
  } finally {
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    try {
      for (const [name, column] of [['LogPresensi', 2], ['PeringatanKasus', 1], ['PenyelesaianKasus', 2], ['Siswa_X', 2]]) {
        const sheet = ss.getSheetByName(name), rows = sheet.getDataRange().getValues();
        for (let i = rows.length - 1; i >= 1; i--) if (pupils.includes(String(rows[i][column]))) sheet.deleteRow(i + 1);
      }
      DirectoryCache.invalidate();
    } finally { lock.releaseLock(); props.deleteProperty('SESSION_' + token); CacheService.getScriptCache().remove('SESSION_' + token); }
  }
  const result = { status: 'PASS', checks: checks.length, details: checks, scope: 'GAS route langsung, data sintetis TEST, bukan HTTP/browser' };
  console.log(JSON.stringify(result));
  return result;
}
