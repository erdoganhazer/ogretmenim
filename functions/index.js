/* ÖğretmeniM — Firebase fonksiyonları (Blaze planı gerekir).
   - kuyrukGonder: bildirim_kuyrugu'na kayıt düşünce (mesaj, duyuru, ödev bitti) hemen telefon bildirimi gönderir.
   - gunlukUyarilar: 30 dakikada bir, saati gelen velilere günün uyarılarını gönderir (Türkiye saati).
   - butceUyarisi: Google Cloud bütçe uyarısı (Pub/Sub "butce-uyari") gelince yöneticilere zil + telefon bildirimi.
   Bölge: Firestore veritabanının bölgesi (yayında .env'e FONK_BOLGE yazılır; bkz. .github/workflows/fonksiyonlar.yml).
   Maliyet sınırı: her fonksiyon en çok 2 örnek, 256 MB. */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { setGlobalOptions, logger } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { kuyrukKaydiniIsle, gunlukUyarilar as gunluk, butceUyarisi as butce } from "./ortak/gonderim.mjs";

initializeApp();
const BOLGE = process.env.FONK_BOLGE || "europe-west1";
setGlobalOptions({ region: BOLGE, maxInstances: 2, memory: "256MiB" });
const ortam = () => ({ db: getFirestore(), messaging: getMessaging(), FieldPath, kuru: false, log: (...a) => logger.info(...a) });

export const kuyrukGonder = onDocumentCreated("bildirim_kuyrugu/{id}", async olay => {
  if (!olay.data) return;
  const r = await kuyrukKaydiniIsle(ortam(), olay.data.ref, olay.data.data());
  logger.info("kuyruk", olay.params.id, r);
});

export const gunlukUyarilar = onSchedule({ schedule: "every 30 minutes", timeZone: "Europe/Istanbul" }, async () => {
  logger.info("günlük uyarılar", await gunluk(ortam()));
});

export const butceUyarisi = onMessagePublished("butce-uyari", async olay => {
  const b = olay.data.message.json || {};
  logger.info("bütçe", b, await butce(ortam(), b));
});
