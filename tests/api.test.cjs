const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync('src/lib/api.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const store = { getItem: key => key === 'bk_auth_token' ? 'secret-test-session' : null, removeItem: () => {} };
const success = url => ({ ok: true, status: 200, url, redirected: true, json: async () => ({ status: 'success', data: [] }) });

(async () => {
  const missingCalls = [];
  const missing = {
    exports: {}, process: { env: {} }, URL, URLSearchParams, AbortSignal,
    window: { localStorage: store, sessionStorage: store, dispatchEvent: () => {} },
    CustomEvent: class {}, fetch: async () => { missingCalls.push(1); throw Error('unexpected fetch'); },
  };
  vm.runInNewContext(code, missing);
  await assert.rejects(missing.exports.getSiswa(), /NEXT_PUBLIC_GAS_API_URL/);
  await assert.rejects(missing.exports.saveAttendance('2026-10-07', []), /NEXT_PUBLIC_GAS_API_URL/);
  assert.equal(missingCalls.length, 0);

  const sent = [], retryDelays = [], warnings = [];
  const configured = {
    exports: {}, URL, console: { warn: (...args) => warnings.push(args), info: () => {} },
    process: { env: { NEXT_PUBLIC_GAS_API_URL: 'https://test.example/exec' } }, URLSearchParams, AbortSignal,
    setTimeout: (fn, ms) => { retryDelays.push(ms); fn(); },
    window: { localStorage: store, sessionStorage: store, dispatchEvent: () => {} }, CustomEvent: class {},
    fetch: async (url, opts) => { sent.push({ url, opts }); return success(url); },
  };
  vm.runInNewContext(code, configured);
  await configured.exports.getSiswa();
  assert.equal(new URL(sent[0].url).origin, 'https://test.example');
  assert.equal(new URL(sent[0].url).searchParams.get('token'), 'secret-test-session');
  assert.equal(sent[0].opts.cache, 'no-store');
  await configured.exports.saveAttendance('2026-10-07', []);
  assert.equal(JSON.parse(sent[1].opts.body).token, 'secret-test-session');
  await configured.exports.saveBankKasus({ date: '2026-10-07', pelanggaran: 'uji', request_id: 'stable-id', students: [] });
  assert.equal(JSON.parse(sent[2].opts.body).request_id, 'stable-id');
  await configured.exports.getAttendancePageData('X', '2026-10-08');
  const combined = new URL(sent[3].url);
  assert.equal(combined.searchParams.get('action'), 'getAttendancePageData');
  assert.equal(combined.searchParams.get('tingkat'), 'X');
  assert.equal(combined.searchParams.get('date'), '2026-10-08');
  assert.equal(combined.searchParams.has('fresh'), false);
  await configured.exports.getAttendancePageData('X', '2026-10-08', true);
  assert.equal(new URL(sent[4].url).searchParams.get('fresh'), 'true');
  const beforeCoalesced = sent.length;
  await Promise.all([configured.exports.getSiswa('XI'), configured.exports.getSiswa('XI')]);
  assert.equal(sent.length, beforeCoalesced + 1);
  await configured.exports.getSiswa('XI');
  assert.equal(sent.length, beforeCoalesced + 2);

  const healthy = configured.fetch;
  configured.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(configured.exports.getSiswa('XII'), /Failed to fetch/);
  await assert.rejects(configured.exports.saveAttendance('2026-10-07', []), /Failed to fetch/);

  let attempts = 0;
  configured.fetch = async url => {
    attempts++;
    return attempts === 1
      ? { ok: false, status: 404, url: 'https://script.googleusercontent.com/macros/echo?token=must-not-log', redirected: true, json: async () => ({}) }
      : success('https://script.googleusercontent.com/macros/echo?one-time=redacted');
  };
  await configured.exports.getSiswa('XII');
  assert.equal(attempts, 2, 'retry one transient ContentService redirect failure');
  assert.deepEqual(retryDelays, [750]);

  attempts = 0;
  configured.fetch = async url => { attempts++; return { ok: false, status: 404, url, redirected: false, json: async () => ({}) }; };
  await assert.rejects(configured.exports.getSiswa('X'), /HTTP 404 \(test.example\)/);
  assert.equal(attempts, 1, 'deployment endpoint 404 is not retried');

  attempts = 0;
  configured.fetch = async () => { attempts++; return { ok: false, status: 404, url: 'https://script.googleusercontent.com/macros/echo?token=must-not-log', redirected: true, json: async () => ({}) }; };
  await assert.rejects(configured.exports.getSiswa('XI'), /HTTP 404 \(script.googleusercontent.com\)/);
  assert.equal(attempts, 2, 'persistent one-time redirect 404 gets one bounded retry');
  assert(warnings.some(([tag, details]) => tag === '[BK_API]' && details.includes('script.googleusercontent.com')));
  assert(!JSON.stringify(warnings).includes('must-not-log'), 'diagnostics must not leak URL query or token');

  attempts = 0;
  configured.fetch = async url => { attempts++; return { ok: false, status: 403, url, redirected: false, json: async () => ({}) }; };
  await assert.rejects(configured.exports.getSiswa('XII'), /HTTP 403/);
  assert.equal(attempts, 1, 'authorization failures are not retried');

  attempts = 0;
  configured.fetch = async url => { attempts++; return { ok: false, status: 503, url, redirected: false, json: async () => ({}) }; };
  await assert.rejects(configured.exports.saveAttendance('2026-10-07', []), /HTTP 503/);
  assert.equal(attempts, 1, 'writes are never automatically retried');

  let activeToken = 'old-session', expired = 0, reply;
  configured.window.localStorage = { getItem: () => activeToken };
  configured.window.dispatchEvent = () => { expired++; };
  const unauthorized = { status: 'error', code: 'UNAUTHORIZED' };
  configured.fetch = () => new Promise(resolve => { reply = resolve; });
  for (const method of ['gasGet', 'gasPost']) {
    activeToken = 'old-session';
    const pending = configured.exports[method]('getSiswa');
    activeToken = 'new-session';
    reply({ ok: true, json: async () => unauthorized });
    await pending;
    assert.equal(expired, 0, 'old unauthorized reply must not revoke a newer login');
  }
  configured.fetch = async () => ({ ok: true, json: async () => unauthorized });
  await configured.exports.gasGet('getSiswa');
  assert.equal(expired, 1, 'current expired session must notify AuthContext');
  await configured.exports.gasPost('login');
  assert.equal(expired, 1, 'anonymous login reply must not invalidate an existing session');
  configured.fetch = healthy;
  await configured.exports.saveAttendance('2026-10-07', []);
  console.log('GAS transport distinguishes one-time redirect 404 from deployment/auth failures; writes remain single-attempt');
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
