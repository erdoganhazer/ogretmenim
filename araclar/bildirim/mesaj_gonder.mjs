/* ÖğretmeniM — bildirim kuyruğunu elle işleme ve deneme bildirimi (asıl iş: Firebase fonksiyonu kuyrukGonder, kayıt düşer düşmez).
   Actions › Mesaj bildirimleri › Run workflow:
     kuru = 1   → göndermez, silmez, günlüğe yazar
     deneme = kullanıcı adı ya da ad (ör. erdoganhazer, hazer) → o kişinin açık cihazlarına deneme bildirimi; kuyruğa dokunmaz
   Mantık: functions/ortak/gonderim.mjs */
import admin from "firebase-admin";
import { kuyruguIsle, kisiyeGonder } from "../../functions/ortak/gonderim.mjs";

admin.initializeApp({ projectId: process.env.PROJE || "ogretmenim-d0524" });
const o = { db: admin.firestore(), messaging: admin.messaging(), FieldPath: admin.firestore.FieldPath, kuru: process.env.KURU === "1" };
const DENEME = (process.env.DENEME || "").trim();
if (DENEME) {
  const sade = x => String(x || "").toLocaleLowerCase("tr").replace(/[çğıöşü]/g, h => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[h]);
  const herkes = (await o.db.collection("kisiler").get()).docs, a = sade(DENEME);
  const k = herkes.find(d => sade(d.data().kullanici_adi) === a) || herkes.find(d => sade(d.data().ad).split(/\s+/).includes(a)) || herkes.find(d => sade(d.data().ad).includes(a));
  if (!k) { console.log(`deneme: "${DENEME}" bulunamadı. Kullanıcı adları: ${herkes.map(d => d.data().kullanici_adi + " (" + d.data().ad + ")").join(", ")}`); process.exit(1); }
  const r = await kisiyeGonder(o, k.ref, { baslik: "🔔 ÖğretmeniM", metin: "Deneme bildirimi: bu cihaza bildirimler geliyor 👍", ac: "", etiket: "deneme-" + Date.now() }, "3600");
  console.log(`deneme: ${k.data().ad} · ${r.n}/${r.cihaz} cihaza gönderildi`);
} else {
  const r = await kuyruguIsle(o);
  console.log(`kuyrukta ${r.kayit} kayıt · ${r.gonderilen} bildirim gönderildi · ${r.atlanan} atlandı${o.kuru ? " (KURU)" : ""}`);
}
