const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/components/layout/AuthGuard.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
let user=null;const redirects=[];
const jsx=(type,props)=>({type,props});
const c={exports:{},require:n=>n==='@/lib/AuthContext'?{useAuth:()=>({user,isReady:true})}:n==='next/navigation'?{usePathname:()=>'/siswa',useRouter:()=>({replace:x=>redirects.push(x)})}:n==='react'?{useEffect:f=>f()}:{jsx,jsxs:jsx}};
vm.runInNewContext(code,c);const blocked=c.exports.AuthGuard({children:'private'});assert.deepEqual(redirects,['/login']);assert.notEqual(blocked.props.children,'private');user={nama:'BK'};assert.equal(c.exports.AuthGuard({children:'private'}).props.children,'private');console.log('BK pages require login after portal removal');
