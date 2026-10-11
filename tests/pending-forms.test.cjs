const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness(page, api, fileUpload = {}) {
  const states=[], refs=[], effects=[]; let si=0,ri=0,ei=0,jobs=[],tree;
  const react={
    useState(initial){const i=si++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},
    useRef(initial){return refs[ri++] ||= {current:initial};},
    useMemo(fn){return fn();},
    useEffect(fn,deps){const i=ei++,old=effects[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){old?.cleanup?.();effects[i]={deps};jobs.push(()=>effects[i].cleanup=fn());}},
  };
  const jsx=(type,props)=>({type,props});
  const ctx={exports:{},console,crypto:require('node:crypto'),require(name){
    if(name==='react')return react;
    if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
    if(name==='@/lib/api')return api;
    if(name==='@/lib/date')return {todayWib:()=> '2026-10-07'};
    if(name==='@/lib/fileUpload')return fileUpload;
    if(name==='sonner')return {toast:{error(){},success(){}}};
    return new Proxy({},{get:(_,key)=>key});
  }};
  const root=process.env.PAGE_SOURCE_ROOT||'.';
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${root}/src/app/${page}/page.tsx`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,ctx);
  function render(){si=ri=ei=0;tree=ctx.exports.default();const pending=jobs;jobs=[];pending.forEach(f=>f());}
  async function settle(){for(let i=0;i<6;i++){await Promise.resolve();render();}}
  function collect(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(child=>collect(child))];}
  return {render,settle,nodes:()=>collect(tree),states};
}
(async()=>{
  if (!process.env.FORM_TEST) {
  let releaseSave;const saves=[];
  const h=harness('bank-kasus',{getSiswa:async()=>({status:'success',data:[{nis:'001',nama:'Ani',kelas:'X A'}]}),saveBankKasus:payload=>{saves.push(payload);return new Promise(resolve=>releaseSave=resolve);}});
  h.render();await h.settle();
  h.nodes().find(n=>n.type==='Input'&&n.props.placeholder?.startsWith('Contoh')).props.onChange({target:{value:'Terlambat'}});
  h.nodes().find(n=>n.type==='Checkbox').props.onCheckedChange(true);h.render();
  const save=h.nodes().find(n=>n.type==='Button'&&n.props.children==='Simpan Pelanggaran (1)');const pending=save.props.onClick();h.render();
  const controls=h.nodes().filter(n=>['Input','Checkbox','Select','button','Button'].includes(n.type));
  assert(controls.every(n=>n.props.disabled===true),'Every draft control must be disabled during save');
  const before=JSON.stringify(h.states);
  for(const node of controls){if(node.type==='Input')node.props.onChange({target:{value:'new draft'}});if(node.type==='Select')node.props.onValueChange('XI');if(node.type==='Checkbox')node.props.onCheckedChange(false);if(node.type==='button')node.props.onClick?.();}
  assert.equal(JSON.stringify(h.states),before,'Pending draft handlers must ignore edits');
  releaseSave({status:'success'});await pending;await h.settle();assert.equal(saves.length,1);assert.equal(h.states[6],'');
  console.log('Bank Kasus pending save blocks all draft edits and clears only completed draft');
  }

  if (!process.env.FORM_TEST || process.env.FORM_TEST === 'priority') {
    const alert=(id,nis,level,time,count)=>({id_peringatan:id,nis,nama:nis,kelas:'X A',tingkat_kumulatif:level,waktu_dibuat:time,total_hari_absen:count});
    const records=[
      alert('a-old','001',4,'2026-10-01 08:00:00',99),
      alert('a-low','001',1,'2026-10-10 08:00:00',100),
      alert('a-new','001',4,'2026-10-02 08:00:00',10),
      alert('a-best-z','001',4,'2026-10-02 08:00:00',20),
      alert('a-best','001',4,'2026-10-02 08:00:00',20),
      alert('b','002',3,'2026-10-01 08:00:00',15),
      alert('c','003',2,'2026-10-01 08:00:00',10),
      alert('d','004',1,'2026-10-01 08:00:00',5),
    ];
    const h=harness('',{getDashboardStats:async()=>({status:'success'}),getBankKasus:async()=>({status:'success',data:[]}),getPeringatanKasus:async()=>({status:'success',data:records})});
    h.render();await h.settle();
    assert.deepEqual(h.nodes().filter(n=>n.type==='Input'&&n.props.type==='file').map(n=>n.props.id),['file-a-best','file-b','file-c'],'Top 3 must select highest-level alert per pupil, then latest timestamp, count and ID');
    assert.equal(h.states[1].length,records.length,'Dashboard retains complete active alerts for next selection after resolving');
    console.log('Dashboard Top 3 keeps one highest-priority alert per pupil with deterministic ties');
  }

  for (const page of process.env.FORM_TEST === 'priority' ? [] : process.env.FORM_TEST === 'dashboard' ? [''] : ['semua-alert', '']) {
  const dashboardApi = {getDashboardStats:async()=>({status:'success'}),getBankKasus:async()=>({status:'success',data:[]})};
  let releaseRead;let reads=0,resolves=0;let failRead=false;
  const a=harness(page,{...dashboardApi,getPeringatanKasus:async()=>({status:'success',data:[{id_peringatan:'p1',nis:'001',nama:'Ani',kelas:'X A',tingkat_kumulatif:1}]}),resolveCase:async()=>{resolves++;return {status:'success'};}},{validateFile:()=>({valid:true}),fileToBase64:()=>{reads++;return new Promise((resolve,reject)=>releaseRead=failRead?()=>reject(new Error('read failed')):()=>resolve('proof'));}});
  a.render();await a.settle();
  const event={preventDefault(){},currentTarget:{querySelector:selector=>selector==='textarea'?{value:'done'}:{files:[{name:'proof.pdf'}]}}};
  let submit=a.nodes().find(n=>n.type==='form').props.onSubmit;
  const first=submit(event);const duplicate=submit(event);assert.equal(reads,1,'Duplicate submit during file read must be ignored');a.render();assert(a.nodes().filter(n=>n.type==='Button'&&n.props.type==='submit').every(n=>n.props.disabled));releaseRead();await Promise.all([first,duplicate]);assert.equal(resolves,1);
  // A failed read must release the guard for a retry.
  const b=harness(page,{...dashboardApi,getPeringatanKasus:async()=>({status:'success',data:[{id_peringatan:'p2',nis:'002',nama:'Budi',kelas:'X B',tingkat_kumulatif:1}]}),resolveCase:async()=>{resolves++;return {status:'success'};}},{validateFile:()=>({valid:true}),fileToBase64:async()=>{if(failRead)throw Error('read failed');return 'proof';}});
  b.render();await b.settle();failRead=true;await b.nodes().find(n=>n.type==='form').props.onSubmit(event);await b.settle();failRead=false;await b.nodes().find(n=>n.type==='form').props.onSubmit(event);assert.equal(resolves,2);
  console.log(`${page || 'dashboard'} duplicate file-read submission blocked; read failure allows retry`);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
