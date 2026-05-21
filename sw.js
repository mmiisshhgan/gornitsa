/* ГорницаВДК · Минимальный Service Worker
   Назначение: дать сайту статус PWA, чтобы Chrome показал «Установить»
   в адресной строке. Кэширование оставлено базовым — Vercel и так быстрый. */

const CACHE_VERSION = 'gornitsa-v1';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  // Сразу активируем нового SW, не ждём старого
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Берём контроль над всеми вкладками
  event.waitUntil(
    Promise.all([
      // Удаляем старые кэши
      caches.keys().then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first: всегда пытаемся свежее, fallback на кэш если оффлайн
  const req = event.request;
  if (req.method !== 'GET') return;
  // Не кэшируем API/аналитику
  if (req.url.includes('mc.yandex.ru') ||
      req.url.includes('api.openweathermap') ||
      req.url.includes('/admin')) {
    return;
  }
  event.respondWith(
    fetch(req).then(res => {
      // Сохраняем успешные ответы в кэш на случай оффлайна
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(()=>{});
      }
      return res;
    }).catch(() => caches.match(req).then(cached => cached || caches.match(OFFLINE_URL)))
  );
});
