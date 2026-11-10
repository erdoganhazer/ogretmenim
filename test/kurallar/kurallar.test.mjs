/* firestore.rules testleri — Firestore emülatöründe çalışır:
   cd test/kurallar && npm ci && npx firebase emulators:exec --only firestore --project demo-ogretmenim --config ../../firebase.json "npm test" */
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, writeBatch, arrayUnion } from "firebase/firestore";

let env;
const YON = "k_yonetici", VELI = "k_veli", ARIN = "k_arin", ELIF = "k_elif", KAPALI = "k_kapali";
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-ogretmenim", firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8") } });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore(), s = (p, v) => setDoc(doc(db, p), v);
    for (const [uid, kisi] of [["u_yon", YON], ["u_veli", VELI], ["u_arin", ARIN], ["u_elif", ELIF], ["u_kapali", KAPALI]]) await s(`uidler/${uid}`, { kisi });
    await s(`kisiler/${YON}`, { ad: "Hazer", rol: "yonetici", aktif: true, ogrenciler: [ARIN] });
    await s(`kisiler/${VELI}`, { ad: "Anne", rol: "veli", aktif: true, ogrenciler: [ARIN] });
    await s(`kisiler/${ARIN}`, { ad: "Arın", rol: "ogrenci", aktif: true, ogrenciler: [] });
    await s(`kisiler/${ELIF}`, { ad: "Elif", rol: "ogrenci", aktif: true, ogrenciler: [] });
    await s(`kisiler/${KAPALI}`, { ad: "Eski", rol: "veli", aktif: false, ogrenciler: [ARIN] });
    await s("girisler/arin", { eposta: "arin.x@ogretmenim.example.com" });
    await s(`ogrenciler/${ARIN}`, { profil: { ogrenci_adi: "Arın" }, ayarlar: {}, tohum: {} });
    await s(`ogrenciler/${ELIF}`, { profil: { ogrenci_adi: "Elif" }, ayarlar: {}, tohum: {} });
    await s(`ogrenciler/${ARIN}/odevler/o1`, { id: "o1", kaynak: "veli", baslik: "Veli ödevi", bitti: false });
    await s(`ogrenciler/${ARIN}/odevler/o2`, { id: "o2", kaynak: "ogrenci", baslik: "Benim ödevim", bitti: false });
    await s(`ogrenciler/${ARIN}/dersler/d1`, { id: "d1", kaynak: "ogrenci", ad: "Matematik", kaynaklar: [] });
    await s(`ogrenciler/${ARIN}/etkinlikler/e1`, { id: "e1", kaynak: "veli", tur: "sinav", puan: 80 });
    await s(`ogrenciler/${ARIN}/plan/ayarlar`, { ayarlar: { arin_sira: false } });
    await s(`ogrenciler/${ARIN}/alistirmalar/2026-11-10`, { kayitlar: [{ soru: "a" }] });
    await s(`ogrenciler/${ARIN}/gunluk/2026-11-10`, { kayitlar: [{ metin: "x" }] });
  });
});
const db = uid => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const A = `ogrenciler/${ARIN}`;

test("giriş eşlemesi: ad bilinirse okunur, liste alınamaz", async () => {
  await assertSucceeds(getDoc(doc(db(null), "girisler/arin")));
  await assertFails(getDocs(collection(db(null), "girisler")));
  await assertFails(setDoc(doc(db("u_veli"), "girisler/x"), { eposta: "a" }));
  await assertSucceeds(setDoc(doc(db("u_yon"), "girisler/x"), { eposta: "a" }));
});
test("kayıtsız ya da kapalı hesap hiçbir öğrenci verisine erişemez", async () => {
  await assertFails(getDoc(doc(db("u_yabanci"), A)));
  await assertFails(getDoc(doc(db("u_kapali"), A)));
  await assertFails(getDoc(doc(db(null), A)));
});
test("veli yalnız atandığı öğrenciyi görür", async () => {
  await assertSucceeds(getDoc(doc(db("u_veli"), A)));
  await assertFails(getDoc(doc(db("u_veli"), `ogrenciler/${ELIF}`)));
  await assertFails(getDoc(doc(db("u_veli"), `ogrenciler/${ELIF}/odevler/x`)));
  await assertFails(getDoc(doc(db("u_elif"), A)));
});
test("öğrenci kendi kaydını açar; veli kaynağıyla ya da notla açamaz", async () => {
  const d = db("u_arin");
  await assertSucceeds(setDoc(doc(d, `${A}/odevler/o3`), { id: "o3", kaynak: "ogrenci", baslik: "yeni" }));
  await assertFails(setDoc(doc(d, `${A}/odevler/o4`), { id: "o4", kaynak: "veli", baslik: "sahte" }));
  await assertFails(setDoc(doc(d, `${A}/etkinlikler/e2`), { id: "e2", kaynak: "ogrenci", tur: "sinav", puan: 100 }));
  await assertSucceeds(setDoc(doc(d, `${A}/etkinlikler/e3`), { id: "e3", kaynak: "ogrenci", tur: "sinav", puan: null }));
  await assertFails(setDoc(doc(d, `${A}/mesajlar/m1`), { id: "m1", kaynak: "ogrenci", kimden: "veli", metin: "x" }));
  await assertSucceeds(setDoc(doc(d, `${A}/mesajlar/m2`), { id: "m2", kaynak: "ogrenci", kimden: "ogrenci", metin: "x" }));
});
test("velinin girdiği ödevde öğrenci yalnız 'yaptım' bilgisini değiştirir", async () => {
  const d = db("u_arin");
  await assertSucceeds(updateDoc(doc(d, `${A}/odevler/o1`), { bitti: true, bitti_zaman: "z", degisme: "z" }));
  await assertFails(updateDoc(doc(d, `${A}/odevler/o1`), { baslik: "değişti" }));
  await assertFails(updateDoc(doc(d, `${A}/odevler/o1`), { kaynak: "ogrenci" }));
  await assertSucceeds(updateDoc(doc(d, `${A}/odevler/o2`), { baslik: "kendi ödevim" }));
  await assertFails(updateDoc(doc(d, `${A}/etkinlikler/e1`), { puan: 100 }));
});
test("korumalı listeler: öğrenci ders ve kelime yazamaz (ders kaynak listesi hariç)", async () => {
  const d = db("u_arin");
  await assertFails(updateDoc(doc(d, `${A}/dersler/d1`), { ad: "Mat" }));
  await assertSucceeds(updateDoc(doc(d, `${A}/dersler/d1`), { kaynaklar: ["MEB"] }));
  await assertFails(setDoc(doc(d, `${A}/kelimeler/k1`), { id: "k1", kaynak: "ogrenci", kelime: "cat" }));
  await assertFails(setDoc(doc(d, A), { profil: { ogrenci_adi: "Kral" } }));
  await assertFails(setDoc(doc(d, `${A}/plan/ayarlar`), { ayarlar: { arin_sira: true } }));
  await assertSucceeds(setDoc(doc(db("u_veli"), `${A}/plan/ayarlar`), { ayarlar: { arin_sira: true } }));
});
test("Notlarım öğrencinindir: veli okur, yazamaz", async () => {
  await assertSucceeds(setDoc(doc(db("u_arin"), `${A}/ders_notlari/n1`), { id: "n1", kaynak: "ogrenci", baslik: "Kesirler", metin: "..." }));
  await assertSucceeds(getDoc(doc(db("u_veli"), `${A}/ders_notlari/n1`)));
  await assertFails(updateDoc(doc(db("u_veli"), `${A}/ders_notlari/n1`), { metin: "düzelttim" }));
});
test("silme yok (silindi işareti kullanılır)", async () => {
  const { deleteDoc } = await import("firebase/firestore");
  await assertFails(deleteDoc(doc(db("u_veli"), `${A}/odevler/o1`)));
  await assertFails(deleteDoc(doc(db("u_arin"), `${A}/odevler/o2`)));
});
test("plan günleri: öğrenci yazar; sırayı yalnız izin varsa değiştirir", async () => {
  const d = db("u_arin");
  await assertSucceeds(setDoc(doc(d, `${A}/plan_gun/2026-11-10`), { gun: { planlanan: 60 }, calisma: [] }));
  await assertFails(setDoc(doc(d, `${A}/plan_gun/2026-11-11`), { sira: ["o1", "o2"] }));
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), `${A}/plan/ayarlar`), { ayarlar: { arin_sira: true } }));
  await assertSucceeds(setDoc(doc(d, `${A}/plan_gun/2026-11-11`), { sira: ["o1", "o2"] }));
});
test("alıştırmalar ve günlük yalnız eklenir; günlüğü öğrenci okuyamaz", async () => {
  const d = db("u_arin"), al = doc(d, `${A}/alistirmalar/2026-11-10`);
  await assertSucceeds(setDoc(al, { kayitlar: arrayUnion({ soru: "b" }) }, { merge: true }));
  await assertFails(setDoc(al, { kayitlar: [{ soru: "silindi" }] }));
  await assertSucceeds(getDoc(al));
  await assertFails(getDoc(doc(d, `${A}/gunluk/2026-11-10`)));
  await assertSucceeds(setDoc(doc(d, `${A}/gunluk/2026-11-10`), { kayitlar: arrayUnion({ metin: "y" }) }, { merge: true }));
  await assertSucceeds(getDoc(doc(db("u_veli"), `${A}/gunluk/2026-11-10`)));
});
test("hesapları yalnız yönetici yönetir", async () => {
  await assertFails(updateDoc(doc(db("u_veli"), `kisiler/${VELI}`), { ogrenciler: [ARIN, ELIF] }));
  await assertFails(updateDoc(doc(db("u_arin"), `kisiler/${ARIN}`), { rol: "yonetici" }));
  await assertSucceeds(updateDoc(doc(db("u_yon"), `kisiler/${VELI}`), { ogrenciler: [ARIN, ELIF] }));
  await assertFails(getDocs(collection(db("u_veli"), "kisiler")));
  await assertSucceeds(getDoc(doc(db("u_veli"), `kisiler/${ARIN}`)));
  await assertFails(getDoc(doc(db("u_veli"), `kisiler/${ELIF}`)));
});
test("ilk kurulum yalnız bir kez yapılır", async () => {
  await env.withSecurityRulesDisabled(async c => { /* temiz başlangıç */ await c.firestore(); });
  const d = db("u_ilk"), b = writeBatch(d);
  b.set(doc(d, "sistem/kurulum"), { yonetici_uid: "u_ilk", yonetici_kisi: "k_ilk", zaman: "z" });
  b.set(doc(d, "uidler/u_ilk"), { kisi: "k_ilk" });
  b.set(doc(d, "kisiler/k_ilk"), { ad: "Hazer", rol: "yonetici", aktif: true, ogrenciler: [] });
  await assertSucceeds(b.commit());
  const d2 = db("u_ikinci");
  await assertFails(setDoc(doc(d2, "sistem/kurulum"), { yonetici_uid: "u_ikinci", yonetici_kisi: "k2", zaman: "z" }));
  await assertFails(setDoc(doc(d2, "uidler/u_ikinci"), { kisi: "k_ilk" }));
});
