/* ÖğretmeniM — günlük veli uyarılarını elle çalıştırma (asıl iş: Firebase fonksiyonu gunlukUyarilar, 30 dakikada bir).
   Actions › Veli bildirimleri › Run workflow. Deneme: KURU=1 → göndermez, yazmaz, günlüğe yazar. Mantık: functions/ortak/gonderim.mjs */
import admin from "firebase-admin";
import { gunlukUyarilar } from "../../functions/ortak/gonderim.mjs";

admin.initializeApp({ projectId: process.env.PROJE || "ogretmenim-d0524" });
const r = await gunlukUyarilar({ db: admin.firestore(), messaging: admin.messaging(), FieldPath: admin.firestore.FieldPath, kuru: process.env.KURU === "1" });
console.log(`${r.bugun} ${r.saat} · ${r.gonderilen} bildirim gönderildi`);
