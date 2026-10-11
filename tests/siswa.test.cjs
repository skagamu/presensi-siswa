const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const states=[],refs=[],effects=[];let si=0,ri=0,ei=0,jobs=[],tree,summaries=0;
const details=[],summary=[{nis:'001',nama:'Ani',kelas:'X A',tingkat:'X',totalAlpha:3,totalSakit:2,totalIzin:1,totalPelanggaran:4}];
const jsx=(type,props)=>({type,props});
const ctx={exports:{},console,require(name){
 if(name==='react')return {
  useState(v){const i=si++;if(!(i in states))states[i]=typeof v==='function'?v():v;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},
  useRef(v){return refs[ri++]||=( {current:v});},useMemo(fn){return fn();},
  useEffect(fn,deps){const i=ei++;if(!effects[i]){effects[i]={deps};jobs.push(()=>effects[i].cleanup=fn());}},
 };
 if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
 if(name==='@/lib/api')return {getStudentSummary:async()=>{summaries++;return {status:'success',data:{students:summary}};},getStudentDetail:nis=>new Promise(resolve=>details.push({nis,resolve}))};
 if(name==='sonner')return {toast:{error(){}}};
 return new Proxy({}, {get:(_,k)=>k});
}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/siswa/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,ctx);
function render(){si=ri=ei=0;tree=ctx.exports.default();const pending=jobs;jobs=[];pending.forEach(f=>f());}
async function settle(){for(let i=0;i<5;i++){await Promise.resolve();render();}}
function find(node,p){if(!node||typeof node!=='object')return;if(p(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,p);if(found)return found;}}
const detailButton=()=>find(tree,n=>n.type==='Button'&&n.props.children?.includes?.('Detail'));
const mobileDetailButton=()=>find(tree,n=>n.type==='Button'&&n.props['aria-label']==='Lihat detail Ani');
const refresh=()=>find(tree,n=>n.type==='Button'&&n.props.children?.includes?.('Segarkan Data'));
const modal=()=>find(tree,n=>n.type==='SiswaDetailModal');
const loadingDialog=()=>find(tree,n=>n.type==='Dialog');
const payload={status:'success',data:{students:summary,logs:[{nis:'001',tanggal:'2026-10-07',status_presensi:'SAKIT',ada_surat_dokter:true,link_bukti_izin:'proof'}],kasus:[],penyelesaian:[]}};
(async()=>{
 render();await settle();assert.equal(summaries,1);assert.equal(details.length,0);assert.equal(modal().props.isOpen,false);
 const mobileButton=mobileDetailButton();assert(mobileButton);assert.equal(mobileButton.props.disabled,false);const click=mobileButton.props.onClick;const first=click();await settle();assert.equal(details.length,1);assert.equal(details[0].nis,'001');assert.equal(mobileDetailButton().props.disabled,true);await click();assert.equal(details.length,1);
 assert.equal(loadingDialog().props.open,true);
 const overlay=find(tree,n=>n.type==='DialogContent');assert.equal(overlay.props['aria-busy'],true);
 let blocked=0;overlay.props.onEscapeKeyDown({preventDefault(){blocked++;}});overlay.props.onInteractOutside({preventDefault(){blocked++;}});assert.equal(blocked,2);
 await refresh().props.onClick();await settle();details[0].resolve(payload);await first;await settle();assert.equal(modal().props.isOpen,false,'stale detail after refresh must not open modal');
 const second=detailButton().props.onClick({stopPropagation(){}});await settle();details[1].resolve(payload);await second;await settle();assert.equal(modal().props.isOpen,true);assert.equal(modal().props.siswa.totalAlpha,3);assert.equal(modal().props.siswa.totalPelanggaran,4);assert.equal(modal().props.siswa.logs[0].linkBukti,'proof');
 assert.equal(loadingDialog().props.open,false);
 const failed=detailButton().props.onClick({stopPropagation(){}});await settle();assert.equal(loadingDialog().props.open,true);details[2].resolve({status:'error',message:'offline'});await failed;await settle();assert.equal(loadingDialog().props.open,false);
 console.log('Siswa: compact initial summary, lazy scoped detail, loading guard, preserved counts and stale request passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
