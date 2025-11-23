const CACHE_NAME = "chronicles-v3";
const URLS_TO_CACHE = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  // Force this new service worker to become the active one, bypassing the waiting state
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.warn("Failed to cache some assets during install:", err);
      });
    }),
  );
});

self.addEventListener("fetch", (event) => {
  // 1. API Requests: Network Only (bypass SW)
  if (
    event.request.url.includes("generativelanguage.googleapis.com") ||
    event.request.url.includes("api.openai.com") ||
    event.request.url.includes("openrouter.ai") ||
    event.request.url.includes("api")
  ) {
    return;
  }

  // 2. Navigation Requests (HTML): Network First, Fallback to Cache
  // This ensures the user gets the latest index.html (with new JS hashes) if online.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(event.request);
        }),
    );
    return;
  }

  // 3. Audio files: Cache First (Runtime Caching)
  if (event.request.url.includes("/audio/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((networkResponse) => {
            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              networkResponse.type !== "basic"
            ) {
              return networkResponse;
            }
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }),
    );
    return;
  }

  // 4. Static Assets (JS, CSS, Images): Cache First, but with strict validation
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      // Do not attempt to cache non-http/https requests (e.g. chrome-extension://)
      if (!event.request.url.startsWith("http")) {
        return fetch(event.request);
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Check if valid response
          // Allow basic (same-origin) and cors (for pollinations.ai)
          const isValidType =
            networkResponse.type === "basic" ||
            (networkResponse.type === "cors" &&
              event.request.url.includes("pollinations.ai"));

          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            !isValidType
          ) {
            return networkResponse;
          }

          // Strict MIME type check for JS/CSS to avoid caching HTML error pages as scripts
          // This fixes the "MIME type" error when a JS file is missing and server returns 404 HTML
          const contentType = networkResponse.headers.get("content-type");
          const url = event.request.url;
          if (
            (url.endsWith(".js") &&
              contentType &&
              !contentType.includes("javascript")) ||
            (url.endsWith(".css") &&
              contentType &&
              !contentType.includes("css"))
          ) {
            return networkResponse; // Do not cache
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch((err) => {
          // Network failure (e.g. blocked by adblocker, offline)
          // Just return the error, don't crash the SW
          console.warn("Fetch failed for:", event.request.url, err);
          throw err;
        });
    }),
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          }),
        );
      }),
    ]),
  );
});
