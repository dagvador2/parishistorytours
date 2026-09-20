/* Service worker of the self-guided audioguide.
 *
 * Scope: /self-guided-tour/ (and /fr/self-guided-tour/ through the
 * Service-Worker-Allowed header). Everything outside the audioguide is left
 * untouched.
 *
 * Caches
 *  ag-shell-v1  : the page, its /_astro chunks, the basemap (PMTiles + glyphs)
 *  ag-assets-v1 : R2 objects (MP3, photos, PDF) keyed by path, query string
 *                 (signature) ignored, plus the last /api/self-guided/assets answer
 *
 * R2 objects are served cache-first and never revalidated, which is right for
 * a walking tour on hotel wifi but wrong the moment the pipeline replaces a
 * file at the same path. So the app sends the manifest's `generatedAt` with
 * every precache request, and a new value empties the asset cache first.
 *
 * Audio and PMTiles are requested with Range headers: cached full bodies are
 * sliced into 206 responses here (Safari refuses to play from a cache that
 * cannot answer ranges).
 */
const VERSION = "v1";
const SHELL = `ag-shell-${VERSION}`;
const ASSETS = `ag-assets-${VERSION}`;
const R2_HOST = /\.r2\.cloudflarestorage\.com$/;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("ag-") && k !== SHELL && k !== ASSETS).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

/** Sentinel entry holding the content version the asset cache was filled for. */
const VERSION_KEY = "https://self-guided.local/__content-version";

/**
 * Empty the asset cache when the pipeline has regenerated the product. Without
 * this, a re-trimmed MP3 or a recropped photo published at its usual path would
 * never be picked up: the entry is already there and nothing revalidates it.
 */
async function ensureContentVersion(version) {
  if (!version) return;
  const cache = await caches.open(ASSETS);
  const seen = await cache.match(VERSION_KEY);
  const previous = seen ? await seen.text() : null;
  if (previous === version) return;
  await caches.delete(ASSETS);
  const fresh = await caches.open(ASSETS);
  await fresh.put(VERSION_KEY, new Response(version, { headers: { "Cache-Control": "no-store" } }));
}

/** Stable cache key: origin + path, no query. */
function keyOf(url) {
  const u = new URL(url);
  return u.origin + u.pathname;
}

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || "");
  if (!m) return null;
  let start = m[1] === "" ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  let end = m[2] === "" || m[1] === "" ? size - 1 : Math.min(size - 1, Number(m[2]));
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return null;
  return { start, end };
}

async function rangeResponse(cached, request) {
  const buf = await cached.arrayBuffer();
  const size = buf.byteLength;
  const r = parseRange(request.headers.get("range"), size);
  if (!r) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }
  const body = buf.slice(r.start, r.end + 1);
  return new Response(body, {
    status: 206,
    headers: {
      "Content-Type": cached.headers.get("content-type") || "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "Content-Range": `bytes ${r.start}-${r.end}/${size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}

async function serveFromCacheWithRanges(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(keyOf(request.url));
  if (cached) {
    return request.headers.has("range") ? rangeResponse(cached, request) : cached.clone();
  }
  // Miss: go to the network. Full (non-range) 200 answers are kept.
  const res = await fetch(request);
  if (res.ok && res.status === 200 && !request.headers.has("range")) {
    cache.put(keyOf(request.url), res.clone()).catch(() => {});
  }
  return res;
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function networkFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(keyOf(request.url), res.clone()).catch(() => {});
    return res;
  } catch (e) {
    const cached = await cache.match(keyOf(request.url));
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (R2_HOST.test(url.hostname)) {
    event.respondWith(serveFromCacheWithRanges(ASSETS, req));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/self-guided/access") || url.pathname.startsWith("/api/self-guided/assets")) {
    event.respondWith(networkFirst(ASSETS, req));
    return;
  }
  if (url.pathname.endsWith(".pmtiles")) {
    event.respondWith(serveFromCacheWithRanges(SHELL, req));
    return;
  }
  if (req.mode === "navigate") {
    if (/^\/(fr\/)?self-guided-tour\//.test(url.pathname)) event.respondWith(networkFirst(SHELL, req));
    return;
  }
  // Hashed build assets and the basemap never change under the same URL: cache-first.
  if (url.pathname.startsWith("/_astro/") || url.pathname.startsWith("/self-guided/map/") || url.pathname.startsWith("/self-guided-tour/")) {
    event.respondWith(cacheFirst(SHELL, req));
    return;
  }
  // Any other same-origin script/style/worker/font (Vite dev modules, fonts): network-first, cache as fallback.
  if (["script", "style", "worker", "font"].includes(req.destination)) {
    event.respondWith(networkFirst(SHELL, req));
  }
});

/**
 * Precache on demand. The page sends the list of URLs (signed R2 URLs, map
 * files, PDF); each is stored under its path key once, then reported back:
 * { type: "precache-progress", done, total, audioDone, audioTotal, failed }
 */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "precache") return;
  const client = event.source;
  event.waitUntil(
    ensureContentVersion(data.version).then(() => precache(data.urls || [], client)),
  );
});

/** One download with a time limit and one retry: a stalled hotel wifi must not block the whole precache. */
async function fetchAndStore(cache, key, u, attempt = 0) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch(u, { mode: "cors", signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await cache.put(key, res);
  } catch (e) {
    if (attempt < 1) return fetchAndStore(cache, key, u, attempt + 1);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function precache(urls, client) {
  const assets = await caches.open(ASSETS);
  const shell = await caches.open(SHELL);
  const isAudio = (u) => /\.mp3(\?|$)/.test(u);
  const total = urls.length;
  const audioTotal = urls.filter(isAudio).length;
  let done = 0;
  let audioDone = 0;
  let failed = 0;
  const post = (state) => client && client.postMessage({ type: "precache-progress", state, done, total, audioDone, audioTotal, failed });
  post("preparing");
  // Small concurrency: phones on hotel wifi do not like 40 parallel downloads.
  const queue = [...urls];
  const worker = async () => {
    while (queue.length) {
      const u = queue.shift();
      const abs = new URL(u, self.location.href);
      const cache = R2_HOST.test(abs.hostname) || abs.pathname.startsWith("/api/") ? assets : shell;
      const key = keyOf(new URL(u, self.location.href).href);
      try {
        const hit = await cache.match(key);
        if (!hit) await fetchAndStore(cache, key, u);
      } catch (e) {
        failed += 1;
      }
      done += 1;
      if (isAudio(u)) audioDone += 1;
      post("preparing");
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  post(failed ? "failed" : "ready");
}
