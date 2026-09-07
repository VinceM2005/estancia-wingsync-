const CACHE_NAME = "wingsync-v138"; // Increment on every deployment
const urlsToCache = ["/index.html", "/app.js", "/style.css", "/manifest.json", "/wingsync-logo.png", "/logo.png", "/wingsync_cert-temp.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled( 
        urlsToCache.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`Failed to cache ${url}:`, err);
          }),
        ),
      ),
    ),

  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        );
      })
      .then(() => {
        return clients.claim();
      }),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip API calls – never cache them
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Ignore chrome-extension requests
  if (event.request.url.startsWith("chrome-extension://")) {
    return;
  }

  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  const isAppShell =
    event.request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css");

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return new Response("Offline – please check your connection.", {
              status: 503,
              statusText: "Service Unavailable",
            });
          }),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          return new Response("Offline – please check your connection.", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
    }),
  );
});
