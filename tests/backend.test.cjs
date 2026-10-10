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
let uploads = 0,
  failUpload = false,
  failLogWrite = false,
  failAlertWrite = false,
  failResolutionArchive = false,
  failNthUpload = 0,
  locked = false,
  lastFolder,
  nextFileId = 1;
const driveFiles = new Map();
const props = {}, cache = {};
const sheet = name => ({
  getDataRange: () => ({
    getValues: () => tables[name].map(r => [...r])
  }),
  getLastRow: () => tables[name].length,
  getRange: (row, col, n = 1, m = 1) => ({
    setValues: values => {
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
      waitLock: () => locked = true,
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
          createFile: blob => {
            if (failUpload || failNthUpload && --failNthUpload === 0) throw Error('offline');
            uploads++;
            const id = String(nextFileId++);
            driveFiles.set(id, { url: `https://private/${id}`, trashed: false, name: blob.n });
            return {
              getId: () => id,
              getUrl: () => `https://private/${id}`
            };
          }
        })
      };
    }
    ,
    getFileById: id => ({ setTrashed: value => { const file = driveFiles.get(id); if (file) file.trashed = value; } })
  },
  ContentService: {
    MimeType: {
      JSON: 'json'
    },
    createTextOutput: s => ({
      setMimeType: () => JSON.parse(s)
    })
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
  assert.equal(tables.LogPresensi.find(r => r[1] === '2026-10-07')[7], 'https://private/1');
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
    fileBase64: 'JVBERi0xLjQK'
  }, true).status, 'success');
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
  for (const key of Object.keys(props)) delete props[key];
  for (const key of Object.keys(cache)) delete cache[key];
  props.AUTH_SALT = 'transaction-test-salt';
  uploads = 0; failUpload = false; failLogWrite = false; failAlertWrite = false;
  failResolutionArchive = false; failNthUpload = 0; locked = false; lastFolder = undefined;
  nextFileId = 1; driveFiles.clear();
  token = call('login', { username: 'admin', password: 'secret' }, true).data.token;
}
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
  const cold=call('getStudentDirectory',params);assert.equal(cold.profile.cache,'miss');assert.equal(cold.profile.sheetReads,5);
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
  const keys=Object.keys(cache).filter(k=>k.startsWith('DIRECTORY_'));keys.forEach(k=>delete cache[k]);assert.equal(call('getStudentDirectory',params).profile.cache,'miss');
});
if (failed) process.exitCode = 1;
