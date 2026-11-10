/* ÖğretmeniM — istek güvenliği ve kullanıcı hareketi (0.13)
   - Motor veri değiştiren istekleri yalnız "X-OgretmeniM" başlığıyla kabul eder (başka sitelerin
     tarayıcı üzerinden komut göndermesini önler). Bu dosya bütün fetch çağrılarına başlığı ekler.
   - Veli modu yalnız gerçek hareketle (dokunma, tıklama, tuş) açık kalır. Motora her istekte son
     hareketten beri geçen süre bildirilir; arka plandaki yoklamalar veli oturumunu uzatmaz. */
"use strict";

let sonEtkinlik = Date.now();
(() => {
  const asil = window.fetch.bind(window);
  window.fetch = (adres, secenek = {}) => {
    const basliklar = new Headers(secenek.headers || {});
    basliklar.set("X-OgretmeniM", "1");
    if (basliklar.has("X-Veli-Anahtar")) basliklar.set("X-Veli-Bosta", String(Math.max(0, Math.round((Date.now() - sonEtkinlik) / 1000))));
    return asil(adres, { ...secenek, headers: basliklar });
  };
  let sonBildirim = 0;
  const hareket = () => {
    sonEtkinlik = Date.now();
    // Veli modu açıkken hareket varsa motordaki oturum süresini de uzat (dakikada en çok bir kez)
    if (typeof veli !== "undefined" && veli.anahtar && Date.now() - sonBildirim > 60000 && typeof veliAktif === "function" && veliAktif()) {
      sonBildirim = Date.now();
      fetch("/api/veli/durum", { headers: { "X-Veli-Anahtar": veli.anahtar } }).catch(() => {});
    }
  };
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach(t => addEventListener(t, hareket, { capture: true, passive: true }));
})();
