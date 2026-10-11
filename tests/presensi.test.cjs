const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const states = [], refs = [], effects = [];
let si = 0, ri = 0, ei = 0, jobs = [], tree;
const calls = [], saves = [], saveResponses = [], proofReads = [];
const students = [{nis:'001',nama:'Ani',kelas:'X A'},{nis:'002',nama:'Budi',kelas:'X B'}];
const reportData = {exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/lib/reportData.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(require,reportData,reportData.exports);
const react = {
  useState(initial) { const i=si++; if (!(i in states)) states[i]=typeof initial==='function'?initial():initial; return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]; },
  useRef(initial) { return refs[ri++] ||= {current:initial}; },
  useEffect(fn,deps) { const i=ei++,old=effects[i]; if (!old || deps.some((v,j)=>v!==old.deps[j])) { old?.cleanup?.(); effects[i]={deps}; jobs.push(()=>effects[i].cleanup=fn()); } },
};
const jsx = (type,props)=>({type,props});
const ctx = {exports:{},Date,console,require(name) {
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name==='@/lib/date')return {todayWib:()=> '2026-10-07'};
  if(name==='@/lib/reportData')return reportData.exports;
  if(name==='@/lib/api')return {
    getAttendancePageData:(tingkat,date,fresh)=>new Promise(resolve=>calls.push({tingkat,date,fresh,resolve})),
    saveAttendance:async(date,rows)=>{saves.push({date,rows});return saveResponses.shift()||{status:'success'};},
  };
  if(name==='sonner')return {toast:{error(){},success(){},info(){}}};
  if(name==='@/lib/fileUpload')return {validateFile:()=>({valid:true}),fileToBase64:()=>new Promise(resolve=>proofReads.push(resolve))};
  return new Proxy({}, {get:(_,key)=>key});
}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${process.env.PAGE_SOURCE_ROOT || '.'}/src/app/presensi/page.tsx`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,ctx);
function render(){si=ri=ei=0;tree=ctx.exports.default();const pending=jobs;jobs=[];pending.forEach(f=>f());}
async function settle(){for(let i=0;i<6;i++){await Promise.resolve();render();}}
function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}}
function hasText(node,text){if(node===text)return true;if(!node||typeof node!=='object')return false;return [node.props?.children].flat(Infinity).some(child=>hasText(child,text));}
const saveButton=()=>find(tree,n=>n.type==='Button'&&n.props.size==='lg');
const dateInput=()=>find(tree,n=>n.type==='input'&&n.props.type==='date');
const removeProof=()=>find(tree,n=>n.type==='button'&&n.props['aria-label']==='Hapus bukti Ani');
(async()=>{
 render();await settle();assert.equal(calls.length,1);assert.equal(calls[0].date,'2026-10-07');assert.equal(saveButton().props.disabled,true);
 calls[0].resolve({status:'success',data:{students,logs:[{nis:'001',kelas:'X A',tanggal:'2026-10-07',status_presensi:'SAKIT',ada_surat_dokter:true,link_bukti_izin:'https://private/bukti'}]}});await settle();
 find(tree,n=>n.type==='Select'&&n.props.value==='X A').props.onValueChange('X B');await settle();assert.equal(calls.length,1);find(tree,n=>n.type==='Select'&&n.props.value==='X B').props.onValueChange('X A');await settle();
 const originalProof = states[10];
 const openProof = () => find(tree,n=>n.type==='Button'&&n.props.size==='sm'&&(hasText(n,'Bukti Ada')||hasText(n,'+ Bukti'))).props.onClick();
 const chooseProof = name => find(tree,n=>n.type==='Input'&&n.props.id==='file-bukti').props.onChange({target:{files:[{name}]}});
 const submitProof = () => find(tree,n=>n.type==='Button'&&hasText(n,'Simpan Bukti')).props.onClick();
 openProof();render();chooseProof('cancel.pdf');render();const cancelledRead=submitProof();
 find(tree,n=>n.type==='Button'&&hasText(n,'Batal')).props.onClick();render();proofReads.shift()('cancelled');await cancelledRead;await settle();assert.equal(states[10],originalProof,'Batal must discard a pending file read');
 openProof();render();chooseProof('stale.pdf');render();const staleRead=submitProof();
 find(tree,n=>n.type==='Dialog').props.onOpenChange(false);render();openProof();render();chooseProof('latest.pdf');render();const latestRead=submitProof();
 const resolveStale=proofReads.shift(),resolveLatest=proofReads.shift();resolveLatest('latest');await latestRead;await settle();resolveStale('stale');await staleRead;await settle();assert.equal(states[10]['001'].fileBase64,'latest','Reopening the same pupil modal must invalidate its previous file read');
 states[10]=originalProof;render();
 assert.equal(saveButton().props.disabled,false);await saveButton().props.onClick();await settle();
 assert.equal(saves.length,1);assert.equal(saves[0].rows[0].status_presensi,'SAKIT');assert.equal(saves[0].rows[0].link_bukti_izin,'https://private/bukti');assert.equal(saves[0].rows[0].fileName,undefined);assert(!JSON.stringify(saves[0].rows[0]).includes('fileName'));
 states[9] = {'001':'IZIN'};
 states[10] = {'001':{fileName:'proof.pdf',fileBase64:'JVBERi0xLjQK',adaSuratDokter:true}};
 render();
 saveResponses.push({status:'success',data:{uploadedLinks:[{nis:'001',linkBukti:'https://drive.google.com/file/d/new-proof/view'}]}});
 await saveButton().props.onClick();await settle();assert.equal(saves[1].rows[0].fileBase64,'JVBERi0xLjQK');assert.equal(states[10]['001'].fileBase64,undefined);assert.equal(states[10]['001'].linkBukti,'https://drive.google.com/file/d/new-proof/view');
 find(tree,n=>n.type==='Select'&&n.props.value==='X A').props.onValueChange('X B');await settle();find(tree,n=>n.type==='Select'&&n.props.value==='X B').props.onValueChange('X A');await settle();
 await saveButton().props.onClick();assert.equal(saves[2].rows[0].status_presensi,'IZIN');assert.equal(saves[2].rows[0].fileBase64,undefined);assert.equal(saves[2].rows[0].link_bukti_izin,'https://drive.google.com/file/d/new-proof/view');await settle();
 assert(removeProof());removeProof().props.onClick();await settle();await saveButton().props.onClick();assert.equal(saves[3].rows[0].link_bukti_izin,'');await settle();find(tree,n=>n.type==='Select'&&n.props.value==='X A').props.onValueChange('X B');await settle();find(tree,n=>n.type==='Select'&&n.props.value==='X B').props.onValueChange('X A');await settle();assert.equal(removeProof(),undefined);
 dateInput().props.onChange({target:{value:'2026-10-08'}});render();assert.equal(saveButton().props.disabled,true);await settle();
 dateInput().props.onChange({target:{value:'2026-10-09'}});await settle();
 calls[1].resolve({status:'success',data:{students,logs:[{nis:'001',kelas:'X A',tanggal:'2026-10-08',status_presensi:'ALPHA'}]}});await settle();assert.equal(saveButton().props.disabled,true);
 calls[2].resolve({status:'success',data:{students,logs:[]}});await settle();await saveButton().props.onClick();assert.equal(saves[4].date,'2026-10-09');assert.equal(saves[4].rows[0].status_presensi,'HADIR');
 await settle();dateInput().props.onChange({target:{value:'2026-10-10'}});await settle();assert.equal(saveButton().props.disabled,true);assert.equal(calls.length,4);assert(!hasText(tree,'Ani'));assert(hasText(tree,'Hari Sabtu tidak dapat input absen. Pilih tanggal Senin–Jumat.'));
 dateInput().props.onChange({target:{value:'2026-10-12'}});await settle();calls[4].resolve({status:'error',message:'offline'});await settle();assert.equal(saveButton().props.disabled,true);
 dateInput().props.onChange({target:{value:'2026-10-13'}});await settle();calls[5].resolve({status:'success',data:{students,logs:[]}});await settle();
 saveResponses.push({status:'error',message:'offline'});await saveButton().props.onClick();await settle();assert.equal(saveButton().props.disabled,false);
 saveResponses.push({status:'success'});await saveButton().props.onClick();await settle();assert.equal(saves.length,7);assert.deepEqual(saves[5],saves[6]);
 // The backend committed IZIN and its proof, but the success response was lost.
 states[9] = {'001':'IZIN'};
 states[10] = {'001':{fileName:'committed.pdf',fileBase64:'committed',adaSuratDokter:false}};render();
 saveResponses.push({status:'error',message:'response lost after commit'});await saveButton().props.onClick();await settle();assert.equal(saveButton().props.disabled,false);
 find(tree,n=>n.type==='Select'&&n.props.value==='X A').props.onValueChange('X B');render();assert.equal(saveButton().props.disabled,true,'Ambiguous save requires reconciliation before another class can save');await settle();
 assert.equal(calls.length,7,'Switching class after ambiguous save must reload authoritative logs');assert.equal(calls[6].fresh,true,'Reconciliation must bypass cached Apps Script logs');
 calls[6].resolve({status:'error',message:'fresh reload offline'});await settle();assert.equal(saveButton().props.disabled,true,'Failed reconciliation must not rehydrate stale rows or enable save');assert(hasText(tree,'fresh reload offline'));
 find(tree,n=>n.type==='Select'&&n.props.value==='X B').props.onValueChange('X A');await settle();assert.equal(calls.length,8);assert.equal(calls[7].fresh,true);assert.equal(saveButton().props.disabled,true);
 calls[7].resolve({status:'success',data:{students,logs:[{nis:'001',kelas:'X A',tanggal:'2026-10-13',status_presensi:'IZIN',ada_surat_dokter:false,link_bukti_izin:'https://drive.google.com/file/d/committed/view'}]}});await settle();

 assert.equal(calls.length,8);await saveButton().props.onClick();await settle();
 assert.equal(saves[8].rows[0].status_presensi,'IZIN');assert.equal(saves[8].rows[0].link_bukti_izin,'https://drive.google.com/file/d/committed/view');assert.equal(saves[8].rows[0].fileBase64,undefined);
 console.log('Presensi: cancelled/reopened proof reads, saved status and attachments across class switches, stale requests, weekend blocking and offline retry passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
const docxCtx={exports:{},require:name=>name==='@/lib/api'?{}:name==='@/lib/date'?{}:name==='sonner'?{toast:{}}:{default:function(){}}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/docxGenerator.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,docxCtx);
assert.equal(docxCtx.exports.escapeXml(`Ani & <XI> "001" 'A'`),'Ani &amp; &lt;XI&gt; &quot;001&quot; &apos;A&apos;');
console.log('DOCX XML escapes student text');
