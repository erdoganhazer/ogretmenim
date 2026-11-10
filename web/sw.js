/* ÖğretmeniM — çevrimdışı çalışma (service worker)
   - Yayın sırasında (.github/workflows/yayin.yml) __SURUM__ ve __DOSYALAR__ doldurulur: her yayın yeni bir
     sürüm olur, tarayıcı bu dosyanın değiştiğini görür, yeni dosyaları indirir, eski önbelleği siler.
   - Yalnız sitenin kendi dosyaları önbelleğe alınır; Firebase istekleri hiç ellenmez (verinin çevrimdışı
     kopyasını Firestore kendisi tutar).
   - Yerelde (doldurulmamış dosya) hiçbir şey önbelleğe alınmaz; geliştirirken eski dosya görülmez. */
"use strict";
const SURUM = "__SURUM__";
const DOSYALAR = "__DOSYALAR__";
const DAMGALI = !SURUM.startsWith("__");
const ONBELLEK = "ogretmenim-" + SURUM;

self.addEventListener("install", olay => {
  self.skipWaiting();
  if (!DAMGALI) return;
  olay.waitUntil(caches.open(ONBELLEK).then(c => c.addAll(["./", ...DOSYALAR].map(d => new Request(d, { cache: "reload" })))));
});

self.addEventListener("activate", olay => {
  olay.waitUntil((async () => {
    for (const ad of await caches.keys()) if (ad.startsWith("ogretmenim-") && ad !== ONBELLEK) await caches.delete(ad);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", olay => {
  const istek = olay.request;
  if (!DAMGALI || istek.method !== "GET") return;
  const adres = new URL(istek.url);
  if (adres.origin !== location.origin) return;                       // Firebase vb. dokunma
  olay.respondWith((async () => {
    const onbellek = await caches.open(ONBELLEK);
    if (istek.mode === "navigate") {                                  // sayfa açılışı: hep uygulama kabuğu
      return (await onbellek.match("./")) || fetch(istek);
    }
    const kayitli = await onbellek.match(istek, { ignoreSearch: true });
    if (kayitli) return kayitli;
    try {
      const yanit = await fetch(istek);
      if (yanit.ok && yanit.type === "basic") onbellek.put(istek, yanit.clone());
      return yanit;
    } catch (h) {
      return new Response("", { status: 504, statusText: "Çevrimdışı" });
    }
  })());
});
