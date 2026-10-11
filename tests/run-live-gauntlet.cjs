// QA transport for the fixed TEST deployment; never retries POST.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const endpoint='https://script.google.com/macros/s/AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q/exec';
const sessionPath=path.join(os.tmpdir(),'presensi-gauntlet-session.json');
async function request(payload,post=true){
 const response=await fetch(post?endpoint:endpoint+'?'+new URLSearchParams(payload),{...(post?{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error('HTTP '+response.status);
 return response.json();
}
(async()=>{
 const suites=process.argv.slice(2);if(!suites.length)throw Error('Supply suite name.');
 let token=fs.existsSync(sessionPath)?JSON.parse(fs.readFileSync(sessionPath,'utf8')).token:null;
 if(!token){
  if(!process.env.PRESENSI_TEST_USERNAME||!process.env.PRESENSI_TEST_PASSWORD)throw Error('TEST login environment variables required.');
  const login=await request({action:'login',username:process.env.PRESENSI_TEST_USERNAME,password:process.env.PRESENSI_TEST_PASSWORD});
  if(login.status!=='success'||!login.data?.token)throw Error(login.message||'Login failed');
  token=login.data.token;fs.writeFileSync(sessionPath,JSON.stringify({token}),{mode:0o600});
 }
 for(const suite of suites){
  if(suite==='verifyPresensi'){
   const prepared=await request({action:'getQaResult',suite:'uiPrepare',token},false);
   const pupil=prepared.data?.result?.pupils?.[0];if(!pupil)throw Error('UI fixture unavailable');
   const logs=await request({action:'getLogPresensi',token,nis:pupil.nis,date:'2026-10-09'},false);
   if(logs.status!=='success'||logs.data.length!==1||logs.data[0].status_presensi!=='IZIN'||!/^https:\/\/drive\.google\.com\/file\/d\//.test(logs.data[0].link_bukti_izin))throw Error('UI save/class-switch evidence did not persist exactly once');
   console.log(JSON.stringify({suite,status:'PASS',logs:1,statusPresensi:'IZIN',proofStored:true}));continue;
  }
  if(suite==='verifyBank'){
   const prepared=await request({action:'getQaResult',suite:'uiPrepare',token},false);
   const pupil=prepared.data?.result?.pupils?.[0];if(!pupil)throw Error('UI fixture unavailable');
   const cases=await request({action:'getBankKasus',token,nis:pupil.nis},false);
   if(cases.status!=='success'||cases.data.length!==1||cases.data[0].jenis_pelanggaran!=='TEST GAUNTLET - kasus sintetis'||cases.data[0].tanggal!=='2026-10-09')throw Error('Bank UI save did not persist exactly one expected case');
   console.log(JSON.stringify({suite,status:'PASS',cases:1}));continue;
  }
  if(suite==='loss'){
   const prepared=await request({action:'getQaResult',suite:'uiPrepare',token},false);
   const pupil=prepared.data?.result?.pupils?.[1];if(!pupil)throw Error('UI fixture unavailable');
   const payload={action:'saveAttendance',token,date:'2026-10-12',attendances:[{nis:pupil.nis,kelas:pupil.kelas,status_presensi:'SAKIT'}]};
   const lost=await request({...payload,test_response_loss:true});
   if(lost.status!=='error'||lost.message!=='SIMULATED_RESPONSE_LOSS_AFTER_COMMIT')throw Error('Expected injected post-commit reply failure');
   const read=()=>request({action:'getLogPresensi',token,nis:pupil.nis,date:'2026-10-12'},false);
   const initial=await read();if(initial.status!=='success'||initial.data.length!==1)throw Error('Initial commit missing');
   const retried=await request(payload);if(retried.status!=='success')throw Error('Retry failed');
   const after=await read();if(after.data.length!==1||after.data[0].id_presensi!==initial.data[0].id_presensi)throw Error('Retry duplicated or replaced committed attendance');
   const corrected=await request({...payload,attendances:[{...payload.attendances[0],status_presensi:'HADIR'}]});
   if(corrected.status!=='success'||(await read()).data.length!==0)throw Error('Correction failed');
   console.log(JSON.stringify({suite,status:'PASS',simulatedPostCommitReplyFailure:true,retryDuplicateLogs:0,remainingAfterCorrection:0}));continue;
  }
  if(suite==='verifyClean'){
   const prepared=await request({action:'getQaResult',suite:'uiPrepare',token},false);
   const pupils=prepared.data?.result?.pupils;if(!pupils)throw Error('UI fixture evidence unavailable');
   for(const pupil of pupils){
    for(const action of ['getLogPresensi','getBankKasus','getPeringatanKasus','getPenyelesaianKasus']){
     const response=await request({action,token,nis:pupil.nis},false);
     if(response.status!=='success'||response.data.length!==0)throw Error('Synthetic data remains in '+action);
    }
    const roster=await request({action:'getSiswa',token,tingkat:'X',kelas:pupil.kelas},false);
    if(roster.status!=='success'||roster.data.length!==0)throw Error('Synthetic roster remains');
   }
   console.log(JSON.stringify({suite,status:'PASS',pupils:pupils.length,checks:pupils.length*5}));continue;
  }
  if(suite==='verifyQaRemoved'){
   for(const [action,post]of [['getQaResult',false],['runTestSuite',true]]){
    const response=await request({action,suite:'gauntlet',token},post);
    if(response.status!=='error'||response.message!=='Action tidak dikenali.')throw Error('Temporary QA action still exposed: '+action);
   }
   console.log(JSON.stringify({suite,status:'PASS',temporaryQaActionsRejected:2}));continue;
  }
  if(suite==='logout'){try{await request({action:'logout',token});}finally{fs.rmSync(sessionPath,{force:true});}console.log(JSON.stringify({suite,status:'PASS'}));continue;}
  if(!['gauntlet','regression','formats','retry','multiclass','profile','uiPrepare','uiCleanup'].includes(suite))throw Error('Unknown suite');
  let result;
  try{result=await request({action:'runTestSuite',suite,token});}
  catch(error){
   // Reply may be lost after commit; read the stored outcome instead of running again.
   for(let attempt=0;attempt<3;attempt++){
    await new Promise(resolve=>setTimeout(resolve,750));
    try{const saved=await request({action:'getQaResult',suite,token},false);if(saved.data?.status==='PASS'){result={status:'success',data:saved.data.result};break;}if(saved.data?.status==='ERROR')throw Error(saved.data.message);}
    catch(readError){if(attempt===2)throw Error(error.message+'; outcome unavailable: '+readError.message);}
   }
   if(!result)throw error;
  }
  console.log(JSON.stringify({suite,...result}));
  if(result.status!=='success')throw Error(result.message||'Suite failed');
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
