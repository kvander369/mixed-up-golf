/* Mixed Up Golf — service worker.
 *
 * The whole point: the app must open on the 1st tee with no signal. On first
 * load this takes a copy of everything and serves from that copy thereafter,
 * so the phone never asks the network for anything.
 *
 * Bump CACHE when the app changes — the old cache is deleted on activate.
 */
const CACHE = 'mixed-up-golf-v21';

/* The app shell. index.html is one self-contained file, so this is short. */
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())          // take over without a second visit
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* "What version is actually serving me?" - the stamp on the Players screen.
   Answering out of CACHE means the number on screen cannot drift from the
   number that decides what this phone is running. */
self.addEventListener('message', e => {
  if (e.data === 'version' && e.source) e.source.postMessage({ version: CACHE });
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' ||
                 url.hostname === 'fonts.gstatic.com';

  /* Cache first, always. Offline is the normal case, not the exception.
     Anything fetched successfully gets kept — including the Google fonts, so
     after one online visit the typography survives with no signal too. */
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => {
        /* No network and nothing cached. For a page request, hand back the app
           rather than the browser's dinosaur. Fonts just fall back to the
           system stack the CSS already names. */
        if (req.mode === 'navigate') return caches.match('./index.html');
        if (isFont) return new Response('', { status: 204 });
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
