/* ═══════════════════════════════════════════
   داوامي — Service Worker
   Strategy:
     • App shell (HTML / static assets) → Cache-first, update in background
     • API calls (/auth/* /workdays/*) → Network-only (never cache auth data)
     • Navigation when offline → serve /offline.html
═══════════════════════════════════════════ */

const CACHE_NAME = 'dawami-shell-v2';

const SHELL_URLS = [
  '/',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
];

// ── Install: pre-cache the shell ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API routes → always go to network, never intercept
  if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/workdays')) {
    return; // let the browser handle normally
  }

  // 2. Non-GET requests → pass through
  if (request.method !== 'GET') return;

  // 3. Cross-origin requests → pass through
  if (url.origin !== self.location.origin) return;

  // 4. Navigation requests → cache-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cached) => {
        if (cached) return cached;
        return fetch(request).catch(() => caches.match('/offline.html'));
      })
    );
    return;
  }

  // 5. Static assets → stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached); // offline fallback to whatever is cached

        return cached || networkFetch;
      })
    )
  );
});
