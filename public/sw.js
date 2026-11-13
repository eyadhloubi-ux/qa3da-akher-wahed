// تخزين الملفات الثابتة لتشتغل اللعبة كتطبيق حتى لو النت ضعيف
const V = 'akw-v3';
const FILES = ['/', '/index.html', '/style.css', '/app.js', '/draw.js', '/games-ui.js', '/story.js', '/sound.js', '/vendor/qrcode.js', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png',
  '/fonts/lalezar-ar.woff2', '/fonts/lalezar-la.woff2',
  '/fonts/plex-ar-400.woff2', '/fonts/plex-ar-600.woff2', '/fonts/plex-ar-700.woff2',
  '/fonts/plex-la-400.woff2', '/fonts/plex-la-600.woff2', '/fonts/plex-la-700.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/ws') || u.pathname.startsWith('/admin') || u.pathname.startsWith('/stats')) return;
  // الشبكة أولاً (لتوصل التحديثات)، والكاش احتياط
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html'))));
});
