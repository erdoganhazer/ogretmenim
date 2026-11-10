/* ÖğretmeniM web — depo katmanı. Motor'un veri nesnesini kalıcı tutar ve app.js'deki api() çağrılarını
   sunucu yerine tarayıcıdaki motora yönlendirir.
   Şimdilik: tarayıcının kendi deposu (IndexedDB). 3. aşamada aynı arayüzle Firestore'a bağlanır. */
"use strict";

const Depo = (() => {
  const DB_AD = "ogretmenim", DEPO = "veri", ANAHTAR = "ogrenci";
  function ac() {
    return new Promise((tamam, red) => {
      const istek = indexedDB.open(DB_AD, 1);
      istek.onupgradeneeded = () => istek.result.createObjectStore(DEPO);
      istek.onsuccess = () => tamam(istek.result);
      istek.onerror = () => red(istek.error);
    });
  }
  async function oku(anahtar = ANAHTAR) {
    const db = await ac();
    return new Promise((tamam, red) => {
      const t = db.transaction(DEPO, "readonly").objectStore(DEPO).get(anahtar);
      t.onsuccess = () => tamam(t.result || null);
      t.onerror = () => red(t.error);
    });
  }
  async function yaz(veri, anahtar = ANAHTAR) {
    const db = await ac();
    return new Promise((tamam, red) => {
      const t = db.transaction(DEPO, "readwrite");
      t.objectStore(DEPO).put(veri, anahtar);
      t.oncomplete = () => tamam();
      t.onerror = () => red(t.error);
    });
  }

  let motor = null, hazir = null, yazilacak = Promise.resolve();
  async function baslat() {
    if (hazir) return hazir;
    hazir = (async () => {
      let yazili = { yazililar: [] };
      try { yazili = await (await fetch("hazirlik/yazili1.json")).json(); } catch (_) { /* hazırlık içeriği yok */ }
      motor = new Cekirdek.Motor(await oku(), { yazili, surum: typeof SURUM !== "undefined" ? SURUM : "web" });
      motor.tohumla();
      await yaz(motor.veri);
      return motor;
    })();
    return hazir;
  }
  /* oturum: giriş katmanından { veli, ad, veliKayit }. Veri değiştiren istekten sonra kalıcı yazılır. */
  let bulut = null;                                  // giriş yapılınca Bulut.Esitleyici
  function bulutaBagla(e) { bulut = e; }
  async function istek(yontem, yol, govde, oturum) {
    if (bulut) return bulut.istek(yontem, yol, govde);
    const m = await baslat();
    const sonuc = m.api(yontem, yol, govde, oturum || { veli: false });
    if (yontem !== "GET" && sonuc.durum < 400) {
      const kopya = JSON.parse(JSON.stringify(m.veri));
      yazilacak = yazilacak.then(() => yaz(kopya)).catch(e => console.error("Kayıt yazılamadı", e));
    }
    return sonuc;
  }
  return { baslat, istek, oku, yaz, bulutaBagla };
})();
if (typeof module !== "undefined") module.exports = Depo;
