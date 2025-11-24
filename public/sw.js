const CACHE_NAME = "chronicles-v4";
const ASSETS_TO_CACHE = ["./", "./index.html", "./manifest.json"];

// Install Event: Cache Core Assets
self.addEventListener("install", (event) => {
  // Skip waiting to ensure the new service worker takes over immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("SW: Failed to cache core assets:", err);
      });
    }),
  );
});

// Listen for skipWaiting message (e.g., from a "New Version Available" prompt)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("SW: Clearing old cache", cache);
              return caches.delete(cache);
            }
          }),
        );
      })
      .then(() => self.clients.claim()), // Take control of clients immediately
  );
});

// Helper: Network Only
const networkOnly = (event) => {
  event.respondWith(fetch(event.request));
};

// Helper: Cache First (falling back to network)
const cacheFirst = (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache valid responses
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== "basic"
        ) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }),
  );
};

// Helper: Stale-While-Revalidate (for HTML/Navigation)
const staleWhileRevalidate = (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn("SW: Network fetch failed during SWR:", err);
        });

      return cachedResponse || fetchPromise;
    }),
  );
};

// Fetch Event Router
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignore non-http/https requests (e.g., chrome-extension://)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // 1. API Requests: Network Only
  if (
    url.pathname.includes("/api/") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("openai.com") ||
    url.hostname.includes("openrouter.ai")
  ) {
    return networkOnly(event);
  }

  // 2. Navigation (HTML): Stale-While-Revalidate
  if (event.request.mode === "navigate") {
    return staleWhileRevalidate(event);
  }

  // 3. Static Assets (JS, CSS, Images, Fonts): Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)
  ) {
    return cacheFirst(event);
  }

  // 4. Audio: Cache First
  if (url.pathname.includes("/audio/")) {
    return cacheFirst(event);
  }

  // Default: Network Only for everything else
  return networkOnly(event);
});
