const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const states = [], refs = [], effects = [];
let si = 0, ri = 0, ei = 0, jobs = [], tree;
const calls = [], saves = [], saveResponses = [];
const students = [{nis:'001',nama:'Ani',kelas:'X A'}];
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
  if(name==='@/lib/api')return {
    getSiswa:async()=>({status:'success',data:students}),
    getLogPresensi:params=>new Promise(resolve=>calls.push({params,resolve})),
    saveAttendance:async(date,rows)=>{saves.push({date,rows});return saveResponses.shift()||{status:'success'};},
  };
  if(name==='sonner')return {toast:{error(){},success(){},info(){}}};
  if(name==='@/lib/fileUpload')return {};
  return new Proxy({}, {get:(_,key)=>key});
}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/presensi/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,ctx);
function render(){si=ri=ei=0;tree=ctx.exports.default();const pending=jobs;jobs=[];pending.forEach(f=>f());}
async function settle(){for(let i=0;i<6;i++){await Promise.resolve();render();}}
function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}}
function hasText(node,text){if(node===text)return true;if(!node||typeof node!=='object')return false;return [node.props?.children].flat(Infinity).some(child=>hasText(child,text));}
const saveButton=()=>find(tree,n=>n.type==='Button'&&n.props.size==='lg');
const dateInput=()=>find(tree,n=>n.type==='input'&&n.props.type==='date');
const removeProof=()=>find(tree,n=>n.type==='button'&&n.props['aria-label']==='Hapus bukti Ani');
(async()=>{
 render();await settle();assert.equal(calls.length,1);assert.equal(saveButton().props.disabled,true);
 calls[0].resolve({status:'success',data:[{nis:'001',kelas:'X A',tanggal:'2026-10-07',status_presensi:'SAKIT',ada_surat_dokter:true,link_bukti_izin:'https://private/bukti'}]});await settle();
 assert.equal(saveButton().props.disabled,false);await saveButton().props.onClick();await settle();
 assert.equal(saves.length,1);assert.equal(saves[0].rows[0].status_presensi,'SAKIT');assert.equal(saves[0].rows[0].link_bukti_izin,'https://private/bukti');assert.equal(saves[0].rows[0].fileName,undefined);assert(!JSON.stringify(saves[0].rows[0]).includes('fileName'));
 states[8] = {'001':{fileName:'proof.pdf',fileBase64:'JVBERi0xLjQK',adaSuratDokter:true}};
 render();
 saveResponses.push({status:'success',data:{uploadedLinks:[{nis:'001',linkBukti:'https://drive.google.com/file/d/new-proof/view'}]}});
 await saveButton().props.onClick();await settle();assert.equal(saves[1].rows[0].fileBase64,'JVBERi0xLjQK');assert.equal(states[8]['001'].fileBase64,undefined);assert.equal(states[8]['001'].linkBukti,'https://drive.google.com/file/d/new-proof/view');
 await saveButton().props.onClick();assert.equal(saves[2].rows[0].fileBase64,undefined);assert.equal(saves[2].rows[0].link_bukti_izin,'https://drive.google.com/file/d/new-proof/view');
 assert(removeProof());removeProof().props.onClick();await settle();await saveButton().props.onClick();assert.equal(saves[3].rows[0].link_bukti_izin,'');
 dateInput().props.onChange({target:{value:'2026-10-08'}});render();assert.equal(saveButton().props.disabled,true);await settle();
 dateInput().props.onChange({target:{value:'2026-10-09'}});await settle();
 calls[1].resolve({status:'success',data:[{nis:'001',kelas:'X A',tanggal:'2026-10-08',status_presensi:'ALPHA'}]});await settle();assert.equal(saveButton().props.disabled,true);
 calls[2].resolve({status:'success',data:[]});await settle();await saveButton().props.onClick();assert.equal(saves[4].date,'2026-10-09');assert.equal(saves[4].rows[0].status_presensi,'HADIR');
 await settle();dateInput().props.onChange({target:{value:'2026-10-10'}});await settle();assert.equal(saveButton().props.disabled,true);assert.equal(calls.length,3);assert(!hasText(tree,'Ani'));assert(hasText(tree,'Hari Sabtu tidak dapat input absen. Pilih tanggal Senin–Jumat.'));
 dateInput().props.onChange({target:{value:'2026-10-12'}});await settle();calls[3].resolve({status:'error',message:'offline'});await settle();assert.equal(saveButton().props.disabled,true);
 dateInput().props.onChange({target:{value:'2026-10-13'}});await settle();calls[4].resolve({status:'success',data:[]});await settle();
 saveResponses.push({status:'error',message:'offline'});await saveButton().props.onClick();await settle();assert.equal(saveButton().props.disabled,false);
 saveResponses.push({status:'success'});await saveButton().props.onClick();await settle();assert.equal(saves.length,7);assert.deepEqual(saves[5],saves[6]);
 console.log('Presensi: saved status, preserved attachment, stale requests, weekend blocking, offline recovery and idempotent UI retry passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
const docxCtx={exports:{},require:name=>name==='@/lib/api'?{}:name==='@/lib/date'?{}:name==='sonner'?{toast:{}}:{default:function(){}}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/docxGenerator.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,docxCtx);
assert.equal(docxCtx.exports.escapeXml(`Ani & <XI> "001" 'A'`),'Ani &amp; &lt;XI&gt; &quot;001&quot; &apos;A&apos;');
console.log('DOCX XML escapes student text');
