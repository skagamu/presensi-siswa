const assert = require('node:assert/strict'),
  vm = require('node:vm'),
  fs = require('node:fs'),
  crypto = require('node:crypto');
const tables = {
  Users: [['id', 'username', 'password', 'name', 'role'], ['1', 'admin', 'secret', 'BK', 'ADMIN']],
  Siswa_X: [['id', 'kelas', 'nis', 'nama'], ['1', 'X A', '001', 'Ani'], ['2', 'X A', '002', 'Budi']],
  Siswa_XI: [['id']],
  Siswa_XII: [['id']],
  LogPresensi: [['id', 'date', 'nis', 'name', 'class', 'status', 'doctor', 'link', 'time']],
  PeringatanKasus: [['id', 'nis', 'name', 'class', 'level', 'count', 'status', 'time']],
  PenyelesaianKasus: [['id', 'alert', 'nis', 'name', 'class', 'link', 'note', 'staff', 'time']],
  BankKasus: [['id', 'date', 'nis', 'name', 'class', 'case', 'time']]
};
const initialTables = JSON.parse(JSON.stringify(tables));
const sheetReads = {};
let attendanceWrites = 0;
let uploads = 0,
  failUpload = false,
  failLogWrite = false,
  failAlertWrite = false,
  failResolutionArchive = false,
  failNthUpload = 0,
  locked = false,
  writerInFlight = false,
  lockBarrierWaits = 0,
  lastFolder,
  nextFileId = 1;
const driveFiles = new Map();
const props = { SPREADSHEET_ID: 'TEST_SHEET' }, cache = {};
const sheet = name => ({
  getDataRange: () => ({
    getValues: () => { assert.equal(writerInFlight, false, 'sheet read must wait until the simulated writer releases its lock'); sheetReads[name] = (sheetReads[name] || 0) + 1; return tables[name].map(r => [...r]); }
  }),
  getLastRow: () => tables[name].length,
  getRange: (row, col, n = 1, m = 1) => ({
    getValues: () => { assert.equal(writerInFlight, false, 'sheet read must wait until the simulated writer releases its lock'); sheetReads[name] = (sheetReads[name] || 0) + 1; return tables[name].slice(row - 1, row - 1 + n).map(r => r.slice(col - 1, col - 1 + m)); },
    setValues: values => {
      if (name === 'LogPresensi') attendanceWrites++;
      if (name === 'LogPresensi' && failLogWrite || name === 'PeringatanKasus' && failAlertWrite || name === 'PenyelesaianKasus' && failResolutionArchive) throw Error('injected sheet write failure');
      values.forEach((v, i) => {
        tables[name][row - 1 + i] ??= [];
        v.forEach((x, j) => tables[name][row - 1 + i][col - 1 + j] = x);
      });
    },
    setValue: v => {
      if (name === 'PeringatanKasus' && failAlertWrite) throw Error('injected alert write failure');
      tables[name][row - 1][col - 1] = v;
    }
  }),
  appendRow: r => tables[name].push(r),
  insertRowBefore: row => tables[name].splice(row - 1, 0, []),
  deleteRow: row => tables[name].splice(row - 1, 1),
  clearContents: () => {
    tables[name] = [];
  }
});
const fixedNow = Date.parse('2026-10-09T12:00:00Z');
const FixedDate = Object.assign(class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-09T12:00:00Z'])); } }, { now: () => fixedNow });
const ctx = vm.createContext({
  Date: FixedDate,
  console,
  SpreadsheetApp: {
    openById: () => ({
      getSheetByName: sheet
    })
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: k => props[k] || null,
      setProperty: (k, v) => props[k] = v,
      deleteProperty: k => delete props[k],
      getProperties: () => ({
        ...props
      })
    })
  },
  CacheService: {
    getScriptCache: () => ({
      get: k => cache[k] || null,
      remove: k => delete cache[k],
      put: (k, v) => cache[k] = v
    })
  },
  LockService: {
    getScriptLock: () => ({
      waitLock: () => { if (writerInFlight) { tables.LogPresensi.push(['ATT-LATE', '2026-10-08', '001', 'Ani', 'X A', 'SAKIT', false, 'https://drive.google.com/file/d/committed/view', '2026-10-09 12:00:00']); writerInFlight = false; lockBarrierWaits++; } locked = true; },
      releaseLock: () => locked = false
    })
  },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: {
      SHA_256: 'sha256'
    },
    Charset: {
      UTF_8: 'utf8'
    },
    computeDigest: (a, s) => [...crypto.createHash('sha256').update(s).digest()],
    formatDate: (d, z, f) => {
      const s = (d instanceof Date || d instanceof FixedDate ? d : new FixedDate(d)).toISOString();
      return f === 'yyyy-MM-dd' ? s.slice(0, 10) : f === 'yyyy-MM' ? s.slice(0, 7) : s.slice(0, 19).replace('T', ' ');
    },
    base64Decode: s => [...Buffer.from(s, 'base64')],
    newBlob: (b, m, n) => ({
      b,
      m,
      n,
      getBytes: () => [...Buffer.from(typeof b === "string" ? b : b)]
    })
  },
  DriveApp: {
    getFoldersByName(name) {
      lastFolder = name;
      return {
        hasNext: () => true,
        next: () => ({
          getId: () => name,
          createFile: blob => {
            if (failUpload || failNthUpload && --failNthUpload === 0) throw Error('offline');
            uploads++;
            const id = String(nextFileId++);
            driveFiles.set(id, { url: `https://drive.google.com/file/d/${id}/view`, trashed: false, name: blob.n, parentId: name });
            return {
              getId: () => id,
              getUrl: () => `https://drive.google.com/file/d/${id}/view`
            };
          }
        })
      };
    }
    ,
    getFileById: id => ({
      getParents: () => { let hasParent = true; return { hasNext: () => hasParent, next: () => { hasParent = false; return { getId: () => driveFiles.get(id)?.parentId }; } }; },
      setTrashed: value => { const file = driveFiles.get(id); if (file) file.trashed = value; }
    })
  },
  ContentService: {
    MimeType: {
      JSON: 'json'
    },
    createTextOutput: s => {
      const body = JSON.parse(s);
      Object.defineProperty(body, 'getContent', { value: () => JSON.stringify(body) });
      Object.defineProperty(body, 'setMimeType', { value: () => body });
      return body;
    }
  }
});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../clasp_backend/Kode.js'), 'utf8'), ctx);
const call = (action, p = {}, post = false) => post ? ctx.doPost({
  postData: {
    contents: JSON.stringify({
      action,
      ...p
    })
  }
}) : ctx.doGet({
  parameter: {
    action,
    ...p
  }
});
let failed = 0;
let token;
function test(name, fn) {
  try {
    fn();
    console.log('PASS', name);
  } catch (e) {
    failed++;
    console.error('FAIL', name, e.message);
  }
}
test('admin endpoints reject missing tokens', () => assert.equal(call('getStudents').status, 'error'));
test('login creates random server session and migrates plaintext', () => {
  const r = call('login', {
    username: 'ADMIN',
    password: 'secret'
  }, true);
  assert.equal(r.status, 'success');
  token = r.data.token;
  assert(!token.startsWith('TKN-'));
  assert(tables.Users[1][2].startsWith('sha256:'));
  assert.equal(call('getStudents', {
    token
  }).status, 'success');
});
test('legacy backend rollback needs the pre-release password snapshot', () => {
  const migratedPassword = tables.Users[1][2];
  const originalPassword = initialTables.Users[1][2];
  assert.match(migratedPassword, /^sha256:/);
  assert.notEqual(migratedPassword, originalPassword);
  assert.notEqual(String(migratedPassword).trim(), String('secret').trim(), 'old plaintext comparison cannot accept a migrated value');
  assert.equal(String(originalPassword).trim(), String('secret').trim(), 'restoring the Users password snapshot restores legacy login');
});
test('missing spreadsheet configuration fails closed', () => {
  const current = props.SPREADSHEET_ID;
  delete props.SPREADSHEET_ID;
  const response = call('getStudents', { token });
  props.SPREADSHEET_ID = current;
  assert.equal(response.status, 'error');
  assert.match(response.message, /SPREADSHEET_ID/);
});
const save = (date, status = 'SAKIT', extra = {}) => call('saveAttendance', {
  token,
  date,
  attendances: [{
    nis: '001',
    kelas: 'X A',
    nama: 'spoof',
    status_presensi: status,
    ...extra
  }]
}, true);
function seedActiveAlert() {
  for (const date of ['2026-10-05', '2026-10-06', '2026-10-07']) {
    assert.equal(save(date).status, 'success');
  }
  return tables.PeringatanKasus.find(row => row[0] && row[6] === 'AKTIF');
}
test('third unique sick day creates one alert without double counting', () => {
  for (const d of ['2026-10-05', '2026-10-06', '2026-10-07']) assert.equal(save(d).status, 'success');
  assert.equal(tables.PeringatanKasus.length, 2);
  assert.equal(tables.PeringatanKasus[1][5], 3);
  save('2026-10-07');
  assert.equal(tables.PeringatanKasus.length, 2);
});
test('uploads once and preserves attachment on repeat', () => {
  assert.equal(save('2026-10-07', 'SAKIT', {
    fileBase64: 'JVBERi0xLjQK',
    fileName: 'a.pdf'
  }).status, 'success');
  assert.equal(uploads, 1);
  save('2026-10-07');
  const link = tables.LogPresensi.find(r => r[1] === '2026-10-07')[7];
  assert.equal(link, 'https://drive.google.com/file/d/1/view');
  assert.equal(save('2026-10-07', 'SAKIT', { link_bukti_izin: 'https://attacker.example/file' }).status, 'error');
  assert.equal(tables.LogPresensi.find(r => r[1] === '2026-10-07')[7], link);
  assert.equal(save('2026-10-07', 'SAKIT', { link_bukti_izin: '' }).status, 'success');
  assert.equal(tables.LogPresensi.find(r => r[1] === '2026-10-07')[7], '');
  assert.equal(driveFiles.get('1').trashed, true);
});
test('logs schema and NIS filter use actual columns', () => {
  const r = call('getLogPresensi', {
    token,
    nis: '001',
    academic_year: '2026/2027'
  });
  assert.equal(r.data.length, 3);
  assert.equal(r.data[0].nis, '001');
  assert.equal(r.data[0].tanggal, '2026-10-05');
});
test('HADIR correction removes absence and obsolete active alert', () => {
  save('2026-10-07', 'HADIR');
  assert.equal(tables.LogPresensi.filter(r => r[0]).length, 3);
  assert.equal(tables.PeringatanKasus.filter(r => r[0]).length, 1);
});
test('invalid student date status rejected without writes', () => {
  for (const p of [{
    date: '2026-02-30'
  }, {
    date: '2026-10-10'
  }, {
    attendances: [{
      nis: 'bad',
      status_presensi: 'SAKIT'
    }]
  }, {
    attendances: [{
      nis: '001',
      kelas: 'other',
      status_presensi: 'SAKIT'
    }]
  }, {
    attendances: [{
      nis: '001',
      status_presensi: 'BOGUS'
    }]
  }]) assert.equal(call('saveAttendance', {
    token,
    date: '2026-10-08',
    attendances: [{
      nis: '001',
      status_presensi: 'SAKIT'
    }],
    ...p
  }, true).status, 'error');
  assert.equal(locked, false);
});
test('resolve validates alert and file before closing', () => {
  save('2026-10-08');
  const id = tables.PeringatanKasus[1][0];
  assert.equal(call('resolveCase', {
    token,
    id_peringatan: id,
    nis: '001'
  }, true).status, 'error');
  failUpload = true;
  assert.equal(call('resolveCase', {
    token,
    id_peringatan: id,
    nis: '001',
    fileName: 'a.pdf',
    fileBase64: 'JVBERi0xLjQK'
  }, true).status, 'error');
  failUpload = false;
  assert.equal(tables.PeringatanKasus[1][6], 'AKTIF');
  assert.equal(call('resolveCase', {
    token,
    id_peringatan: id,
    nis: '001',
    fileName: 'a.pdf',
    fileBase64: 'JVBERi0xLjQK',
    catatan_konseling: '=HYPERLINK("https://bad")'
  }, true).status, 'success');
  assert.equal(tables.PenyelesaianKasus.at(-1)[6], "'=HYPERLINK(\"https://bad\")");
  assert.equal(call('getPenyelesaianKasus', {
    token,
    nis: '001'
  }).data[0].id_peringatan, id);
  save('2026-10-08');
  assert.equal(tables.PeringatanKasus.length, 2);
});
test('directory and recaps retain correct date keys', () => {
  assert.equal(call('getStudentDirectory', {
    token,
    academic_year: '2026/2027'
  }).data.students.length, 2);
  assert.equal(call('getRekapRentang', {
    token,
    start_date: '2026-10-05',
    end_date: '2026-10-31'
  }).data[0].dailyLogs['2026-10-05'], 'SAKIT');
  assert.equal(call('getRekapBulanan', {
    token,
    month: '2026-10'
  }).data[0].dailyLogs['5'], 'SAKIT');
});
test('sessions survive cache eviction until absolute expiration', () => {
  delete cache['SESSION_' + token];
  assert.equal(call('getStudents', {
    token
  }).status, 'success');
});
test('school calendar uses weekday monthly denominator', () => {
  const r = call('getDashboardStats', {
    token,
    date: '2026-10-05'
  });
  assert.equal(r.data.chart.weekly.length, 5);
  const july = r.data.chart.monthly.find(m => m.label === 'Jul 2026');
  assert(july);
});
test('absolute session expiry rejects cached token', () => {
  const oldToken = token;
  const raw = JSON.parse(props['SESSION_' + oldToken]);
  raw.expiresAt = fixedNow - 1;
  props['SESSION_' + oldToken] = JSON.stringify(raw);
  delete cache['SESSION_' + oldToken];
  assert.equal(call('getStudents', { token: oldToken }).code, 'UNAUTHORIZED');
  cache['LOGIN_admin'] = null;
  token = call('login', { username: 'admin', password: 'secret' }, true).data.token;
});
test('thresholds count unique school days within academic year', () => {
  resetBackendFixture();
  for (const date of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12']) {
    assert.equal(save(date).status, 'success');
  }
  const current = tables.PeringatanKasus.filter(row => row[0]);
  assert.equal(current.length, 3);
  assert.equal(current[2][4], 2);
  assert.equal(current[2][5], 6);
  assert.equal(save('2025-10-06').status, 'success');
  assert.equal(tables.PeringatanKasus.filter(row => row[0]).length, 3);
  assert.equal(save('2026-10-12', 'HADIR').status, 'success');
  assert.equal(tables.PeringatanKasus.filter(row => row[0] && row[6] === 'AKTIF').length, 1);
  assert.equal(tables.PeringatanKasus.find(row => row[0] && row[6] === 'AKTIF')[4], 1);
  assert.equal(tables.PeringatanKasus.find(row => row[0] && row[6] === 'AKTIF')[5], 5);
});
test('oversized and unsupported resolution files never mutate alert', () => {
  resetBackendFixture();
  const alert = seedActiveAlert();
  for (const [fileName, fileBase64] of [['a.exe', 'JVBERi0xLjQK'], ['a.pdf', 'A'.repeat(13981020)]]) assert.equal(call('resolveCase', {
    token,
    id_peringatan: alert[0],
    nis: '001',
    fileName,
    fileBase64
  }, true).status, 'error');
  assert.equal(alert[6], 'AKTIF');
});
test('all supported evidence formats pass signature validation and spoofed files fail', () => {
  resetBackendFixture();
  const samples = [
    ['pdf', 'JVBERi0xLjQK'],
    ['docx', 'UEsDBA=='],
    ['xlsx', 'UEsDBA=='],
    ['jpg', '/9j/AA=='],
    ['png', 'iVBORw0KGgo=']
  ];
  samples.forEach(([extension, fileBase64], index) => assert.equal(save(`2026-10-0${index + 5}`, 'SAKIT', {
    fileName: `evidence.${extension}`,
    fileBase64
  }).status, 'success'));
  assert.equal(uploads, samples.length);
  assert.equal(save('2026-10-12', 'SAKIT', {
    fileName: 'spoof.pdf',
    fileBase64: 'UEsDBA=='
  }).status, 'error');
  assert.equal(uploads, samples.length);
  assert(!tables.LogPresensi.some(row => row[1] === '2026-10-12'));
});
test('dashboard deduplicates student day and weekends are not school attendance', () => {
  resetBackendFixture();
  assert.equal(save('2026-10-05').status, 'success');
  tables.LogPresensi.push([...tables.LogPresensi.find(r => r[1] === '2026-10-05')]);
  assert.equal(call('getDashboardStats', {
    token,
    date: '2026-10-05'
  }).data.absenHariIni, 1);
  assert.equal(call('getDashboardStats', {
    token,
    date: '2026-10-10'
  }).data.hadirHariIni, 0);
});
test('reconciliation removes duplicate active level when resolved history exists', () => {
  resetBackendFixture();
  const resolved = seedActiveAlert();
  resolved[6] = 'SELESAI';
  tables.PenyelesaianKasus.push(['RES-OLD', resolved[0], '001', 'Ani', 'X A', 'https://private/old', '', 'BK', '2026-10-07']);
  tables.PeringatanKasus.push(['OLD-DUP', '001', 'Ani', 'X A', 1, 3, 'AKTIF', '2026-10-05']);
  save('2026-10-08');
  assert.equal(tables.PeringatanKasus.filter(r => r[1] === '001' && r[4] === 1 && r[6] === 'AKTIF').length, 0);
});
test('extension spoof cannot upload and resolution actor comes from session', () => {
  resetBackendFixture();
  const seeded = seedActiveAlert();
  assert.equal(save('2026-10-08', 'SAKIT', {
    fileName: 'fake.pdf',
    fileBase64: 'aGVsbG8='
  }).status, 'error');
  const alert = seeded;
  assert.equal(call('resolveCase', {
    token,
    id_peringatan: alert[0],
    nis: '001',
    fileName: 'real.pdf',
    fileBase64: 'JVBERi0xLjQK',
    ditangani_oleh: 'attacker'
  }, true).status, 'success');
  const result = call('getPenyelesaianKasus', {
    token,
    nis: '001'
  }).data.at(-1);
  assert.equal(result.ditangani_oleh, 'BK');
  assert(result.link_pdf_drive);
});
test('failed logins throttle valid password after ten failures', () => {
  cache['LOGIN_admin'] = null;
  for (let i = 0; i < 10; i++) call('login', {
    username: 'ADMIN',
    password: 'wrong'
  }, true);
  assert.equal(call('login', {
    username: 'admin',
    password: 'secret'
  }, true).status, 'error');
  cache['LOGIN_admin'] = null;
  token = call('login', { username: 'admin', password: 'secret' }, true).data.token;
});
test('attendance reports committed logs when alert reconciliation fails and retry repairs it', () => {
  resetBackendFixture();
  seedActiveAlert();
  failAlertWrite = true;
  const first = save('2026-10-08');
  failAlertWrite = false;
  assert.equal(first.status, 'success');
  assert.equal(first.data.alertSyncPending, true);
  assert.match(first.message, /Presensi tersimpan/);
  assert.equal(tables.LogPresensi.filter(r => r[1] === '2026-10-08').length, 1);
  const retry = save('2026-10-08');
  assert.equal(retry.data.alertSyncPending, false);
  assert.equal(tables.LogPresensi.filter(r => r[1] === '2026-10-08').length, 1);
});
test('bank case retry is idempotent and user text is stored as literal text', () => {
  resetBackendFixture();
  const payload = { token, date: '2026-10-08', pelanggaran: '=IMPORTXML("https://bad")', request_id: 'stable-request-1', students: [{ nis: '001', kelas: 'X A' }] };
  const first = call('saveBankKasus', payload, true);
  assert.equal(first.status, 'success');
  assert.equal(tables.BankKasus.length, 2);
  assert.equal(tables.BankKasus[0][7], 'request_id');
  assert.equal(tables.BankKasus[1][5], "'=IMPORTXML(\"https://bad\")");
  assert.equal(tables.BankKasus[1][7], payload.request_id);
  assert.equal(call('saveBankKasus', payload, true).status, 'success');
  assert.equal(tables.BankKasus.length, 2);
});
test('alerts update cumulative count and current priority excludes retrospective prior years', () => {
  resetBackendFixture();
  for (const date of ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']) {
    assert.equal(save(date).status, 'success');
  }
  const active = tables.PeringatanKasus.find(r => r[6] === 'AKTIF' && r[4] === 3);
  assert.equal(active[5], 9);
  save('2026-10-08');
  assert.equal(tables.PeringatanKasus.find(r => r[6] === 'AKTIF' && r[4] === 3)[5], 9);
  for (const d of ['2025-10-06', '2025-10-07']) save(d);
  assert(!call('getPriorityAlerts', {
    token
  }).data.some(r => r.idPeringatan.includes('2025-2026')));
});
test('configured upload prefix isolates files in test folders', () => {
  resetBackendFixture();
  props.FILE_FOLDER_PREFIX = 'TEST_PRESENSI_';
  assert.equal(save('2026-10-08', 'SAKIT', {
    fileName: 'test.pdf',
    fileBase64: 'JVBERi0xLjQK'
  }).status, 'success');
  assert.equal(lastFolder, 'TEST_PRESENSI_BK_Bukti_Izin');
});
test('login throttle keys cannot be used as session tokens', () => { assert.equal(call('getStudents', { token: 'LOGIN_admin' }).status, 'error'); });
test('removed parent endpoints cannot expose data', () => {
  for (const action of ['getParentStudents','getParentAttendance','getParentAccessCode']) {
    assert.equal(call(action,{nis:'001',date:'2026-10'}).status,'error');
    assert.equal(call(action,{token,nis:'001',date:'2026-10'},action==='getParentAccessCode').status,'error');
  }
});
test('directory summary returns only grouped current-year pupil counts', () => {
  resetBackendFixture();
  tables.LogPresensi.push(
    ['SUM-1','2026-10-20','002','Budi','X A',' sakit ','FALSE','','2026-10-20'],
    ['SUM-2','2026-10-20','002','Budi','X A','SAKIT',false,'','2026-10-20'],
    ['SUM-3','2026-10-21','002','Budi','X A','ALPHA',false,'','2026-10-21'],
    ['SUM-4','2026-10-24','002','Budi','X A','IZIN',false,'','2026-10-24'],
    ['SUM-5','2025-07-21','002','Budi','X A','SAKIT',false,'','2025-07-21'],
    ['SUM-6','2026-10-22','002','Budi','X A','ALPHA',false,'','2026-10-22'],
    ['SUM-7','2026-10-22','002','Budi','X A','HADIR',false,'','2026-10-22'],
    ['SUM-8','2026-10-00','002','Budi','X A','ALPHA',false,'','2026-10-00']);
  tables.BankKasus.push(['SUM-BK','2026-10-20','002','Budi','X A','Terlambat','2026-10-20']);
  tables.BankKasus.push(['','2026-10-20','002','Budi','X A','Incomplete row','2026-10-20']);
  const response=call('getStudentDirectory',{token,summary:'true',academic_year:'2026/2027'});
  assert.deepEqual(Object.keys(response.data),['students']);
  const pupil=response.data.students.find(s=>s.nis==='002');
  assert.equal(pupil.totalSakit,1);assert.equal(pupil.totalAlpha,1);assert.equal(pupil.totalIzin,0);assert.equal(pupil.totalPelanggaran,1);assert.equal(pupil.tingkat,'X');
});
test('directory detail returns only requested pupil and scoped rows', () => {
  resetBackendFixture();
  tables.LogPresensi.push(['DET-1','2026-10-20','002','Budi','X A','SAKIT',false,'','2026-10-20']);
  const response=call('getStudentDirectory',{token,nis:'002',academic_year:'2026/2027'});
  assert.equal(response.data.students.length,1);assert.equal(response.data.students[0].nis,'002');
  for(const key of ['logs','kasus','penyelesaian'])assert(response.data[key].every(row=>row.nis==='002'));
});
test('raw sheet status and doctor boolean normalize without string truthiness', () => {
  resetBackendFixture();
  tables.LogPresensi.push(['RAW-1','2026-10-20','002','Budi','X A',' sakit ','FALSE','','2026-10-20']);
  const rows=call('getLogPresensi',{token,nis:'002',date:'2026-10'}).data;
  assert.equal(rows[0].status_presensi,'SAKIT');assert.equal(rows[0].ada_surat_dokter,false);
});
test('logout revokes cached and persisted session', () => { assert.equal(call('logout', { token }, true).status, 'success'); assert.equal(call('getStudents', { token }).status, 'error'); token = null; });
test('unchanged rows require no writes and one changed row writes only that row', () => {
  vm.runInContext(`(() => {
    const original = [['header', 'date'], ['one', new Date('2026-10-05')], ['two', 'same']];
    const writes = [];
    const target = { getRange: (...args) => ({ setValues: values => writes.push({ args, values }) }) };
    SpreadsheetRepository.replace(target, original.map(r => [...r]), 2, original);
    if (writes.length) throw Error('Unchanged rows were written');
    const changed = original.map(r => [...r]); changed[2][1] = 'updated';
    SpreadsheetRepository.replace(target, changed, 2, original);
    if (writes.length !== 1 || writes[0].args.join(',') !== '3,1,1,2') throw Error('Whole sheet rewritten');
  })()`, ctx);
});

function resetBackendFixture() {
  for (const name of Object.keys(tables)) tables[name] = initialTables[name].map(row => [...row]);
  for (const name of Object.keys(sheetReads)) delete sheetReads[name];
  for (const key of Object.keys(props)) delete props[key];
  for (const key of Object.keys(cache)) delete cache[key];
  props.AUTH_SALT = 'transaction-test-salt'; props.SPREADSHEET_ID = 'TEST_SHEET';
  uploads = 0; failUpload = false; failLogWrite = false; failAlertWrite = false;
  failResolutionArchive = false; failNthUpload = 0; locked = false; lastFolder = undefined;
  writerInFlight = false; lockBarrierWaits = 0;
  nextFileId = 1; driveFiles.clear();
  token = call('login', { username: 'admin', password: 'secret' }, true).data.token;
}
test('single-class attendance save reads only that grade roster', () => {
  resetBackendFixture();
  assert.equal(save('2026-10-08').status, 'success');
  assert.equal(sheetReads.Siswa_X, 1);
  assert.equal(sheetReads.Siswa_XI || 0, 0);
  assert.equal(sheetReads.Siswa_XII || 0, 0);
});
test('attendance cannot save a student against another grade roster', () => {
  resetBackendFixture();
  tables.Siswa_XI.push(['3', 'XI A', '003', 'Cici']);
  const response = call('saveAttendance', { token, date: '2026-10-08', attendances: [{ nis: '001', kelas: 'XI A', status_presensi: 'SAKIT' }] }, true);
  assert.equal(response.status, 'error');
  assert.equal(tables.LogPresensi.length, 1);
  assert.equal(sheetReads.Siswa_XI, 1);
  assert.equal(sheetReads.Siswa_X || 0, 0);
});
test('attendance page combines and caches one authorized grade/date payload', () => {
  resetBackendFixture();
  const params = { token, tingkat: 'X', date: '2026-10-08', profile: 'true' };
  const cold = call('getAttendancePageData', params);
  assert.equal(cold.status, 'success');
  assert.equal(cold.profile.cache, 'miss');
  assert.equal(cold.data.students.length, 2);
  assert.deepEqual(cold.data.logs, []);
  assert.equal(cold.profile.sheetReads, 2);
  const warm = call('getAttendancePageData', params);
  assert.equal(warm.profile.cache, 'hit');
  assert.equal(warm.profile.sheetReads, 0);
  assert.deepEqual(warm.data, cold.data);
  const weekend = call('getAttendancePageData', { ...params, date: '2026-10-10', profile: 'true' });
  assert.equal(weekend.data.logs.length, 0);
  assert.equal(weekend.profile.sheetReads, 1);
  assert.equal(call('getAttendancePageData', { ...params, tingkat: 'INVALID' }).status, 'error');
  assert.equal(call('getAttendancePageData', { tingkat: 'X', date: '2026-10-08' }).code, 'UNAUTHORIZED');
  assert.equal(save('2026-10-08').status, 'success');
  const afterWrite = call('getAttendancePageData', params);
  assert.equal(afterWrite.profile.cache, 'miss');
  assert.equal(afterWrite.data.logs.length, 1);
  assert.equal(afterWrite.data.logs[0].nis, '001');
});
test('fresh attendance read waits for in-flight save and returns the committed row', () => {
  resetBackendFixture();
  writerInFlight = true;
  const response = call('getAttendancePageData', { token, tingkat: 'X', date: '2026-10-08', fresh: 'true', profile: 'true' });
  assert.equal(response.status, 'success');
  assert.equal(lockBarrierWaits, 1);
  assert.equal(response.profile.lockWaitMs, 0);
  assert.equal(response.data.logs.length, 1);
  assert.equal(response.data.logs[0].status_presensi, 'SAKIT');
  assert.equal(response.data.logs[0].link_bukti_izin, 'https://drive.google.com/file/d/committed/view');
  assert.equal(locked, false, 'fresh read must release the shared write lock');
});
test('fresh attendance read fails closed when the writer lock cannot be acquired', () => {
  resetBackendFixture();
  const before = { ...sheetReads };
  const original = ctx.LockService.getScriptLock;
  ctx.LockService.getScriptLock = () => ({ waitLock: () => { throw Error('Script lock timed out'); }, releaseLock: () => {} });
  try {
    const response = call('getAttendancePageData', { token, tingkat: 'X', date: '2026-10-08', fresh: 'true' });
    assert.equal(response.status, 'error');
    assert.equal(response.message, 'Script lock timed out');
    assert.deepEqual(sheetReads, before, 'must not return a potentially stale snapshot without the lock');
  } finally { ctx.LockService.getScriptLock = original; }
});
test('attendance save profile measures lock, attendance and alert work', () => {
  resetBackendFixture();
  const response = call('saveAttendance', {
    token, profile: 'true', date: '2026-10-08',
    attendances: [{ nis: '001', kelas: 'X A', status_presensi: 'SAKIT' }]
  }, true);
  assert.equal(response.status, 'success');
  for (const metric of ['lockWaitMs', 'attendanceReadMs', 'attendanceWriteMs', 'alertReadMs', 'alertWriteMs', 'alertSyncMs']) {
    assert.equal(typeof response.profile[metric], 'number', metric);
  }
  assert(response.profile.sheetReads >= 3);
});
function withFailureReset(run) {
  try { run(); }
  finally { failUpload = false; failLogWrite = false; failAlertWrite = false; failResolutionArchive = false; failNthUpload = 0; locked = false; }
}
test('resolve retry repairs a failed alert update without duplicate archive or upload', () => {
  resetBackendFixture();
  withFailureReset(() => {
  const alert = seedActiveAlert();
  const beforeArchives = tables.PenyelesaianKasus.length, beforeUploads = uploads;
  failAlertWrite = true;
  assert.equal(call('resolveCase', { token, id_peringatan: alert[0], nis: '001', fileName: 'resolve.pdf', fileBase64: 'JVBERi0xLjQK' }, true).status, 'error');
  failAlertWrite = false;
  assert.equal(tables.PenyelesaianKasus.length, beforeArchives + 1);
  const retry = call('resolveCase', { token, id_peringatan: alert[0], nis: '001', fileName: 'resolve.pdf', fileBase64: 'JVBERi0xLjQK' }, true);
  assert.equal(retry.status, 'success');
  assert.equal(tables.PenyelesaianKasus.length, beforeArchives + 1);
  assert.equal(uploads, beforeUploads + 1);
  assert.equal(alert[6], 'SELESAI');
  });
});
test('failed resolution archive trashes its staged upload', () => {
  resetBackendFixture();
  withFailureReset(() => {
  const alert = seedActiveAlert();
  const before = tables.PenyelesaianKasus.length, beforeUploads = uploads;
  failResolutionArchive = true;
  assert.equal(call('resolveCase', { token, id_peringatan: alert[0], nis: '001', fileName: 'resolve.pdf', fileBase64: 'JVBERi0xLjQK' }, true).status, 'error');
  failResolutionArchive = false;
  assert.equal(tables.PenyelesaianKasus.length, before);
  assert.equal(alert[6], 'AKTIF');
  assert.equal(uploads, beforeUploads + 1);
  assert.equal(driveFiles.get(String(nextFileId - 1)).trashed, true);
  });
});
test('failed attendance log write cleans only its staged upload', () => {
  resetBackendFixture();
  withFailureReset(() => {
  token = call('login', { username: 'admin', password: 'secret' }, true).data.token;
  const before = uploads;
  failLogWrite = true;
  const response = save('2026-10-08', 'SAKIT', { fileName: 'orphan.pdf', fileBase64: 'JVBERi0xLjQK' });
  failLogWrite = false;
  assert.equal(response.status, 'error');
  assert.equal(uploads, before + 1);
  assert.equal(driveFiles.get(String(nextFileId - 1)).trashed, true);
  assert(!tables.LogPresensi.some(r => r[1] === '2026-10-08'));
  });
});
test('partial attendance uploads are cleaned when a later file fails', () => {
  resetBackendFixture();
  withFailureReset(() => {
  token = call('login', { username: 'admin', password: 'secret' }, true).data.token;
  const before = uploads;
  failNthUpload = 2;
  const response = call('saveAttendance', { token, date: '2026-10-08', attendances: [
    { nis: '001', kelas: 'X A', status_presensi: 'SAKIT', fileName: 'one.pdf', fileBase64: 'JVBERi0xLjQK' },
    { nis: '002', kelas: 'X A', status_presensi: 'SAKIT', fileName: 'two.pdf', fileBase64: 'JVBERi0xLjQK' }
  ] }, true);
  failNthUpload = 0;
  assert.equal(response.status, 'error');
  assert.equal(uploads, before + 1);
  assert.equal(driveFiles.get(String(nextFileId - 1)).trashed, true);
  assert(!tables.LogPresensi.some(r => r[1] === '2026-10-08'));
  });
});
test('directory cache is scoped, authorized, bypassable and invalidated on writes', () => {
  resetBackendFixture();
  const params={token,summary:'true',profile:'true'};
  const cold=call('getStudentDirectory',params);assert.equal(cold.profile.cache,'miss');assert.equal(cold.profile.sheetReads,1);
  const warm=call('getStudentDirectory',params);assert.equal(warm.profile.cache,'hit');assert.equal(warm.profile.sheetReads,0);assert.deepEqual(warm.data,cold.data);
  assert.equal(call('getStudentDirectory',{summary:'true',profile:'true'}).code,'UNAUTHORIZED');
  const detail=call('getStudentDirectory',{token,nis:'001',tingkat:'X',profile:'true'});assert.equal(detail.profile.sheetReads,4);assert.equal(detail.data.students.length,1);
  assert.equal(call('getStudentDirectory',{token,nis:'002',tingkat:'X',profile:'true'}).profile.cache,'miss');
  tables.LogPresensi.push(['DIRECT','2026-10-06','001','Ani','X A','IZIN',false,'','']);
  assert.equal(call('getStudentDirectory',params).data.students[0].totalIzin,0);
  assert.equal(call('getStudentDirectory',{...params,fresh:'true'}).data.students[0].totalIzin,1);
  assert.equal(save('2026-10-07','SAKIT').status,'success');
  const after=call('getStudentDirectory',params);assert.equal(after.profile.cache,'miss');assert.equal(after.data.students[0].totalSakit,1);
  props.SPREADSHEET_ID='OTHER_DATABASE';assert.equal(call('getStudentDirectory',params).profile.cache,'miss');delete props.SPREADSHEET_ID;
  assert.equal(call('getStudentDirectory',params).status,'error');props.SPREADSHEET_ID='TEST_SHEET';
  const keys=Object.keys(cache).filter(k=>k.startsWith('DIRECTORY_'));keys.forEach(k=>delete cache[k]);assert.equal(call('getStudentDirectory',params).profile.cache,'miss');
});
test('normalized legacy statuses generate same threshold as directory',()=>{
  resetBackendFixture();
  for(const d of ['2026-10-05','2026-10-06'])tables.LogPresensi.push(['RAW-'+d,d,'001','Ani','X A',' sakit ',false,'','']);
  assert.equal(save('2026-10-07').status,'success');
  assert.equal(call('getStudentDirectory',{token,summary:'true'}).data.students[0].totalSakit,3);
  assert.equal(tables.PeringatanKasus.filter(r=>r[6]==='AKTIF').length,1);
});
test('invalid raw date does not contribute to threshold',()=>{
  resetBackendFixture();
  tables.LogPresensi.push(['INVALID','2026-10-00','001','Ani','X A','SAKIT',false,'','']);
  for(const d of ['2026-10-05','2026-10-06'])assert.equal(save(d).status,'success');
  assert.equal(tables.PeringatanKasus.filter(r=>r[6]==='AKTIF').length,0);
});
test('committed resolution archive survives attendance correction and remains retryable',()=>{
  resetBackendFixture();
  for(const d of ['2026-10-05','2026-10-06','2026-10-07'])save(d);
  const alertId=tables.PeringatanKasus.find(r=>r[6]==='AKTIF')[0];
  const payload={token,id_peringatan:alertId,nis:'001',fileName:'resolve.pdf',fileBase64:'JVBERi0xLjQK'};
  failAlertWrite=true;
  assert.equal(call('resolveCase',payload,true).status,'error');
  failAlertWrite=false;
  assert.equal(tables.PenyelesaianKasus.length,2);
  const beforeUploads=uploads;
  assert.equal(save('2026-10-07','HADIR').status,'success');
  assert(tables.PeringatanKasus.some(r=>r[0]===alertId),'Reconcile deleted alert referenced by archive');
  assert.equal(call('resolveCase',payload,true).status,'success');
  assert.equal(tables.PenyelesaianKasus.length,2);
  assert.equal(uploads,beforeUploads);
  assert.equal(tables.PeringatanKasus.find(r=>r[0]===alertId)[6],'SELESAI');
});
test('latest HADIR row cancels older absence for threshold',()=>{
  resetBackendFixture();
  tables.LogPresensi.push(['ABS','2026-10-05','001','Ani','X A','SAKIT',false,'',''],['PRESENT','2026-10-05','001','Ani','X A','HADIR',false,'','']);
  for(const d of ['2026-10-06','2026-10-07'])save(d);
  assert.equal(call('getStudentDirectory',{token,summary:'true'}).data.students[0].totalSakit,2);
  assert.equal(tables.PeringatanKasus.filter(r=>r[6]==='AKTIF').length,0);
});
test('resave preserves stored FALSE and rejects boolean strings', () => {
  resetBackendFixture();
  tables.LogPresensi.push(['RAW','2026-10-05','001','Ani','X A','SAKIT','FALSE','','']);
  assert.equal(save('2026-10-05').status,'success');
  assert.equal(call('getLogPresensi',{token,nis:'001'}).data[0].ada_surat_dokter,false);
  assert.equal(save('2026-10-05','SAKIT',{ada_surat_dokter:'false'}).status,'error');
});
test('profile includes cache invalidation before returning from save', () => {
  resetBackendFixture();
  let now = fixedNow;
  const previousNow = ctx.Date.now;
  ctx.Date.now = () => now;
  const original = vm.runInContext('DirectoryCache.invalidate',ctx);
  vm.runInContext('DirectoryCache',ctx).invalidate = () => { now += 37; original.call(vm.runInContext('DirectoryCache',ctx)); };
  try {
    const response=call('saveAttendance',{token,profile:'true',date:'2026-10-05',attendances:[{nis:'001',kelas:'X A',status_presensi:'SAKIT'}]},true);
    assert.equal(response.status,'success');
    assert.equal(response.profile.gasMs,37);
  } finally {
    ctx.Date.now=previousNow;
    vm.runInContext('DirectoryCache',ctx).invalidate=original;
  }
});
test('archived duplicate closes earlier active same-level duplicate',()=>{
  resetBackendFixture();
  for(const d of ['2026-10-05','2026-10-06','2026-10-07'])save(d);
  const alertId=tables.PeringatanKasus.find(r=>r[6]==='AKTIF')[0];
  tables.PeringatanKasus.splice(1,0,['LEGACY-DUP','001','Ani','X A',1,3,'AKTIF','2026-10-05']);
  tables.PenyelesaianKasus.push(['RES',alertId,'001','Ani','X A','https://private/file','','BK','2026-10-08']);
  assert.equal(save('2026-10-08').status,'success');
  assert(tables.PeringatanKasus.some(r=>r[0]===alertId && r[6]==='SELESAI'));
  assert.equal(tables.PeringatanKasus.filter(r=>r[1]==='001' && Number(r[4])===1 && r[6]==='AKTIF').length,0);
});
test('gauntlet copy runner verifies findings and cleans all its synthetic rows', () => {
  resetBackendFixture();
  const copyId='16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ';
  props.SPREADSHEET_ID=copyId;
  ctx.ScriptApp={getScriptId:()=> '1-NpiLFzPdn5d-NkuXVcv1A8Aijaux4eueJYT5gymCuPJM92zaKZ84fkH'};
  ctx.SpreadsheetApp.getActiveSpreadsheet=()=>({getId:()=>copyId,getSheetByName:sheet});
  const nonemptyTables=()=>JSON.stringify(Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.filter(row=>row.some(value=>value!==''))])));
  const before=nonemptyTables();
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'copy-regression.gs'),'utf8'),ctx);
  const result=vm.runInContext('runCopyGauntletRegression()',ctx);
  assert.equal(result.status,'PASS');
  assert(result.checks>=14);
  assert.equal(nonemptyTables(),before,'Runner must leave all sheet data unchanged after cleanup');
  assert.equal(Object.keys(props).filter(k=>k.startsWith('SESSION_')).length,1,'Only original logged-in session remains');
});
test('completed alert suppresses same-year same-level active duplicates immediately', () => {
  resetBackendFixture();
  const alert=seedActiveAlert();
  tables.PeringatanKasus.push(['DUP','001','Ani','X A',1,3,'AKTIF','2026-10-05']);
  tables.PeringatanKasus.push(['ALERT-001-2026-2027-2','001','Ani','X A',2,6,'AKTIF','2026-10-08']);
  tables.PeringatanKasus.push(['ALERT-001-2025-2026-2','001','Ani','X A',2,6,'SELESAI','2025-10-08']);
  assert.equal(call('resolveCase',{token,id_peringatan:alert[0],nis:'001',fileName:'proof.pdf',fileBase64:'JVBERi0xLjQK'},true).status,'success');
  const active=call('getPeringatanKasus',{token,status_peringatan:'AKTIF'}).data;
  assert.equal(active.length,1);
  assert.equal(active[0].tingkat_kumulatif,2);
  assert.equal(call('getPeringatanKasus',{token,nis:'001'}).data.length,4,'History still retains all records');
});
test('attendance without released files skips cleanup reference reads', () => {
  resetBackendFixture();
  for(const name of Object.keys(sheetReads))delete sheetReads[name];
  assert.equal(save('2026-10-05').status,'success');
  assert.equal(sheetReads.LogPresensi,1,'Log sheet must be read only for attendance');
  assert.equal(sheetReads.PenyelesaianKasus||0,0,'No files means no archive reference scan');
});
test('identical save preserves last changed timestamp while correction updates it', () => {
  resetBackendFixture();
  assert.equal(save('2026-10-05').status, 'success');
  tables.LogPresensi[1][8] = '2026-10-05 07:00:00';
  tables.LogPresensi[1][1] = new ctx.Date('2026-10-05T00:00:00Z');
  const original = JSON.stringify(tables.LogPresensi);
  const beforeWrites = attendanceWrites;
  assert.equal(save('2026-10-05').status, 'success');
  assert.equal(JSON.stringify(tables.LogPresensi), original);
  assert.equal(attendanceWrites, beforeWrites, 'unchanged Date cells must not be rewritten');
  assert.equal(call('saveAttendance', {token, date:'2026-10-05', attendances:[{nis:'001',kelas:'X A',status_presensi:'IZIN'}]}, true).status, 'success');
  assert.notEqual(tables.LogPresensi[1][8], '2026-10-05 07:00:00');
});
if (failed) process.exitCode = 1;
