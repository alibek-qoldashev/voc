// VOC service worker: ilova internetsiz ham ochilsin.
// - Sahifalar: avval tarmoq, bo'lmasa saqlangan index.html (SPA)
// - /assets/* (nomida hash bor): avval kesh
// - Shriftlar, ikonlar, karta rasmlari: keshdan darrov, fonda yangilanadi
// Supabase ma'lumotlari bu yerda keshlanmaydi — ularni ilovaning o'zi (IndexedDB) saqlaydi.
const CACHE = "voc-v2";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      // index.html ichidagi JS/CSS fayllarni ham oldindan saqlaymiz
      const html = await (await cache.match("/")).text();
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
      await cache.addAll(assets);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const isStaticFile = (url) =>
  url.origin === self.location.origin && /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);
const isFont = (url) => /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
const isCardImage = (url) => url.pathname.includes("/storage/v1/object/public/");

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok || res.type === "opaque") (await caches.open(CACHE)).put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  const network = fetch(request)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

async function page(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put("/", res.clone());
    return res;
  } catch {
    return (await cache.match("/")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(page(request));
  } else if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request));
  } else if (isStaticFile(url) || isFont(url) || isCardImage(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
