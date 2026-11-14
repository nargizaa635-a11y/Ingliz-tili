// sw.js — oflayn ishlash uchun service worker.
// Fayllarni yangilasangiz, CACHE nomidagi raqamni oshiring (masalan v15).
// O‘rnatish ATOMIK: ro‘yxatdagi birorta fayl yuklanmasa, yangi versiya o‘rnatilmaydi va eski ishlaydigan versiya qoladi
// (yarim yuklangan kesh ilovani buzmasin uchun). Muvaffaqiyatsiz fayl nomi konsolga yoziladi.
const CACHE = "ingliz-tili-v22";
const FILES = [
  "./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./nav.js", "./ui.js", "./store.js", "./learn.js", "./engine.js", "./srs.js", "./planner.js", "./backup.js",
  "./speech.js", "./views.js", "./player.js", "./memory.js", "./coach.js", "./pomodoro.js", "./tools.js", "./curriculum.js", "./diagnostic.js",
  "./content-a1-u01.js", "./content-a1-u02-u03.js", "./content-a1-u03-u05.js", "./content-a1-u05-u06.js", "./content-a1-u06-u08.js", "./content-a1-u08-u09.js", "./content-a1-u10-u11.js", "./content-a1-u11-u12.js", "./content-a1-u12.js", "./content-a2-u01a.js", "./content-a2-u01b.js", "./content-a2-u02.js", "./content-a2-u03.js", "./content-a2-u04.js", "./content-a2-u05.js", "./content-a2-u06a.js", "./content-a2-u06b.js", "./content-a2-u07.js", "./content-a2-u08.js", "./content-a2-u09.js", "./content-a2-u10.js", "./content-b1-u01a.js", "./content-b1-u01b.js", "./content-b1-u02a.js", "./content-b1-u02b.js", "./content-b1-u03a.js", "./content-b1-u03b.js", "./content-b1-u04a.js", "./content-b1-u04b.js", "./content-b1-u05a.js", "./content-b1-u05b.js", "./content-b1-u06a.js", "./content-b1-u06b.js", "./content-b1-u07a.js", "./content-b1-u07b.js", "./content-b1-u08a.js", "./content-b1-u08b.js", "./content-b1-u09a.js", "./content-b1-u09b.js", "./content-b1-u10a.js", "./content-b1-u10b.js",
  "./final.js", "./finallogic.js", "./pronounce.js", "./recognize.js", "./lugat.js", "./lugatlogic.js", "./mywordslogic.js", "./mywords.js", "./vocabdata.js",
  "./changelog.js", "./imagelib.js", "./cards.js", "./cardslogic.js",
  "./vocab-a1.js", "./vocab-a2.js",
  "./images-1.js", "./images-2.js", "./images-3.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const failed = [];
    await Promise.all(FILES.map(async (f) => {
      try {
        const res = await fetch(new Request(f, { cache: "reload" }));
        if (!res.ok) throw new Error("HTTP " + res.status);
        await cache.put(f, res);
      } catch (err) { failed.push(f + " (" + ((err && err.message) || err) + ")"); }
    }));
    if (failed.length) {
      await caches.delete(CACHE);
      console.warn("Yangi versiya o‘rnatilmadi, eski versiya saqlanadi. Yuklanmagan fayllar:", failed.join(", "));
      try { // ochiq sahifalarga bildiramiz (ular foydalanuvchiga ko‘rsatadi); xabar yuborilmasa ham o‘rnatish baribir to‘xtaydi
        for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage({ type: "sw-install-failed", count: failed.length });
      } catch { /* xabar ixtiyoriy */ }
      throw new Error("Kesh to‘liq emas: " + failed.length + " ta fayl yuklanmadi");
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.startsWith("ingliz-tili-")).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
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
