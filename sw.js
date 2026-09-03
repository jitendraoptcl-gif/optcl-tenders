const CACHE_NAME = 'optcl-tender-pwa-v4-live-data';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isData = url.pathname.endsWith('/data.json');
  const isAppShell = url.origin === location.origin &&
                     (url.pathname.endsWith('/index.html') || url.pathname.endsWith('/'));

  // Always try the network first for live tender data.
  if(isData){
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if(response.ok){
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first for the dashboard shell so GitHub Pages updates are picked up.
  if(isAppShell){
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if(response.ok){
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for stable assets, with network fallback.
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        if(response.ok && (url.origin === location.origin || url.hostname === 'cdnjs.cloudflare.com')){
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached)
    )
  );
});
