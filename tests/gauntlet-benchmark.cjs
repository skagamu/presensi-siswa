const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const baseline=process.argv[2];
if(!baseline)throw Error('Supply the saved baseline Kode.js path.');
const dates=Array.from({length:30},(_,i)=>'2026-09-'+String(i+1).padStart(2,'0')).filter(date=>![0,6].includes(new Date(date).getUTCDay()));
const pupils=Array.from({length:500},(_,i)=>({nis:String(i+1),nama:'Siswa '+i,kelas:i<30?'X UJI':'X LAIN'}));
const logs=pupils.flatMap(s=>dates.map(date=>['ATT',date,s.nis,s.nama,s.kelas,'SAKIT',false,'','2026-09-30']));
const alerts=[['id','nis','nama','kelas','level','count','status','timestamp'],...pupils.flatMap(s=>[1,2,3,4].map(level=>['ALERT-'+s.nis+'-2026-2027-'+level,s.nis,s.nama,s.kelas,level,dates.length,'AKTIF','2026-09-30']))];
function run(file){
 const c=vm.createContext({console,Date,Utilities:{formatDate:d=>d.toISOString().slice(0,10)},pupils:pupils.slice(0,30),logs,alerts});
 vm.runInContext(fs.readFileSync(file,'utf8'),c);
 vm.runInContext("SpreadsheetRepository.getSheet=()=>({});SpreadsheetRepository.readSheet=()=>alerts.map(row=>[...row]);SpreadsheetRepository.readRows=()=>[['archive']];SpreadsheetRepository.replace=(sheet,result)=>globalThis.output=result;",c);
 const times=[];
 for(let i=0;i<8;i++){const started=performance.now();vm.runInContext("AlertService.reconcile(pupils,logs,'2026-09-30','2026-09-30')",c);if(i)times.push(performance.now()-started);}
 return {medianMs:times.sort((a,b)=>a-b)[3],output:JSON.stringify(c.output)};
}
const a=run(baseline),b=run('clasp_backend/Kode.js');
assert.equal(b.output,a.output,'Candidate changed valid-data reconciliation output');
console.log(JSON.stringify({students:500,savedClass:30,logs:logs.length,alerts:alerts.length-1,equalOutput:true,medianLocalCpuMs:{baseline:Math.round(a.medianMs*100)/100,candidate:Math.round(b.medianMs*100)/100},note:'CPU only; excludes actual Google Sheets, CacheService, lock and network latency'}));
