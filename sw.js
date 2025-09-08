// Basit service worker - statik varlıkları cacheler ve ağ yoksa cache'ten döner.
// NOT: Bu örnek temel bir offline deneyim sağlar. Gerçek uygulamada
// cache sürümlemeyi ve güncelleme stratejilerini ihtiyaca göre genişletin.

const CACHE_NAME = 'proclean-shell-v1';
const ASSETS_TO_CACHE = [
  '/',               // index.html (veya root)
  '/index.html',
  '/styles.css',     // varsa stil dosyalarınız
  '/main.js',        // varsa ana js
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js'
];

// Install: shell kaynaklarını cachele
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .catch(err => console.warn('Cache addAll hatası:', err))
  );
  self.skipWaiting();
});

// Activate: eski cache'leri temizle (basit versiyon)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// Fetch: ağ dene, başarısızsa cache'den dön
self.addEventListener('fetch', event => {
  // sadece GET istekleri için basit davranış
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // başarılı yanıtı cache'e koy (isteğe bağlı)
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, copy).catch(()=>{});
        });
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
  );
});
