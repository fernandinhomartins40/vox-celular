/* Only public offline resources: never cache API, credentials or customer pages. */
const CACHE = 'vox-offline-v3';
const PUBLIC_FILES = ['/offline.html', '/brand/icon-192.png', '/offline-catalog.js', '/offline-guides.js'];
const PUSH_DESTINATIONS = Object.freeze({
  '/pedidos': '/area-cliente/pedidos',
  '/servicos': '/area-cliente/servicos',
  '/beneficios': '/area-cliente/beneficios',
});
function pushDestination(value) {
  return Object.hasOwn(PUSH_DESTINATIONS, value) ? PUSH_DESTINATIONS[value] : '/area-cliente/avisos';
}
self.addEventListener('push', event => {
  let payload = {};
  try {
    const text = event.data?.text();
    if (text && text.length <= 4096) {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payload = parsed;
    }
  } catch { /* Malformed payloads still receive a generic, private notice. */ }
  const id = typeof payload.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(payload.id) ? payload.id : undefined;
  event.waitUntil(self.registration.showNotification('Vox Celular', {
    body: 'Você tem uma atualização. Abra sua conta para conferir.',
    icon: '/brand/icon-192.png',
    ...(id ? { tag: `vox-${id}`, renotify: false } : {}),
    data: { path: pushDestination(payload.destino) },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.path;
  const allowed = Object.values(PUSH_DESTINATIONS).includes(path) || path === '/area-cliente/avisos';
  const target = new URL(allowed ? path : '/area-cliente/avisos', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => client.url === target);
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  }));
});
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PUBLIC_FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vox-offline-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  } else if (PUBLIC_FILES.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
