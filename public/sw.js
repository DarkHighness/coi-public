const CACHE_NAME = "chronicles-v1";
const URLS_TO_CACHE = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.warn("Failed to cache some assets during install:", err);
      });
    }),
  );
});

self.addEventListener("fetch", (event) => {
  // Basic Cache-First Strategy for static assets, Network-First for APIs
  // We return early to let the browser handle API requests naturally (bypassing SW)
  if (
    event.request.url.includes("generativelanguage.googleapis.com") ||
    event.request.url.includes("api.openai.com") ||
    event.request.url.includes("openrouter.ai") ||
    event.request.url.includes("api")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    }),
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});
