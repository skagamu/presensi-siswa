const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const states = [], refs = [], effects = [];
let stateIndex = 0, refIndex = 0, effectIndex = 0, jobs = [], tree;
const reads = [], writes = [];
const student = { nis: '001', nama: 'Ani', kelas: 'X A' };
const react = {
  useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => states[i] = typeof value === 'function' ? value(states[i]) : value]; },
  useRef(initial) { return refs[refIndex++] ||= { current: initial }; },
  useEffect(fn, deps) { const i = effectIndex++, old = effects[i]; if (!old || deps.some((value, j) => value !== old.deps[j])) { old?.cleanup?.(); effects[i] = { deps }; jobs.push(() => effects[i].cleanup = fn()); } },
};
const jsx = (type, props) => ({ type, props });
const ctx = {
  exports: {}, Date, console,
  require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@/lib/date') return { todayWib: () => '2026-10-07' };
    if (name === '@/lib/reportData') return { isSchoolDayWib: () => true };
    if (name === '@/lib/api') return {
      getAttendancePageData: () => new Promise(resolve => reads.push(resolve)),
      saveAttendance: async (date, rows) => { writes.push({ date, rows }); if (writes.length === 1) throw Error('client timeout'); return { status: 'success' }; },
    };
    if (name === 'sonner') return { toast: { error() {}, success() {}, info() {} } };
    if (name === '@/lib/fileUpload') return { validateFile: () => ({ valid: true }), fileToBase64: async () => '' };
    return new Proxy({}, { get: (_, key) => key });
  },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/presensi/page.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, ctx);
function render() { stateIndex = refIndex = effectIndex = 0; tree = ctx.exports.default(); const pending = jobs; jobs = []; pending.forEach(job => job()); }
async function settle() { for (let i = 0; i < 6; i++) { await Promise.resolve(); render(); } }
function find(node, test) { if (!node || typeof node !== 'object') return; if (test(node)) return node; for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, test); if (found) return found; } }
function hasText(node, text) { if (node === text) return true; if (!node || typeof node !== 'object') return false; return [node.props?.children].flat(Infinity).some(child => hasText(child, text)); }
const saveButton = () => find(tree, node => node.type === 'Button' && node.props.size === 'lg');

(async () => {
  render(); await settle();
  reads[0]({ status: 'success', data: { students: [student], logs: [] } }); await settle();
  find(tree, node => node.type === 'button' && hasText(node, 'Sakit')).props.onClick(); render();
  await saveButton().props.onClick(); await settle();
  assert.equal(saveButton().props.disabled, false, 'same exact save can be retried');
  assert(JSON.stringify(find(tree, node => node.type === 'TableBody')).includes('Status simpan belum dipastikan'), 'roster must be hidden while the previous save outcome is uncertain');
  await saveButton().props.onClick(); await settle();
  assert.deepEqual(writes[1], writes[0], 'retry must resend the exact payload that may already have committed');
  console.log('Ambiguous attendance save freezes edits and retries the identical payload');
})().catch(error => { console.error(error); process.exitCode = 1; });
