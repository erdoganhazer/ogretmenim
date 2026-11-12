/* firestore.rules testleri — Firestore emülatöründe çalışır:
   cd test/kurallar && npm ci && npx firebase emulators:exec --only firestore --project demo-ogretmenim --config ../../firebase.json "npm test" */
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, writeBatch, arrayUnion, query, where, deleteDoc } from "firebase/firestore";

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
test("sınav notlarını veli yazar; öğrenci kendi notlarını görür ama yazamaz; etkinlik belgesinde not tutulmaz", async () => {
  await assertSucceeds(setDoc(doc(db("u_veli"), `${A}/sinav_notlari/e1`), { id: "e1", puan: 85 }));
  await assertSucceeds(getDoc(doc(db("u_arin"), `${A}/sinav_notlari/e1`)));
  await assertSucceeds(getDocs(collection(db("u_arin"), `${A}/sinav_notlari`)));
  await assertFails(getDocs(collection(db("u_elif"), `${A}/sinav_notlari`)));                       // başka öğrenci göremez
  await assertFails(setDoc(doc(db("u_arin"), `${A}/sinav_notlari/e9`), { id: "e9", puan: 100 }));
  await assertFails(updateDoc(doc(db("u_arin"), `${A}/sinav_notlari/e1`), { puan: 100 }));
  await assertFails(setDoc(doc(db("u_veli"), `${A}/etkinlikler/e5`), { id: "e5", kaynak: "veli", tur: "sinav", puan: 70 }));
  await assertSucceeds(setDoc(doc(db("u_veli"), `${A}/etkinlikler/e5`), { id: "e5", kaynak: "veli", tur: "sinav" }));
});
test("veli ortak notları ve bildirim cihazları", async () => {
  await assertSucceeds(setDoc(doc(db("u_veli"), `${A}/veli/bilinen`), { gunler: { "2026-11-12": ["plan:2026-11-12"] } }));
  await assertSucceeds(getDoc(doc(db("u_yon"), `${A}/veli/bilinen`)));
  await assertFails(getDoc(doc(db("u_arin"), `${A}/veli/bilinen`)));
  await assertSucceeds(setDoc(doc(db("u_veli"), `kisiler/${VELI}/cihazlar/c1`), { token: "t", aktif: true }));
  await assertSucceeds(setDoc(doc(db("u_veli"), `kisiler/${VELI}/ayar/bildirim`), { saat: "20:00" }));
  await assertFails(setDoc(doc(db("u_arin"), `kisiler/${VELI}/cihazlar/c2`), { token: "t" }));
  await assertFails(setDoc(doc(db("u_veli"), `kisiler/${VELI}/baska/x`), { a: 1 }));
  await assertFails(getDoc(doc(db("u_arin"), `kisiler/${VELI}/cihazlar/c1`)));
  await assertSucceeds(getDoc(doc(db("u_yon"), `kisiler/${VELI}/cihazlar/c1`)));
});
test("yönetici öğrenciye içerik paketi atar", async () => {
  await assertSucceeds(setDoc(doc(db("u_yon"), A), { icerik: { paketler: ["yazili-5-2026-d1-y1"] } }, { merge: true }));
  await assertFails(setDoc(doc(db("u_arin"), A), { icerik: { paketler: [] } }, { merge: true }));
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
  await assertFails(getDocs(collection(db("u_veli"), "kisiler")));
  await assertSucceeds(getDoc(doc(db("u_veli"), `kisiler/${ARIN}`)));
  await assertFails(getDoc(doc(db("u_veli"), `kisiler/${ELIF}`)));
  // yönetici Elif'i veliye atayınca veli Elif'i görür
  await assertSucceeds(updateDoc(doc(db("u_yon"), `kisiler/${VELI}`), { ogrenciler: [ARIN, ELIF] }));
  await assertSucceeds(getDoc(doc(db("u_veli"), `kisiler/${ELIF}`)));
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

/* Veliler arası mesaj, kişi listesi ve bildirim kuyruğu (12.11.2026) */
async function aileKur() {
  await env.withSecurityRulesDisabled(async c => {
    const d = c.firestore();
    await updateDoc(doc(d, `kisiler/${YON}`), { aile: "aile-1" });
    await updateDoc(doc(d, `kisiler/${VELI}`), { aile: "aile-1" });
    await updateDoc(doc(d, `kisiler/${ARIN}`), { aile: "aile-1" });
    await setDoc(doc(d, "uidler/u_yabanci"), { kisi: "k_yabanci" });
    await setDoc(doc(d, "kisiler/k_yabanci"), { ad: "Başka aile", rol: "veli", aktif: true, ogrenciler: [], aile: "aile-2" });
  });
}
const KID = [YON, VELI].sort().join("_");
const konusma = (kimden) => ({ uyeler: [YON, VELI].sort(), aile: "aile-1", son: { metin: "selam", kimden, zaman: "z" }, okunan: { [kimden]: "z" } });
test("kişi listesi: veli aynı ailedeki velileri görür, öğrenciyi ve başka aileyi listeleyemez", async () => {
  await aileKur();
  const v = db("u_veli");
  await assertSucceeds(getDocs(query(collection(v, "kisiler"), where("aile", "==", "aile-1"), where("rol", "in", ["veli", "yonetici"]))));
  await assertSucceeds(getDoc(doc(v, `kisiler/${YON}`)));
  await assertFails(getDocs(query(collection(v, "kisiler"), where("aile", "==", "aile-2"), where("rol", "in", ["veli", "yonetici"]))));
  await assertFails(getDoc(doc(v, "kisiler/k_yabanci")));
  await assertFails(getDocs(query(collection(db("u_arin"), "kisiler"), where("aile", "==", "aile-1"), where("rol", "in", ["veli", "yonetici"]))));
});
test("veliler arası sohbet: yalnız iki üye okur/yazar, mesaj değişmez, başka aileyle açılamaz", async () => {
  await aileKur();
  const v = db("u_veli"), b = writeBatch(v);
  b.set(doc(v, `konusmalar/${KID}`), konusma(VELI), { merge: true });
  b.set(doc(v, `konusmalar/${KID}/mesajlar/m1`), { kimden: VELI, metin: "selam", zaman: "z" });
  await assertSucceeds(b.commit());
  await assertSucceeds(getDoc(doc(db("u_yon"), `konusmalar/${KID}/mesajlar/m1`)));
  await assertSucceeds(getDocs(query(collection(db("u_yon"), "konusmalar"), where("uyeler", "array-contains", YON))));
  await assertSucceeds(setDoc(doc(db("u_yon"), `konusmalar/${KID}`), { okunan: { [YON]: "z2" } }, { merge: true }));
  await assertFails(getDoc(doc(db("u_arin"), `konusmalar/${KID}/mesajlar/m1`)));                     // öğrenci okuyamaz
  await assertFails(getDoc(doc(db("u_yabanci"), `konusmalar/${KID}`)));
  await assertFails(updateDoc(doc(v, `konusmalar/${KID}/mesajlar/m1`), { metin: "değişti" }));
  await assertFails(deleteDoc(doc(v, `konusmalar/${KID}/mesajlar/m1`)));
  await assertFails(setDoc(doc(v, `konusmalar/${KID}/mesajlar/m2`), { kimden: YON, metin: "sahte", zaman: "z" }));   // başkası adına
  await assertFails(setDoc(doc(v, `konusmalar/${KID}`), { uyeler: [VELI, "k_yabanci"].sort() }, { merge: true }));    // üyeler değişmez
  const yab = ["k_yabanci", VELI].sort();
  await assertFails(setDoc(doc(v, `konusmalar/${yab.join("_")}`), { uyeler: yab, aile: "aile-1", son: {}, okunan: {} }));   // başka aile
  const ogr = [ARIN, VELI].sort();
  await assertFails(setDoc(doc(v, `konusmalar/${ogr.join("_")}`), { uyeler: ogr, aile: "aile-1", son: {}, okunan: {} }));   // öğrenciyle özel sohbet yok
});
test("bildirim kuyruğu: kendi adına mesaj bırakılır, duyuruyu yalnız yönetici bırakır, kimse okuyamaz", async () => {
  await aileKur();
  const kayit = (kimden, tur) => ({ kimden, kimden_ad: "x", hedef: { kisi: ARIN }, baslik: "💬 x", metin: "selam", tur, ac: "mesaj", zaman: "z" });
  await assertSucceeds(setDoc(doc(db("u_veli"), "bildirim_kuyrugu/b1"), kayit(VELI, "mesaj")));
  await assertSucceeds(setDoc(doc(db("u_arin"), "bildirim_kuyrugu/b2"), { ...kayit(ARIN, "mesaj"), hedef: { ogrenci_velileri: ARIN } }));
  await assertFails(setDoc(doc(db("u_veli"), "bildirim_kuyrugu/b3"), kayit(YON, "mesaj")));          // başkası adına
  await assertFails(setDoc(doc(db("u_veli"), "bildirim_kuyrugu/b4"), kayit(VELI, "duyuru")));        // duyuru yalnız yönetici
  await assertSucceeds(setDoc(doc(db("u_yon"), "bildirim_kuyrugu/b5"), kayit(YON, "duyuru")));
  await assertFails(setDoc(doc(db("u_veli"), "bildirim_kuyrugu/b6"), { ...kayit(VELI, "mesaj"), metin: "x".repeat(301) }));
  await assertFails(getDoc(doc(db("u_yon"), "bildirim_kuyrugu/b1")));
  await assertFails(deleteDoc(doc(db("u_veli"), "bildirim_kuyrugu/b1")));
  await assertFails(setDoc(doc(db("u_kapali"), "bildirim_kuyrugu/b7"), kayit(KAPALI, "mesaj")));     // kapalı hesap
});
test("öğrenci kendi cihazını bildirim için kaydeder", async () => {
  await assertSucceeds(setDoc(doc(db("u_arin"), `kisiler/${ARIN}/cihazlar/c1`), { token: "t", aktif: true }));
  await assertFails(setDoc(doc(db("u_arin"), `kisiler/${VELI}/cihazlar/c1`), { token: "t", aktif: true }));
});
