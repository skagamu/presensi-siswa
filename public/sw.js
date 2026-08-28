const CACHE_NAME = 'bk-presensi-v2';

// Tambahkan path dasar GitHub Pages ke aset-aset statis
const urlsToCache = [
  '/presensi-siswa/',
  '/presensi-siswa/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya intercept request GET, biarkan request POST (Simpan Data) lolos
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate' || event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Kembalikan dari cache jika ada, jika tidak lakukan fetch jaringan
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            // Jangan cache API response Google Sheets agar selalu real-time
            if (!event.request.url.includes('script.google.com')) {
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
