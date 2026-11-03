// Polako service worker. The build stamps VERSION so each deploy refreshes the app shell.
const VERSION = '85bc9ce31d';
const SHELL = `polako-shell-${VERSION}`, DATA = 'polako-data', IMG = 'polako-img', FONT = 'polako-font';
const SHELL_FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('polako-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.includes('/data/')) return e.respondWith(networkFirst(req, DATA));       // news + dictionary: fresh when online
    if (req.mode === 'navigate') return e.respondWith(networkFirst(req, SHELL, 'index.html'));
    return e.respondWith(cacheFirst(req, SHELL));
  }
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return e.respondWith(cacheFirst(req, FONT));
  if (req.destination === 'image') return e.respondWith(cacheFirst(req, IMG, 150));       // news photos for offline reading
});

async function networkFirst(req, name, fallback) {
  const c = await caches.open(name);
  try {
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch {
    return (await c.match(req)) || (fallback && (await caches.match(fallback))) || Response.error();
  }
}
async function cacheFirst(req, name, max) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r.ok || r.type === 'opaque') { await c.put(req, r.clone()); if (max) trim(c, max); }
    return r;
  } catch {
    return Response.error();
  }
}
async function trim(c, max) {
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}
