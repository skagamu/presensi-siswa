// Paste in DevTools Console on the localhost TEST app after login. Read-only.
(async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname) || location.port !== '3001') throw Error('Buka aplikasi uji localhost:3001');
  const token = localStorage.getItem('bk_auth_token');
  if (!token) throw Error('Login di aplikasi uji terlebih dahulu');
  const endpoint = 'https://script.google.com/macros/s/AKfycbzU3R2QgwlikQdaPbctkl5mmZWuIdHGEkBC5pI6xFMckit1YBKnjtc5gTUQgRX9Alu64Q/exec';
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const results = [];
  for (let round = 1; round <= 3; round++) {
    for (const params of [{ action: 'getSiswa', tingkat: 'X' }, { action: 'getSiswa', tingkat: 'XI' }, ...['X AK', 'XI AK', 'XI BD'].map(kelas => ({ action: 'getLogPresensi', kelas, date }))]) {
      const started = performance.now();
      try {
        const response = await fetch(endpoint + '?' + new URLSearchParams({ ...params, token }), { signal: AbortSignal.timeout(60000) });
        const body = await response.json();
        results.push({ round, action: params.action, scope: params.kelas || params.tingkat, seconds: Number(((performance.now() - started) / 1000).toFixed(2)), status: response.ok && body.status === 'success' ? 'PASS' : 'FAIL', rows: Array.isArray(body.data) ? body.data.length : 0 });
      } catch (_) { results.push({ round, action: params.action, scope: params.kelas || params.tingkat, status: 'FAIL' }); }
    }
  }
  console.table(results); // Contains counts/timings only, no tokens or pupil records.
})();
