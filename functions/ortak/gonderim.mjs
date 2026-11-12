/* ÖğretmeniM — bildirim gönderimi (ortak). Hem Firebase fonksiyonları (functions/index.js) hem GitHub'daki elle çalıştırılan
   betikler (araclar/bildirim/*.mjs) bunu kullanır. Paket içe aktarmaz: Firestore (db), FCM (messaging) ve FieldPath dışarıdan verilir.
     o = { db, messaging, FieldPath, kuru, log }   kuru: göndermez/silmez/yazmaz, yalnız günlüğe yazar */
import { alicilariBul } from "./alicilar.mjs";
import { uyarilariHesapla, gunEkle } from "./uyarilar.mjs";

const gec = o => o.log || console.log;

/* Bir kişinin açık cihazlarına "data" bildirimi; geçersiz cihaz kapatılır. Gönderilen sayısını döner. */
export async function kisiyeGonder(o, kisiRef, veri, ttl = "86400") {
  const cihazlar = (await kisiRef.collection("cihazlar").where("aktif", "==", true).get()).docs;
  let n = 0;
  for (const c of cihazlar) {
    try { await o.messaging.send({ token: c.data().token, data: veri, webpush: { headers: { Urgency: "high", TTL: ttl } } }); n++; }
    catch (e) {
      gec(o)("gönderilemedi", kisiRef.id, c.id, e.code);
      if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(e.code || "")) await c.ref.set({ aktif: false, hata: e.code }, { merge: true });
    }
  }
  return { n, cihaz: cihazlar.length };
}

/* Kuyruktaki tek kaydı işler: alıcıları bul (ilişki denetimiyle), telefon bildirimi gönder, kaydı sil. */
export async function kuyrukKaydiniIsle(o, ref, k) {
  const onbellek = new Map();
  const kisi = async id => {
    if (!id) return null;
    if (!onbellek.has(id)) { const s = await o.db.collection("kisiler").doc(id).get(); onbellek.set(id, s.exists ? { id, ...s.data() } : null); }
    return onbellek.get(id);
  };
  const ogrencininVelileri = async oid => (await o.db.collection("kisiler").where("ogrenciler", "array-contains", oid).get()).docs.map(d => ({ id: d.id, ...d.data() }));
  const alicilar = await alicilariBul(k, { kisi, ogrencininVelileri });
  const veri = { baslik: String(k.baslik || "ÖğretmeniM"), metin: String(k.metin || ""), ac: String(k.ac || ""), etiket: `${k.tur}-${ref.id.slice(0, 8)}` };
  let gonderilen = 0;
  for (const a of alicilar) {
    const aRef = o.db.collection("kisiler").doc(a.id);
    if (k.tur === "odev") {                                     // velinin tercihi: "Öğrenci ödev bitirince" kapalıysa gönderme
      const ay = await aRef.collection("ayar").doc("bildirim").get();
      if (ay.exists && ((ay.data().uyarilar || {}).odev_bitti === false)) continue;
    }
    if (o.kuru) { gec(o)(`${k.tur}: ${k.kimden_ad || k.kimden} → ${a.ad}:`, JSON.stringify(veri)); continue; }
    gonderilen += (await kisiyeGonder(o, aRef, veri)).n;
  }
  if (!o.kuru) await ref.delete();
  return { alici: alicilar.length, gonderilen };
}

/* Bekleyen bütün kuyruk kayıtları (elle çalıştırma ya da yedek) + 2 günden eski takılı kayıtların temizliği */
export async function kuyruguIsle(o) {
  const kuyruk = await o.db.collection("bildirim_kuyrugu").orderBy("zaman").limit(200).get();
  let gonderilen = 0, atlanan = 0;
  for (const b of kuyruk.docs) { const r = await kuyrukKaydiniIsle(o, b.ref, b.data()); gonderilen += r.gonderilen; if (!r.alici) atlanan++; }
  if (!o.kuru) {
    const sinir = new Date(Date.now() - 48 * 3600e3).toISOString();
    for (const d of (await o.db.collection("bildirim_kuyrugu").where("zaman", "<", sinir).get()).docs) await d.ref.delete();
  }
  return { kayit: kuyruk.size, gonderilen, atlanan };
}

/* Günlük veli uyarıları: her veli, her öğrencisi için günde bir kez, kendi saatinden sonra (Europe/Istanbul) */
export async function gunlukUyarilar(o, simdiUtc = new Date()) {
  const simdi = new Date(simdiUtc.getTime() + 3 * 3600e3);            // Türkiye: UTC+3, yaz saati yok
  const bugun = simdi.toISOString().slice(0, 10), dk = simdi.getUTCHours() * 60 + simdi.getUTCMinutes();
  const saatDk = s => { const [h, m] = String(s || "20:00").split(":").map(Number); return h * 60 + (m || 0); };
  const db = o.db;
  async function ogrenciVerisi(oid) {
    const kok = db.collection("ogrenciler").doc(oid);
    const [ana, odev, etk, notlar, mesaj, ders, pg, bilinen, gonderilen] = await Promise.all([
      kok.get(), kok.collection("odevler").get(), kok.collection("etkinlikler").get(), kok.collection("sinav_notlari").get(),
      kok.collection("mesajlar").get(), kok.collection("dersler").get(),
      kok.collection("plan_gun").where(o.FieldPath.documentId(), ">=", gunEkle(bugun, -60)).get(),
      kok.collection("veli").doc("bilinen").get(), kok.collection("veli").doc("gonderilen").get()]);
    const v = {
      ad: ((ana.data() || {}).profil || {}).ogrenci_adi || "Öğrenci", bugun, saat: Math.floor(dk / 60),
      odevler: odev.docs.map(d => d.data()), etkinlikler: etk.docs.map(d => d.data()), mesajlar: mesaj.docs.map(d => d.data()),
      notlar: Object.fromEntries(notlar.docs.map(d => [d.id, d.data().puan])), dersler: Object.fromEntries(ders.docs.map(d => [d.id, d.data().ad])),
      planGunler: Object.fromEntries(pg.docs.map(d => [d.id, d.data()])),
    };
    return { v, bilinen: new Set(((bilinen.data() || {}).gunler || {})[bugun] || []), gonderilen: ((gonderilen.data() || {}).gunler || {})[bugun] || {}, kok };
  }
  const isaretle = async (kok, kisi, deger) => { if (!o.kuru) await kok.collection("veli").doc("gonderilen").set({ gunler: { [bugun]: { [kisi]: deger || "ozet" } } }, { merge: true }); };
  const veliler = (await db.collection("kisiler").where("aktif", "==", true).get()).docs.filter(d => ["veli", "yonetici"].includes(d.data().rol));
  let gonderilenSayi = 0;
  for (const veli of veliler) {
    const ayarB = await veli.ref.collection("ayar").doc("bildirim").get();
    if (!ayarB.exists) continue;
    const ayar = ayarB.data(), uy = ayar.uyarilar || {};
    if (dk < saatDk(ayar.saat)) continue;
    for (const oid of veli.data().ogrenciler || []) {
      const og = await ogrenciVerisi(oid);
      if (og.gonderilen[veli.id]) continue;                         // bugün bu veliye gitti
      const { uyarilar, ozet } = uyarilariHesapla(og.v);
      const secili = uyarilar.filter(u => uy[u.tur] !== false && !og.bilinen.has(u.anahtar));
      if (!secili.length && !uy.ozet) { await isaretle(og.kok, veli.id, "sessiz"); continue; }
      const baslik = secili.length ? `${og.v.ad} · ${secili.length === 1 ? "bir şey var" : secili.length + " şey var"}` : `${og.v.ad} · gün özeti`;
      const metin = secili.length ? secili.slice(0, 4).map(u => "• " + u.metin).join("\n") + (secili.length > 4 ? `\n+${secili.length - 4} daha` : "") : ozet + " Her şey yolunda 👍";
      const veri = { baslik, metin, ogrenci: oid, anahtarlar: secili.map(u => u.anahtar).join(","), etiket: `gun-${oid}`, ac: "" };
      if (o.kuru) { gec(o)(veli.data().ad, "→", JSON.stringify(veri)); continue; }
      await veli.ref.collection("gelen").add({ kimden: "", kimden_ad: "ÖğretmeniM", baslik, metin, tur: "uyari", ac: "ozet", zaman: new Date().toISOString(), okundu: false });
      gonderilenSayi += (await kisiyeGonder(o, veli.ref, veri, "36000")).n;
      await isaretle(og.kok, veli.id, secili.map(u => u.anahtar).join(","));
    }
  }
  return { bugun, saat: `${String(Math.floor(dk / 60)).padStart(2, "0")}:${String(dk % 60).padStart(2, "0")}`, gonderilen: gonderilenSayi };
}

/* Bütçe uyarısı (Google Cloud Billing → Pub/Sub): eşik aşılınca yöneticilere zil + telefon; aynı ay aynı eşik bir kez.
   b: { budgetDisplayName, costAmount, budgetAmount, alertThresholdExceeded, currencyCode, costIntervalStart } */
export async function butceUyarisi(o, b) {
  const esik = Number(b.alertThresholdExceeded || 0);
  if (!esik) return { gonderildi: false, neden: "eşik aşılmadı" };
  const ay = String(b.costIntervalStart || new Date().toISOString()).slice(0, 7), anahtar = `${ay}-${Math.round(esik * 100)}`;
  const durumRef = o.db.collection("sistem").doc("butce");
  const durum = (await durumRef.get()).data() || {};
  if ((durum.uyarilan || []).includes(anahtar)) return { gonderildi: false, neden: "bu eşik bu ay bildirildi" };
  const para = `${Number(b.costAmount || 0).toFixed(2)} / ${Number(b.budgetAmount || 0).toFixed(2)} ${b.currencyCode || ""}`.trim();
  const baslik = esik >= 1 ? "⚠️ Firebase bütçesi aşıldı" : `⚠️ Firebase kotası dolmak üzere (%${Math.round(esik * 100)})`;
  const metin = `Bu ayki kullanım ${para}. Ücretsiz kota aşılmaya başladı; Firebase › Kullanım ve faturalandırma'dan bak.`;
  const yoneticiler = (await o.db.collection("kisiler").where("rol", "==", "yonetici").get()).docs.filter(d => d.data().aktif);
  if (o.kuru) { gec(o)(baslik, metin, yoneticiler.map(d => d.data().ad)); return { gonderildi: false, neden: "kuru" }; }
  for (const y of yoneticiler) {
    await y.ref.collection("gelen").add({ kimden: "", kimden_ad: "ÖğretmeniM", baslik, metin, tur: "uyari", ac: "", zaman: new Date().toISOString(), okundu: false });
    await kisiyeGonder(o, y.ref, { baslik, metin, ac: "", etiket: "butce-" + anahtar });
  }
  await durumRef.set({ uyarilan: [...(durum.uyarilan || []), anahtar].slice(-24), son: { ...b, zaman: new Date().toISOString() } }, { merge: true });
  return { gonderildi: true, yonetici: yoneticiler.length };
}
