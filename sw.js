/* ГорницаВДК · Service Worker
   Назначение: PWA-статус (чтобы Chrome дал «Установить») + лёгкий network-first кэш.
   v2: полностью пропускаем админку (никогда не перехватываем) + чиним offline-fallback
       на главную, который ломал редкие переходы. */

const CACHE_VERSION = 'gornitsa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;

  // Полный bypass для админки, API, аналитики и не-HTTP схем.
  // SW НЕ должен трогать /gornitsa-admin.html никогда — это отдельное приложение,
  // оно использует своё кэширование через no-store и должно всегда быть свежим.
  if (url.includes('/gornitsa-admin.html') ||
      url.includes('mc.yandex.ru') ||
      url.includes('api.openweathermap') ||
      url.includes('/admin') ||
      !url.startsWith('http')) {
    return; // браузер обработает запрос напрямую, без SW
  }

  event.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(()=>{});
      }
      return res;
    }).catch(() => caches.match(req).then(cached => cached || null))
  );
});
