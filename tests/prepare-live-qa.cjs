const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),configDir=path.join(root,'handoff/gas-test');
const config=JSON.parse(fs.readFileSync(path.join(configDir,'.clasp.json'),'utf8'));
assert.equal(config.scriptId,'1-NpiLFzPdn5d-NkuXVcv1A8Aijaux4eueJYT5gymCuPJM92zaKZ84fkH');
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'presensi-live-qa-'));
for(const file of ['.clasp.json','appsscript.json'])fs.copyFileSync(path.join(configDir,file),path.join(stage,file));
let code=fs.readFileSync(path.join(root,'clasp_backend/Kode.js'),'utf8');
const auth="    if (!AuthController.session(p.token)) return ResponseHelper.error('Sesi berakhir. Silakan login.', 'UNAUTHORIZED');";
assert.equal(code.split(auth).length,2,'Auth boundary changed; inspect before generating QA.');
const guard="ScriptApp.getScriptId() === '1-NpiLFzPdn5d-NkuXVcv1A8Aijaux4eueJYT5gymCuPJM92zaKZ84fkH' && PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') === '16-zovxOikdR-qJPcuA_pZJb13U_Ka0sFnCVGE8U7YRQ'";
code=code.replace(auth,auth+`
    if (p.action === 'runTestSuite' || p.action === 'getQaResult') {
      if (!(${guard})) throw Error('Hanya script TEST.');
      const suites={uiPrepare:prepareCopyUiGauntlet,uiCleanup:cleanupCopyUiGauntlet,gauntlet:runCopyGauntletRegression,profile:runCopyPerformanceProfile,regression:runCopyRegression,formats:runCopyFileFormatRegression,retry:runCopyRetryRegression,multiclass:runCopyMultiClassRegression};
      if(!post && p.action==='getQaResult' && p.suite==='timeoutBarrier') return ResponseHelper.success(JSON.parse(PropertiesService.getScriptProperties().getProperty('QA_TIMEOUT_ACTIVE')||'null'));
      if(!suites[p.suite]) throw Error('Suite tidak dikenal.');
      const props=PropertiesService.getScriptProperties(),key='QA_RESULT_'+p.suite;
      if(!post && p.action==='getQaResult') return ResponseHelper.success(JSON.parse(props.getProperty(key)||'null'));
      if(!post || p.action!=='runTestSuite')throw Error('Metode tidak cocok.');
      props.setProperty(key,JSON.stringify({status:'RUNNING',started:Date.now()}));
      try{const result=suites[p.suite]();props.setProperty(key,JSON.stringify({status:'PASS',result,finished:Date.now()}));return ResponseHelper.success(result);}
      catch(error){props.setProperty(key,JSON.stringify({status:'ERROR',message:error.message,finished:Date.now()}));throw error;}
    }`);
assert(code.includes('      return fn(p);\n    } finally {'));
code=code.replace('      return fn(p);\n    } finally {',`      const qaPupils=JSON.parse(PropertiesService.getScriptProperties().getProperty('QA_UI_GAUNTLET')||'[]');
      if(p.action==='saveAttendance' && p.test_delay_ms && (${guard}) && p.attendances?.length && p.attendances.every(student=>qaPupils.some(pupil=>pupil.nis===String(student.nis)))) {
        PropertiesService.getScriptProperties().setProperty('QA_TIMEOUT_ACTIVE',JSON.stringify({nis:p.attendances[0].nis,started:Date.now()}));
        Utilities.sleep(Math.min(5000,Math.max(0,Number(p.test_delay_ms)||0)));
        PropertiesService.getScriptProperties().deleteProperty('QA_TIMEOUT_ACTIVE');
      }
      const response=fn(p);
      if(p.test_response_loss && (${guard}) && p.attendances?.every(s=>String(s.nis).startsWith('997') || JSON.parse(PropertiesService.getScriptProperties().getProperty('QA_UI_GAUNTLET')||'[]').some(pupil=>pupil.nis===String(s.nis)))) throw Error('SIMULATED_RESPONSE_LOSS_AFTER_COMMIT');
      return response;
    } finally {`);
code += `
function prepareCopyUiGauntlet() {
  if (!(${guard})) throw Error('Hanya TEST.');
  const props=PropertiesService.getScriptProperties(), old=props.getProperty('QA_UI_GAUNTLET');
  if(old) return {status:'PASS',pupils:JSON.parse(old),reused:true};
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const base='993'+String(Date.now()).slice(-8),pupils=['A','B'].map((suffix,index)=>({nis:base+index,kelas:'X GAUNTLET '+suffix,nama:'SISWA UJI GAUNTLET '+suffix}));
    if(SpreadsheetRepository.students().some(student=>pupils.some(pupil=>pupil.nis===student.nis)))throw Error('NIS sudah ada.');
    props.setProperty('QA_UI_GAUNTLET',JSON.stringify(pupils));
    for(const pupil of pupils)SpreadsheetRepository.getSheet('Siswa_X').appendRow([99999,pupil.kelas,pupil.nis,pupil.nama,'','','']);
    DirectoryCache.invalidate();
    return {status:'PASS',pupils};
  }finally{lock.releaseLock();}
}
function cleanupCopyUiGauntlet() {
  if (!(${guard})) throw Error('Hanya TEST.');
  const props=PropertiesService.getScriptProperties(),pupils=JSON.parse(props.getProperty('QA_UI_GAUNTLET')||'[]'),nis=new Set(pupils.map(pupil=>pupil.nis)),links=[];
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    for(const [name,column]of [['LogPresensi',2],['PeringatanKasus',1],['PenyelesaianKasus',2],['Siswa_X',2],['BankKasus',2]]){
      const sheet=SpreadsheetRepository.getSheet(name),rows=sheet.getDataRange().getValues();
      for(let i=rows.length-1;i>=1;i--)if(nis.has(String(rows[i][column]))){if(name==='LogPresensi'&&rows[i][7])links.push(rows[i][7]);sheet.deleteRow(i+1);}
    }
    FileService.cleanupManagedLinks(links,[CONFIG.SHEETS.LOG_PRESENSI,CONFIG.SHEETS.PENYELESAIAN_KASUS],'BK_Bukti_Izin');
    DirectoryCache.invalidate();props.deleteProperty('QA_UI_GAUNTLET');
    return {status:'PASS',cleaned:pupils.length};
  }finally{lock.releaseLock();}
}
`;
fs.writeFileSync(path.join(stage,'Kode.js'),code);
fs.copyFileSync(path.join(root,'tests/copy-regression.gs'),path.join(stage,'ManualTest.js'));
if(process.argv.includes('--ui')){
 const dest=path.join(root,'src/app/qa-test/page.tsx'),fixture=fs.readFileSync(path.join(__dirname,'live-qa-page.fixture'),'utf8');
 if(fs.existsSync(dest))assert.equal(fs.readFileSync(dest,'utf8'),fixture,'Existing QA page has other edits.');
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,fixture);
}
console.log(JSON.stringify({stage,testOnly:true,ui:process.argv.includes('--ui')}));
