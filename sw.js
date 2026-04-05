// Cefe App — Service Worker
// Cache-first para assets estáticos, network-first para Firebase

const CACHE_NAME = 'cefe-v2-2';
const ASSETS = [
  '/cefe-app/cefe-lactancia.html',
  '/cefe-app/manifest.json',
  '/cefe-app/icon-192.png',
  '/cefe-app/icon-512.png',
  '/cefe-app/apple-touch-icon.png',
];

// ── Install: pre-cachear assets de la app ────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting(); // activar inmediatamente
    })
  );
});

// ── Activate: limpiar caches viejos ──────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: estrategia por tipo de request ────────────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Firebase, Google APIs → siempre network (no cachear)
  if (url.includes('firebase') || 
      url.includes('googleapis') || 
      url.includes('gstatic') ||
      url.includes('firebaseio')) {
    return; // deja pasar sin interceptar
  }

  // Assets de la app → cache-first con fallback a network
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Solo cachear respuestas válidas de nuestro scope
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, toCache);
        });
        return response;
      });
    }).catch(function() {
      // Offline fallback: servir la app desde cache
      if (event.request.destination === 'document') {
        return caches.match('/cefe-app/cefe-lactancia.html');
      }
    })
  );
});
