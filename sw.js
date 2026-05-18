'use strict';

const VERSION = 'v7';
const SHELL_CACHE = `newsdash-shell-${VERSION}`;
const RUNTIME_CACHE = `newsdash-runtime-${VERSION}`;

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // App shell: network-first so updates apply immediately when online.
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
    );
    return;
  }

  // Cross-origin (RSS proxy, favicons): stale-while-revalidate.
  e.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res.ok && (res.type === 'basic' || res.type === 'cors' || res.type === 'opaque')) {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      }).catch(() => null);
      return cached || (await network) || new Response('', { status: 504 });
    })
  );
});
