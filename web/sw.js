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
  if (adres.pathname.endsWith("/surum.json")) return;                 // yayındaki sürüm: hep ağdan (güncellik denetimi)
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

/* Veli bildirimleri (FCM web push, yalnız "data" mesajı): araclar/bildirim/gonder.mjs gönderir.
   Bildirimdeki "Haberim var" düğmesi uygulamayı ?haberim=<anahtarlar>&ogrenci=<id> ile açar; uygulama kaydeder. */
self.addEventListener("push", olay => {
  let d = {};
  try { const j = olay.data ? olay.data.json() : {}; d = j.data || j; } catch (_) { d = { baslik: "ÖğretmeniM", metin: olay.data ? olay.data.text() : "" }; }
  const kok = self.registration.scope;
  olay.waitUntil(self.registration.showNotification(d.baslik || "ÖğretmeniM", {
    body: d.metin || "", icon: kok + "img/uygulama-192.png", badge: kok + "img/bildirim-rozet.png", tag: d.etiket || "ogretmenim",
    renotify: true, data: { ogrenci: d.ogrenci || "", anahtarlar: d.anahtarlar || "", ac: d.ac || "" },
    actions: d.anahtarlar ? [{ action: "haberim", title: "✓ Haberim var" }, { action: "ac", title: "Aç" }] : [],
  }));
});
self.addEventListener("notificationclick", olay => {
  olay.notification.close();
  const v = olay.notification.data || {}, kok = self.registration.scope;
  // Mesaj bildirimi (ac: "mesaj" ya da "konusma:<kimlik>") uygulamayı ilgili sohbetle açar
  const adres = kok + (olay.action === "haberim" ? `?haberim=${encodeURIComponent(v.anahtarlar)}&ogrenci=${encodeURIComponent(v.ogrenci)}#ozet`
    : v.ac ? `?ac=${encodeURIComponent(v.ac)}` : `?ogrenci=${encodeURIComponent(v.ogrenci || "")}#ozet`);
  olay.waitUntil((async () => {
    const pencereler = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const p of pencereler) if (p.url.startsWith(kok)) { await p.focus(); p.postMessage({ tur: "bildirim", eylem: olay.action, ...v }); return; }
    await self.clients.openWindow(adres);
  })());
});
