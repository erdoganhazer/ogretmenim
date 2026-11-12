/* ÖğretmeniM — veli bildirimlerini gönderir. GitHub Actions yarım saatte bir çalıştırır (.github/workflows/bildirim.yml).
   Her veli, her öğrencisi için günde bir kez, kendi seçtiği saatten sonra bildirim alır; "Haberim var" denenler atlanır.
   Kimlik: GOOGLE_APPLICATION_CREDENTIALS (FIREBASE_SERVICE_ACCOUNT sırrı). Deneme: KURU=1 → göndermez, yazdırır. */
import admin from "firebase-admin";
import { uyarilariHesapla, gunEkle } from "./uyarilar.mjs";

admin.initializeApp({ projectId: process.env.PROJE || "ogretmenim-d0524" });
const db = admin.firestore(), KURU = process.env.KURU === "1";
const simdi = new Date(Date.now() + 3 * 3600e3);                    // Europe/Istanbul (UTC+3, yaz saati yok)
const bugun = simdi.toISOString().slice(0, 10), dk = simdi.getUTCHours() * 60 + simdi.getUTCMinutes();
const saatDk = s => { const [h, m] = String(s || "20:00").split(":").map(Number); return h * 60 + (m || 0); };

async function ogrenciVerisi(oid) {
  const kok = db.collection("ogrenciler").doc(oid);
  const [ana, odev, etk, notlar, mesaj, ders, pg, bilinen, gonderilen] = await Promise.all([
    kok.get(), kok.collection("odevler").get(), kok.collection("etkinlikler").get(), kok.collection("sinav_notlari").get(),
    kok.collection("mesajlar").get(), kok.collection("dersler").get(),
    kok.collection("plan_gun").where(admin.firestore.FieldPath.documentId(), ">=", gunEkle(bugun, -60)).get(),
    kok.collection("veli").doc("bilinen").get(), kok.collection("veli").doc("gonderilen").get()]);
  const v = {
    ad: ((ana.data() || {}).profil || {}).ogrenci_adi || "Öğrenci", bugun, saat: Math.floor(dk / 60),
    odevler: odev.docs.map(d => d.data()), etkinlikler: etk.docs.map(d => d.data()), mesajlar: mesaj.docs.map(d => d.data()),
    notlar: Object.fromEntries(notlar.docs.map(d => [d.id, d.data().puan])), dersler: Object.fromEntries(ders.docs.map(d => [d.id, d.data().ad])),
    planGunler: Object.fromEntries(pg.docs.map(d => [d.id, d.data()])),
  };
  return { v, bilinen: new Set(((bilinen.data() || {}).gunler || {})[bugun] || []), gonderilen: ((gonderilen.data() || {}).gunler || {})[bugun] || {}, kok };
}

const veliler = (await db.collection("kisiler").where("aktif", "==", true).get()).docs.filter(d => ["veli", "yonetici"].includes(d.data().rol));
let gonderilenSayi = 0;
for (const veli of veliler) {
  const ayarB = await veli.ref.collection("ayar").doc("bildirim").get();
  if (!ayarB.exists) continue;
  const ayar = ayarB.data(), uy = ayar.uyarilar || {};
  if (dk < saatDk(ayar.saat)) continue;
  const cihazlar = (await veli.ref.collection("cihazlar").where("aktif", "==", true).get()).docs;
  if (!cihazlar.length) continue;
  for (const oid of veli.data().ogrenciler || []) {
    const o = await ogrenciVerisi(oid);
    if (o.gonderilen[veli.id]) continue;                                // bugün bu veliye gitti
    const { uyarilar, ozet } = uyarilariHesapla(o.v);
    const secili = uyarilar.filter(u => uy[u.tur] !== false && !o.bilinen.has(u.anahtar));
    if (!secili.length && !uy.ozet) { await isaretle(o.kok, veli.id, "sessiz"); continue; }
    const baslik = secili.length ? `${o.v.ad} · ${secili.length === 1 ? "bir şey var" : secili.length + " şey var"}` : `${o.v.ad} · gün özeti`;
    const metin = secili.length ? secili.slice(0, 4).map(u => "• " + u.metin).join("\n") + (secili.length > 4 ? `\n+${secili.length - 4} daha` : "") : ozet + " Her şey yolunda 👍";
    const veri = { baslik, metin, ogrenci: oid, anahtarlar: secili.map(u => u.anahtar).join(","), etiket: `gun-${oid}` };
    if (KURU) { console.log(veli.data().ad, "→", JSON.stringify(veri)); continue; }
    // uygulamadaki 🔔 listesi için velinin gelen kutusuna da yaz
    await veli.ref.collection("gelen").add({ kimden: "", kimden_ad: "ÖğretmeniM", baslik, metin, tur: "uyari", ac: "ozet", zaman: new Date().toISOString(), okundu: false });
    for (const c of cihazlar) {
      try {
        await admin.messaging().send({ token: c.data().token, data: veri, webpush: { headers: { Urgency: "high", TTL: "36000" } } });
        gonderilenSayi++;
      } catch (e) {
        console.warn("gönderilemedi", c.id, e.code);
        if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(e.code || "")) await c.ref.set({ aktif: false, hata: e.code }, { merge: true });
      }
    }
    await isaretle(o.kok, veli.id, secili.map(u => u.anahtar).join(","));
  }
}
async function isaretle(kok, kisi, deger) {
  if (KURU) return;
  await kok.collection("veli").doc("gonderilen").set({ gunler: { [bugun]: { [kisi]: deger || "ozet" } } }, { merge: true });
}
console.log(`${bugun} ${String(Math.floor(dk / 60)).padStart(2, "0")}:${String(dk % 60).padStart(2, "0")} · ${gonderilenSayi} bildirim gönderildi`);
