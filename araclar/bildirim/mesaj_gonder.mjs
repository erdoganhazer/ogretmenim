/* ÖğretmeniM — mesaj ve duyuru bildirimlerini gönderir (bildirim_kuyrugu).
   Uygulama her mesajda alıcı için kuyruğa bir kayıt bırakır; yönetici "📣 Bildirim gönder" ile seçtiği kişilere "duyuru" bırakır.
   GitHub Actions 5 dakikada bir çalıştırır (.github/workflows/mesaj_bildirim.yml). Gönderilen kayıt silinir.
   Kimlik: GOOGLE_APPLICATION_CREDENTIALS (FIREBASE_SERVICE_ACCOUNT sırrı). Deneme: KURU=1 → göndermez, silmez, yazdırır.

   Güvenlik: kurallar kaydı yalnız gönderenin kendi adına açmasına izin verir; burada ayrıca alıcının gönderenle aynı ailede
   olduğu ve mesajın ilişkiye uygun olduğu denetlenir (veli → kendi öğrencisi ya da aynı ailenin velisi; öğrenci → kendi velileri). */
import admin from "firebase-admin";
import { alicilariBul } from "./alicilar.mjs";

admin.initializeApp({ projectId: process.env.PROJE || "ogretmenim-d0524" });
const db = admin.firestore(), KURU = process.env.KURU === "1";
const ESKI_SAAT = 48;                                                  // 2 günden eski, gönderilemeyen kayıt atılır

const kisiOnbellek = new Map();
async function kisi(id) {
  if (!id) return null;
  if (!kisiOnbellek.has(id)) { const s = await db.collection("kisiler").doc(id).get(); kisiOnbellek.set(id, s.exists ? { id, ...s.data() } : null); }
  return kisiOnbellek.get(id);
}
async function ogrencininVelileri(oid) {
  const s = await db.collection("kisiler").where("ogrenciler", "array-contains", oid).get();
  return s.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* Deneme bildirimi: Actions › Mesaj bildirimleri › Run workflow › "deneme" alanına kullanıcı adı (ör. hazer). Kuyruğa dokunmaz. */
const DENEME = (process.env.DENEME || "").trim().toLowerCase();
if (DENEME) {
  // kullanıcı adıyla ya da adın bir parçasıyla bulunur (ör. "hazer" → "Hazer Erdoğan")
  const sade = x => String(x || "").toLocaleLowerCase("tr").replace(/[çğıöşü]/g, h => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[h]);
  const herkes = (await db.collection("kisiler").get()).docs;
  const k = herkes.find(d => sade(d.data().kullanici_adi) === sade(DENEME)) || herkes.find(d => sade(d.data().ad).split(/\s+/).includes(sade(DENEME)))
    || herkes.find(d => sade(d.data().ad).includes(sade(DENEME)));
  if (!k) { console.log(`deneme: "${DENEME}" bulunamadı. Kullanıcı adları: ${herkes.map(d => d.data().kullanici_adi + " (" + d.data().ad + ")").join(", ")}`); process.exit(1); }
  const cihazlar = (await k.ref.collection("cihazlar").where("aktif", "==", true).get()).docs;
  console.log(`deneme: ${k.data().ad} · ${cihazlar.length} açık cihaz`);
  const veri = { baslik: "🔔 ÖğretmeniM", metin: "Deneme bildirimi: bu cihaza bildirimler geliyor 👍", ac: "", etiket: "deneme-" + Date.now() };
  let n = 0;
  for (const c of cihazlar) {
    try { await admin.messaging().send({ token: c.data().token, data: veri, webpush: { headers: { Urgency: "high", TTL: "3600" } } }); n++; console.log("  gönderildi:", c.data().ad || c.id); }
    catch (e) { console.warn("  gönderilemedi:", c.data().ad || c.id, e.code); }
  }
  console.log(`deneme bitti: ${n}/${cihazlar.length} cihaza gönderildi`);
  process.exit(0);
}

const kuyruk = await db.collection("bildirim_kuyrugu").orderBy("zaman").limit(200).get();
let gonderilen = 0, atlanan = 0;
for (const b of kuyruk.docs) {
  const k = b.data();
  const alicilar = await alicilariBul(k, { kisi, ogrencininVelileri });
  if (!alicilar.length) {
    atlanan++;
    console.log("atlandı:", b.id, k.tur, "(uygun alıcı yok)");
    if (!KURU) await b.ref.delete();
    continue;
  }
  const veri = { baslik: String(k.baslik || "ÖğretmeniM"), metin: String(k.metin || ""), ac: String(k.ac || ""), etiket: `${k.tur}-${b.id.slice(0, 8)}` };
  for (const a of alicilar) {
    if (k.tur === "odev") {                                             // velinin tercihi: "Öğrenci ödev bitirince" kapalıysa gönderme
      const ay = await db.collection("kisiler").doc(a.id).collection("ayar").doc("bildirim").get();
      if (ay.exists && ((ay.data().uyarilar || {}).odev_bitti === false)) continue;
    }
    const cihazlar = (await db.collection("kisiler").doc(a.id).collection("cihazlar").where("aktif", "==", true).get()).docs;
    if (KURU) { console.log(`${k.tur}: ${k.kimden_ad || k.kimden} → ${a.ad} (${cihazlar.length} cihaz):`, JSON.stringify(veri)); continue; }
    for (const c of cihazlar) {
      try {
        await admin.messaging().send({ token: c.data().token, data: veri, webpush: { headers: { Urgency: "high", TTL: "86400" } } });
        gonderilen++;
      } catch (e) {
        console.warn("gönderilemedi", a.id, c.id, e.code);
        if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(e.code || "")) await c.ref.set({ aktif: false, hata: e.code }, { merge: true });
      }
    }
  }
  if (!KURU) await b.ref.delete();
}
// Takılıp kalan eski kayıtlar (ör. alıcı bulunamayan) temizlenir
if (!KURU) {
  const sinir = new Date(Date.now() - ESKI_SAAT * 3600e3).toISOString();
  for (const d of (await db.collection("bildirim_kuyrugu").where("zaman", "<", sinir).get()).docs) await d.ref.delete();
}
console.log(`kuyrukta ${kuyruk.size} kayıt · ${gonderilen} bildirim gönderildi · ${atlanan} atlandı${KURU ? " (KURU: hiçbir şey gönderilmedi/silinmedi)" : ""}`);
