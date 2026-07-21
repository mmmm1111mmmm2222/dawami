/*
  Dawami Service Worker
  - API routes: network only
  - Reset password page: network only
  - Navigation: cache first, fallback to offline page
  - Static files: stale while revalidate
*/

const CACHE_NAME = "dawami-shell-v3";

const SHELL_URLS = [
  "/",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API routes must always go directly to the server
  if (
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/workdays") ||
    url.pathname.startsWith("/employers") ||
    url.pathname.startsWith("/payments") ||
    url.pathname.startsWith("/account")
  ) {
    return;
  }

  // Password reset page must never use the cached home page
  if (url.pathname === "/reset.html") {
    return;
  }

  // Ignore non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Ignore requests from other websites
  if (url.origin !== self.location.origin) {
    return;
  }

  // Page navigation
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Static assets
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
          .catch(() => cached);

        return cached || networkFetch;
      })
    )
  );
});