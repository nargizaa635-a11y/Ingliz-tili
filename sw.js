// sw.js — oflayn ishlash uchun oddiy service worker.
// Fayllarni yangilasangiz, CACHE nomidagi raqamni oshiring (masalan v2).
const CACHE = "ingliz-tili-v11";
const FILES = [
  "./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./nav.js", "./ui.js", "./store.js", "./learn.js", "./engine.js", "./srs.js", "./planner.js", "./backup.js",
  "./speech.js", "./views.js", "./player.js", "./memory.js", "./coach.js", "./pomodoro.js", "./tools.js", "./curriculum.js", "./diagnostic.js", "./content-a1-u01.js", "./content-a1-u02-u03.js", "./content-a1-u03-u05.js", "./content-a1-u05-u06.js", "./content-a1-u06-u08.js", "./content-a1-u08-u09.js", "./content-a1-u10-u11.js", "./content-a1-u11-u12.js", "./content-a1-u12.js", "./final.js", "./finallogic.js", "./lugat.js", "./lugatlogic.js", "./vocabdata.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(new Request(f, { cache: "reload" })).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  // Avval keshdan beradi, fonda yangilaydi (yangi versiya keyingi ochishda ko‘rinadi).
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req.url, { cache: "no-cache" }).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || (req.mode === "navigate" ? cache.match("./index.html") : Response.error());
  }));
});
