self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Passa as requisições adiante mantendo a conexão com o Firebase ativa
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
