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
    check(bankRows.some(row => row[7] === bankRequestId && row[5] === "'=1+1"), 'Teks formula harus disimpan sebagai literal dan ID operasi tercatat.');
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
  const endpoint = 'https://script.google.com/macros/s/AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q/exec';
  const token = Utilities.getUuid() + Utilities.getUuid();
  props.setProperty('SESSION_' + token, JSON.stringify({ user: { id: 'TEST', username: 'test', role: 'ADMIN' }, expiresAt: Date.now() + 600000 }));
  const student = SpreadsheetRepository.students()[0];
  const results = [];
  try {
    for (const params of [{ summary: 'true', fresh: 'true' }, { summary: 'true' }, { nis: student.nis, tingkat: student.tingkat, fresh: 'true' }, { nis: student.nis, tingkat: student.tingkat }]) {
      const start = Date.now();
      const query = Object.entries({ action: 'getStudentDirectory', profile: 'true', ...params, token }).map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
      const response = JSON.parse(UrlFetchApp.fetch(endpoint + '?' + query).getContentText());
      if (response.status !== 'success' || !response.profile) throw Error('Profil tidak tersedia.');
      results.push({ kind: params.summary ? 'summary' : 'detail', fresh: !!params.fresh, httpMs: Date.now()-start, ...response.profile });
    }
  } finally { props.deleteProperty('SESSION_' + token); CacheService.getScriptCache().remove('SESSION_' + token); }
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
  const request=(status,loseResponse)=>JSON.parse(UrlFetchApp.fetch(endpoint,{method:'post',contentType:'text/plain;charset=utf-8',muteHttpExceptions:true,payload:JSON.stringify({action:'saveAttendance',token,date:'2026-10-20',test_response_loss:!!loseResponse,attendances:[{nis,kelas:'X QA',status_presensi:status}]})}).getContentText());
  let result;
  try{
    ss.getSheetByName('Siswa_X').appendRow([99999,'X QA',nis,'SISWA QA RETRY','','','']);
    const start=Date.now();const lost=request('SAKIT',true);if(lost.status!=='error')throw Error('Fault response tidak aktif.');
    if(SpreadsheetRepository.logs().filter(l=>l.nis===nis).length!==1)throw Error('Commit awal tidak tersimpan.');
    const retry=request('SAKIT',false);if(retry.status!=='success'||SpreadsheetRepository.logs().filter(l=>l.nis===nis).length!==1)throw Error('Retry menggandakan data.');
    if(request('HADIR',false).status!=='success'||SpreadsheetRepository.logs().some(l=>l.nis===nis))throw Error('Koreksi gagal.');
    result={status:'PASS',responseLostAfterCommit:true,retryDuplicates:0,correctionRemainingLogs:0,elapsedMs:Date.now()-start};
  }finally{
    const lock=LockService.getScriptLock();lock.waitLock(30000);
    try{for(const [name,col]of [['LogPresensi',2],['PeringatanKasus',1],['PenyelesaianKasus',2],['Siswa_X',2]]){const sheet=ss.getSheetByName(name),rows=sheet.getDataRange().getValues();for(let i=rows.length-1;i>=1;i--)if(String(rows[i][col])===nis)sheet.deleteRow(i+1);}DirectoryCache.invalidate();}
    finally{lock.releaseLock();props.deleteProperty('SESSION_'+token);CacheService.getScriptCache().remove('SESSION_'+token);}
  }
  console.log(JSON.stringify(result));return result;
}
