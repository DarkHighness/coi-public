const CACHE_NAME = "chronicles-v5";
const ASSETS_TO_CACHE = ["./", "./index.html", "./manifest.json"];

// === 1. Install Event: Cache Core Assets ===
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

// === 2. Message Event: Handle "Skip Waiting" ===
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// === 3. Activate Event: Clean up old caches ===
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

// === Helper Strategies ===

// Helper: Network Only (Pass through SW)
// 注意：这仍然经过 SW，对于流式 API 尽量不要用这个，而是直接在 fetch 监听中 return
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
        // Only cache valid 200 responses
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

// === 4. Fetch Event Router (核心逻辑) ===
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignore non-http/https requests (e.g., chrome-extension://)
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // 遇到以下情况直接 return，不使用 event.respondWith。
  // 这让浏览器直接处理请求，解决了流式传输(Streaming)卡顿和 CORS 预检被拦截的问题。
  if (
    url.pathname.startsWith("/v1/") || // 常见的 LLM API 路径
    url.pathname.includes("/api/") || // 通用 API 路径
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("openai.com") ||
    url.hostname.includes("openrouter.ai") ||
    url.hostname.includes("pollinations.ai") // 图片生成 API
  ) {
    return;
  }

  // --- 页面导航 (HTML) ---
  if (event.request.mode === "navigate") {
    return staleWhileRevalidate(event);
  }

  // --- 静态资源 (JS, CSS, Images, Fonts) ---
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)
  ) {
    return cacheFirst(event);
  }

  // --- 音频资源 ---
  if (url.pathname.includes("/audio/")) {
    return cacheFirst(event);
  }

  // --- 兜底策略 ---
  return networkOnly(event);
});
