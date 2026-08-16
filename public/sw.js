// Arioo service worker — minimal, hand-written (no Workbox/next-pwa) so it
// stays predictable on Next.js 16 + Turbopack, which the third-party PWA
// libraries aren't guaranteed to track. Two jobs only:
//   1. Navigation requests: network-first, falling back to a cached
//      /offline.html when the network is unreachable.
//   2. Static assets (Next build output, icons, fonts): cache-first with a
//      runtime cache, populated as they're actually requested — no
//      build-hash precache list to keep in sync across deploys.
// API routes (/api/*) and Clerk auth requests are never cached — they must
// always hit the network.

const CACHE_VERSION = "v1";
const RUNTIME_CACHE = `arioo-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(RUNTIME_CACHE).then((cache) => cache.add(OFFLINE_URL)),
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
            .filter((key) => key.startsWith("arioo-runtime-") && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiOrAuthRequest(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up") ||
    url.pathname.includes("clerk")
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|svg|webp|avif|ico|woff2?|css)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiOrAuthRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return cached ?? Response.error();
        }
      }),
    );
  }
});
