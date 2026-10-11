// Read-only smoke test against the explicitly supplied TEST deployment.
const { performance } = require('node:perf_hooks');
const endpoint = 'https://script.google.com/macros/s/AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q/exec';
(async () => {
  const started = performance.now();
  const res = await fetch(endpoint + '?action=getSiswa', { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw Error('HTTP ' + res.status);
  const body = await res.json();
  if (body.status !== 'error' || body.code !== 'UNAUTHORIZED') throw Error('Endpoint admin tidak menolak akses tanpa sesi');
  console.log(JSON.stringify({ check: 'admin rejects anonymous access', status: 'PASS', elapsedMs: Math.round(performance.now() - started) }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
