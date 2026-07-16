const CACHE_NAME = "wingsync-v2";
const urlsToCache = ["/index.html", "/app.js", "/style.css", "/manifest.json"];

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
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // For non-GET requests, fall through to network
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((cachedResponse) => {
        // Return cached response if found, otherwise fetch from network
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((networkResponse) => {
            // Optionally cache the new response for future use
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return networkResponse;
          })
          .catch((fetchError) => {
            console.warn(
              "Fetch failed, returning offline fallback:",
              fetchError,
            );
            // Return a fallback (e.g., offline page) if needed
            return new Response("Offline – please check your connection.", {
              status: 503,
              statusText: "Service Unavailable",
            });
          });
      })
      .catch((cacheError) => {
        console.warn("Cache match failed, trying network:", cacheError);
        return fetch(event.request).catch((e) => {
          console.error("Both cache and network failed:", e);
          return new Response("Network error", { status: 500 });
        });
      }),
  );
});
