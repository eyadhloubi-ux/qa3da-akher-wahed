// تخزين الملفات الثابتة لتشتغل اللعبة كتطبيق حتى لو النت ضعيف
const V = 'akw-v10';
const FILES = ['/', '/index.html', '/style.css', '/app.js', '/draw.js', '/games-ui.js', '/story.js', '/brand.js', '/sound.js', '/vendor/qrcode.js', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png',
  '/logic.js', '/demo.js', '/fonts/lalezar-ar.woff2', '/fonts/lalezar-la.woff2',
  ...[400, 500, 600, 700, 800].flatMap((w) => ['/fonts/changa-ar-' + w + '.woff2', '/fonts/changa-la-' + w + '.woff2'])];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.pathname.startsWith('/ws') || u.pathname.startsWith('/admin') || u.pathname.startsWith('/stats')) return;
  // الشبكة أولاً (لتوصل التحديثات)، والكاش احتياط
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html'))));
});
